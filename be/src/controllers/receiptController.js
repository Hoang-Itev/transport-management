const Receipt = require('../models/receiptModel');
const db = require('../config/database');
const puppeteer = require('puppeteer'); 
const { sendReceiptEmail } = require('../services/emailService');
const { sendTelegramMessage } = require('../services/telegramService');
const { scanBillWithGemini } = require('../services/aiCopilotService');

const getReceipts = async (req, res) => {
  try {
    const result = await Receipt.findAll(req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

const getReceiptById = async (req, res) => {
  try {
    const receipt = await Receipt.findById(req.params.id);
    if (!receipt) return res.status(404).json({ success: false, error: { code: 'PHIEU_THU_NOT_FOUND', message: 'Không tìm thấy phiếu thu' } });
    res.json({ success: true, data: receipt });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// [POST] Tạo phiếu thu (và tự động gửi Email)
const createReceipt = async (req, res) => {
  try {
    // 🚀 FIX LỖI: Lấy cả tongSoTien (FE gửi) và soTienNhanDuoc, thằng nào có data thì dùng thằng đó
    const { khachHangId, tongSoTien, soTienNhanDuoc, ngayThu, hinhThuc, soThamChieu, hinhAnhBill, ghiChu, phanBo } = req.body;
    
    // Gộp chung lại thành 1 biến số tiền thực tế
    const tienThucTe = Number(tongSoTien || soTienNhanDuoc || 0);

    const vanDonIds = phanBo.map(p => p.vanDonId);
    const uniqueIds = new Set(vanDonIds);
    if (uniqueIds.size !== vanDonIds.length) {
      return res.status(422).json({ success: false, error: { code: 'PHAN_BO_TRUNG_VAN_DON', message: 'Danh sách phân bổ có vận đơn bị trùng' } });
    }

    const tongPhanBo = phanBo.reduce((sum, p) => sum + Number(p.soTienPhanBo), 0);
    if (Math.abs(tongPhanBo - tienThucTe) > 0.01) {
      return res.status(422).json({ success: false, error: { code: 'TONG_PHAN_BO_KHONG_KHOP', message: `Tổng phân bổ (${tongPhanBo.toLocaleString('vi-VN')}) không bằng tổng phiếu thu (${tienThucTe.toLocaleString('vi-VN')})` } });
    }

    const placeholders = vanDonIds.map(() => '?').join(',');
    const [vanDons] = await db.query(
      `SELECT vd.ma_van_don, vd.trang_thai_thanh_toan, bg.khach_hang_id
       FROM van_dons vd
       JOIN bookings bk ON vd.booking_id = bk.id
       JOIN bao_gias bg ON bk.bao_gia_id = bg.id
       WHERE vd.ma_van_don IN (${placeholders})`,
      vanDonIds
    );

    for (const vd of vanDons) {
      if (Number(vd.khach_hang_id) !== Number(khachHangId)) {
        return res.status(422).json({ success: false, error: { code: 'VANDON_KHONG_THUOC_KHACH_HANG', message: `Vận đơn ${vd.ma_van_don} không thuộc khách hàng này` } });
      }
      if (vd.trang_thai_thanh_toan === 'PAID') {
        return res.status(422).json({ success: false, error: { code: 'VANDON_DA_PAID', message: `Vận đơn ${vd.ma_van_don} đã thanh toán đủ` } });
      }
    }

    if (vanDons.length !== vanDonIds.length) {
      return res.status(404).json({ success: false, error: { code: 'VANDON_NOT_FOUND', message: 'Một hoặc nhiều vận đơn không tồn tại' } });
    }

    const phieuThuId = await Receipt.create({
      khachHangId, 
      tongSoTien: tienThucTe, // 🚀 TRUYỀN ĐÚNG SỐ TIỀN VÀO MODEL
      ngayThu, hinhThuc,
      soThamChieu, hinhAnhBill, ghiChu, phanBo,
      nguoiGhiNhanId: req.user.id
    });

    const soTienFormat = tienThucTe.toLocaleString('vi-VN');
    const msg = `
💰 <b>TIỀN VỀ TÀI KHOẢN!</b>
-----------------------------------
Số phiếu: <b>PT-${phieuThuId}</b>
Khách hàng ID: <b>${khachHangId}</b>
Số tiền thu: <b>${soTienFormat} VNĐ</b>
Hình thức: ${hinhThuc === 'CHUYEN_KHOAN' ? '🏦 Chuyển khoản' : '💵 Tiền mặt'}
Kế toán vừa ghi nhận hệ thống!
    `;
    
    // Gửi Telegram ngầm, nếu lỗi cũng không làm sập ứng dụng
    if (typeof sendTelegramMessage === 'function') {
        sendTelegramMessage(msg).catch(e => console.log('Lỗi Telegram:', e));
    }

    // Gửi Email tự động ngầm
    try {
      const [khRows2] = await db.query(`SELECT email, ten_cong_ty FROM khach_hangs WHERE id = ?`, [khachHangId]);
      const khachHangMail = khRows2[0];

      if (khachHangMail && khachHangMail.email) {
        const mockReq = { params: { id: phieuThuId } };
        const mockRes = {
          setHeader: () => {},
          send: (buffer) => {
            sendReceiptEmail(khachHangMail.email, khachHangMail.ten_cong_ty, phieuThuId, buffer)
              .catch(e => console.log('Lỗi Background gửi mail PT:', e));
          }
        };
        await module.exports.exportPdf(mockReq, mockRes);
      }
    } catch (err) {
      console.log('Lỗi tiến trình gửi mail tự động PT:', err);
    }

    res.status(201).json({ success: true, message: 'Tạo phiếu thu thành công', data: { id: phieuThuId } });

  } catch (error) {
    if (error.code === 'SO_TIEN_VUOT_QUA_CON_LAI') {
      return res.status(422).json({ success: false, error: { code: error.code, message: error.message } });
    }
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// 🚀 TÍNH NĂNG MỚI: XUẤT FILE PDF PHIẾU THU
const exportPdf = async (req, res) => {
  try {
    const { id } = req.params;

    const [ptRows] = await db.query(`
      SELECT pt.*, kh.ten_cong_ty, kh.so_dien_thoai, kh.dia_chi, kh.email, u.ho_ten as nguoi_lap
      FROM phieu_thus pt
      JOIN khach_hangs kh ON pt.khach_hang_id = kh.id
      JOIN nguoi_dungs u ON pt.nguoi_ghi_nhan_id = u.id
      WHERE pt.id = ?
    `, [id]);

    if (ptRows.length === 0) return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu thu' });
    const pt = ptRows[0];

    const [chiTiet] = await db.query(`
      SELECT van_don_id, so_tien_phan_bo 
      FROM phieu_thu_chi_tiets 
      WHERE phieu_thu_id = ?
    `, [id]);

    let rowsHtml = '';
    chiTiet.forEach((item, index) => {
      rowsHtml += `
        <tr>
          <td style="text-align: center;">${index + 1}</td>
          <td><strong>${item.van_don_id}</strong></td>
          <td style="text-align: right;">${Number(item.so_tien_phan_bo).toLocaleString('vi-VN')} VNĐ</td>
        </tr>
      `;
    });

    const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; line-height: 1.6; }
            .header { text-align: center; border-bottom: 2px solid #52c41a; padding-bottom: 20px; margin-bottom: 30px; }
            .title { font-size: 28px; font-weight: bold; color: #52c41a; letter-spacing: 1px; }
            .pt-id { font-size: 16px; color: #555; margin-top: 5px; }
            .info-box { margin-bottom: 20px; }
            .row { display: flex; margin-bottom: 8px; }
            .label { font-weight: bold; width: 150px; color: #555; }
            .value { flex: 1; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #dee2e6; padding: 12px; }
            th { background-color: #f6ffed; color: #389e0d; }
            .total-row { font-size: 18px; font-weight: bold; color: #cf1322; text-align: right; margin-top: 15px; }
            .footer { margin-top: 60px; display: flex; justify-content: space-around; text-align: center; }
            .sign-box { width: 40%; }
            .sign-title { font-weight: bold; margin-bottom: 80px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">BIÊN NHẬN THANH TOÁN / PHIẾU THU</div>
            <div class="pt-id">Số phiếu: <strong>PT-${pt.id}</strong> | Ngày thu: ${new Date(pt.ngay_thu).toLocaleDateString('vi-VN')}</div>
          </div>

          <div class="info-box">
            <div class="row"><div class="label">Khách hàng:</div><div class="value"><strong>${pt.ten_cong_ty}</strong></div></div>
            <div class="row"><div class="label">Số điện thoại:</div><div class="value">${pt.so_dien_thoai}</div></div>
            <div class="row"><div class="label">Địa chỉ:</div><div class="value">${pt.dia_chi || '---'}</div></div>
            <div class="row"><div class="label">Hình thức:</div><div class="value">${pt.hinh_thuc === 'TIEN_MAT' ? 'Tiền mặt' : 'Chuyển khoản'}</div></div>
            <div class="row"><div class="label">Ghi chú:</div><div class="value">${pt.ghi_chu || '---'}</div></div>
          </div>

          <table>
            <thead><tr><th style="width: 50px; text-align: center;">STT</th><th>Mã Vận Đơn Thanh Toán</th><th style="text-align: right;">Số Tiền Ghi Nhận</th></tr></thead>
            <tbody>${rowsHtml}</tbody>
          </table>

          <div class="total-row">TỔNG SỐ TIỀN THU: ${Number(pt.so_tien_nhan_duoc).toLocaleString('vi-VN')} VNĐ</div>

          <div class="footer">
            <div class="sign-box"><div class="sign-title">Người nộp tiền</div><div>(Ký và ghi rõ họ tên)</div></div>
            <div class="sign-box"><div class="sign-title">Kế toán / Người thu tiền</div><div><strong>${pt.nguoi_lap}</strong></div></div>
          </div>
        </body>
      </html>
    `;

    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.setContent(htmlContent);
    const pdfBuffer = await page.pdf({ format: 'A5', landscape: true, printBackground: true }); 
    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="PhieuThu-PT${id}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

// [POST] Quét ảnh Bill bằng AI (Có tích hợp Tiền xử lý ảnh - Preprocessing)
// 🚀 ĐÃ FIX: Chỉ sử dụng sức mạnh của Gemini, dọn dẹp code rác
// 🚀 ĐÃ BỔ SUNG CONSOLE.LOG ĐỂ IN RA KẾT QUẢ AI
const scanBill = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Vui lòng tải lên ảnh bill chuyển khoản' });
    }

    console.log(`🤖 Đang đẩy ảnh lên Gemini... (Type: ${req.file.mimetype}, Size: ${req.file.size} bytes)`);

    // Chuyển thẳng ảnh cho Gemini đọc
    const aiData = await scanBillWithGemini(req.file.buffer, req.file.mimetype);

    // 🚀 IN RA MÀN HÌNH TERMINAL ĐỂ KIỂM TRA DỮ LIỆU
    console.log('=============================================');
    console.log('🧠 KẾT QUẢ GEMINI BÓC TÁCH TỪ ẢNH BILL:');
    console.log(JSON.stringify(aiData, null, 2)); // null, 2 giúp in JSON thụt lề cho đẹp
    console.log('=============================================');

    if (!aiData.tongSoTien || aiData.tongSoTien <= 0) {
      return res.status(200).json({ 
        success: true, 
        message: 'AI đọc được ảnh nhưng không thấy số tiền hợp lệ.',
        // Đảm bảo cấu trúc trả về rỗng không làm sập Frontend
        data: { tongSoTien: 0, noiDung: '', tenNguoiChuyen: '', maVanDonList: [] } 
      });
    }

    res.json({
      success: true,
      message: '🤖 AI quét bill thành công!',
      data: aiData
    });

  } catch (error) {
    console.error('❌ Lỗi AI OCR Chi Tiết:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🚀 THÊM MỚI: API Xử lý gửi Email riêng biệt khi bấm nút
const sendEmailManual = async (req, res) => {
  try {
    const { id } = req.params;
    const [khRows] = await db.query(`
      SELECT kh.email, kh.ten_cong_ty FROM phieu_thus pt 
      JOIN khach_hangs kh ON pt.khach_hang_id = kh.id 
      WHERE pt.id = ?`, [id]
    );

    if (khRows.length === 0 || !khRows[0].email) {
      return res.status(404).json({ success: false, message: 'Khách hàng này chưa cập nhật địa chỉ Email!' });
    }

    // 1. Tạo buffer PDF trong nền
    const mockReq = { params: { id } };
    let pdfBuffer;
    const mockRes = {
      setHeader: () => {},
      send: (buffer) => { pdfBuffer = buffer; }
    };
    await module.exports.exportPdf(mockReq, mockRes); // Mượn tạm hàm exportPdf để lấy File

    // 2. Bắn Mail
    await sendReceiptEmail(khRows[0].email, khRows[0].ten_cong_ty, id, pdfBuffer);
    
    res.json({ success: true, message: 'Đã gửi Email thành công cho khách hàng!' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi gửi mail: ' + error.message });
  }
};

module.exports = { getReceipts, getReceiptById, createReceipt, exportPdf, scanBill, sendEmailManual };
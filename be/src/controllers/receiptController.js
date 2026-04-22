const Receipt = require('../models/receiptModel');
const db = require('../config/database');
const puppeteer = require('puppeteer'); // THÊM THƯ VIỆN TẠO PDF
const { sendReceiptEmail } = require('../services/emailService');
const { sendTelegramMessage } = require('../services/telegramService'); // THÊM DÒNG NÀY

const sharp = require('sharp');//chinh mau anh
const Tesseract = require('tesseract.js');//ai scan anh

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
    const { khachHangId, tongSoTien, ngayThu, hinhThuc, soThamChieu, ghiChu, phanBo } = req.body;

    // Validation 1: duplicate vanDonId trong phanBo
    const vanDonIds = phanBo.map(p => p.vanDonId);
    const uniqueIds = new Set(vanDonIds);
    if (uniqueIds.size !== vanDonIds.length) {
      return res.status(422).json({ success: false, error: { code: 'PHAN_BO_TRUNG_VAN_DON', message: 'Danh sách phân bổ có vận đơn bị trùng' } });
    }

    // Validation 2: sum(phanBo) == tongSoTien
    const tongPhanBo = phanBo.reduce((sum, p) => sum + Number(p.soTienPhanBo), 0);
    if (Math.abs(tongPhanBo - Number(tongSoTien)) > 0.01) {
      return res.status(422).json({ success: false, error: { code: 'TONG_PHAN_BO_KHONG_KHOP', message: `Tổng phân bổ (${tongPhanBo.toLocaleString('vi-VN')}) không bằng tổng phiếu thu (${Number(tongSoTien).toLocaleString('vi-VN')})` } });
    }

    // Validation 3 + 4: VĐ thuộc đúng KH + không phải PAID
    const placeholders = vanDonIds.map(() => '?').join(',');
    const [vanDons] = await db.query(
      `SELECT vd.id, vd.trang_thai_thanh_toan, bg.khach_hang_id
       FROM van_dons vd
       JOIN bao_gia_chi_tiets ct ON vd.bao_gia_chi_tiet_id = ct.id
       JOIN bao_gias bg ON ct.bao_gia_id = bg.id
       WHERE vd.id IN (${placeholders})`,
      vanDonIds
    );

    for (const vd of vanDons) {
      if (Number(vd.khach_hang_id) !== Number(khachHangId)) {
        return res.status(422).json({ success: false, error: { code: 'VANDON_KHONG_THUOC_KHACH_HANG', message: `Vận đơn ${vd.id} không thuộc khách hàng này` } });
      }
      if (vd.trang_thai_thanh_toan === 'PAID') {
        return res.status(422).json({ success: false, error: { code: 'VANDON_DA_PAID', message: `Vận đơn ${vd.id} đã thanh toán đủ` } });
      }
    }

    // Validation: VĐ không tồn tại
    if (vanDons.length !== vanDonIds.length) {
      return res.status(404).json({ success: false, error: { code: 'VANDON_NOT_FOUND', message: 'Một hoặc nhiều vận đơn không tồn tại' } });
    }

    // 🚀 KHAI BÁO 1 LẦN DUY NHẤT Ở ĐÂY
    const phieuThuId = await Receipt.create({
      khachHangId, tongSoTien, ngayThu, hinhThuc,
      soThamChieu, ghiChu, phanBo,
      nguoiGhiNhanId: req.user.id
    });

    // 🚀 THÊM TÍCH HỢP TELEGRAM BOT Ở ĐÂY
    const soTienFormat = Number(tongSoTien).toLocaleString('vi-VN');
    const msg = `
💰 <b>TIỀN VỀ TÀI KHOẢN!</b>
-----------------------------------
Số phiếu: <b>PT-${phieuThuId}</b>
Khách hàng ID: <b>${khachHangId}</b>
Số tiền thu: <b>${soTienFormat} VNĐ</b>
Hình thức: ${hinhThuc === 'CHUYEN_KHOAN' ? '🏦 Chuyển khoản' : '💵 Tiền mặt'}
Kế toán vừa ghi nhận hệ thống!
    `;
    sendTelegramMessage(msg); // Chạy ngầm

    // 🚀 TIẾN TRÌNH GỬI EMAIL NGẦM
    try {
      const [khRows2] = await db.query(`SELECT email, ten_cong_ty FROM khach_hangs WHERE id = ?`, [khachHangId]);
      const khachHangMail = khRows2[0];

      if (khachHangMail && khachHangMail.email) {
        const mockReq = { params: { id: phieuThuId } };
        const mockRes = {
          setHeader: () => {},
          send: (buffer) => {
            // Nhớ đảm bảo bạn đã require sendReceiptEmail ở đầu file nhé
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

    // 1. Lấy thông tin chung của Phiếu thu (Bổ sung kh.email)
    const [ptRows] = await db.query(`
      SELECT pt.*, kh.ten_cong_ty, kh.so_dien_thoai, kh.dia_chi, kh.email, u.ho_ten as nguoi_lap
      FROM phieu_thus pt
      JOIN khach_hangs kh ON pt.khach_hang_id = kh.id
      JOIN nguoi_dungs u ON pt.nguoi_ghi_nhan_id = u.id
      WHERE pt.id = ?
    `, [id]);

    if (ptRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu thu' });
    }
    const pt = ptRows[0];

    // 2. Lấy danh sách các vận đơn được phân bổ
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

    // 3. Render HTML
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
            <div class="row"><div class="label">Hình thức thanh toán:</div><div class="value">${pt.hinh_thuc === 'TIEN_MAT' ? 'Tiền mặt' : 'Chuyển khoản'}</div></div>
            <div class="row"><div class="label">Số tham chiếu (GD):</div><div class="value">${pt.so_tham_chieu || '---'}</div></div>
            <div class="row"><div class="label">Ghi chú:</div><div class="value">${pt.ghi_chu || '---'}</div></div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 50px; text-align: center;">STT</th>
                <th>Mã Vận Đơn Thanh Toán</th>
                <th style="text-align: right;">Số Tiền Ghi Nhận</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="total-row">
            TỔNG SỐ TIỀN THU: ${Number(pt.tong_so_tien).toLocaleString('vi-VN')} VNĐ
          </div>

          <div class="footer">
            <div class="sign-box">
              <div class="sign-title">Người nộp tiền</div>
              <div>(Ký và ghi rõ họ tên)</div>
            </div>
            <div class="sign-box">
              <div class="sign-title">Kế toán / Người thu tiền</div>
              <div><strong>${pt.nguoi_lap}</strong></div>
            </div>
          </div>
        </body>
      </html>
    `;

    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.setContent(htmlContent);
    const pdfBuffer = await page.pdf({ format: 'A5', landscape: true, printBackground: true }); 
    await browser.close();

    // 🚀 TỰ ĐỘNG GỬI MAIL KHI XUẤT PDF PHIẾU THU
    if (pt.email) {
      sendReceiptEmail(pt.email, pt.ten_cong_ty, id, pdfBuffer)
        .catch(e => console.error("Lỗi gửi mail Phiếu thu khi in:", e));
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="PhieuThu-PT${id}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// [POST] Quét ảnh Bill bằng AI (Có tích hợp Tiền xử lý ảnh - Preprocessing)
const scanBill = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Vui lòng tải lên ảnh bill chuyển khoản' });
    }

    console.log('🖼️ Đang tiền xử lý hình ảnh (Khử nhiễu, chỉnh màu)...');

    // 🚀 BƯỚC 1.5: TIỀN XỬ LÝ ẢNH BẰNG SHARP (IMAGE PRE-PROCESSING)
    // Phép thuật nằm ở đây: Xử lý cái bill MB Bank "khó nhằn"
    const processedImageBuffer = await sharp(req.file.buffer)
      .grayscale()   // 1. Biến ảnh màu thành Trắng/Đen (Khử nền gradient)
      .normalize()   // 2. Kéo dãn độ tương phản lên mức tối đa
      .negate()      // 3. ĐẢO MÀU: Biến chữ trắng/nền đen thành CHỮ ĐEN/NỀN TRẮNG (Tesseract cực kỳ thích điều này)
      .toBuffer();

    console.log('🤖 AI đang đọc văn bản từ ảnh đã xử lý... Vui lòng đợi...');

    // 2. Đưa cái ảnh CHỮ ĐEN NỀN TRẮNG vừa tạo vào cho Tesseract đọc
    const { data: { text } } = await Tesseract.recognize(
      processedImageBuffer,
      'vie+eng' 
    );

    console.log('📝 Chữ AI đọc được (Sau khi xử lý ảnh):\n', text);

    // 3. XỬ LÝ NHIỄU OCR BẰNG CODE
    let fixedText = text.replace(/[Oo]/g, '0').replace(/\n/g, ' ');

    // 4. LOGIC REGEX TÌM TIỀN
    const vndRegex = /([0-9.,\s]+)\s*(?:VND|VNĐ|Đ|VNO|VN0|YND|Vnd)/i;
    const matchVND = fixedText.match(vndRegex);

    let finalAmount = 0;

    if (matchVND && matchVND[1]) {
      const cleanStr = matchVND[1].replace(/[^0-9]/g, '');
      finalAmount = Number(cleanStr);
      console.log(`🎯 Đã chốt số bằng chữ VND: ${finalAmount}`);
    } else {
      const fallbackRegex = /\b\d{1,3}(?:[.,\s]\d{3})+\b/g;
      const foundNumbers = fixedText.match(fallbackRegex);
      
      if (foundNumbers && foundNumbers.length > 0) {
        const cleanNumbers = foundNumbers.map(str => Number(str.replace(/[^0-9]/g, '')));
        const validAmounts = cleanNumbers.filter(num => num >= 1000 && num <= 1000000000);
        
        if (validAmounts.length > 0) {
          finalAmount = Math.max(...validAmounts); 
          console.log(`🎯 Đã chốt số lớn nhất trên bill: ${finalAmount}`);
        }
      }
    }

    // 5. Kiểm tra kết quả
    if (finalAmount <= 0 || isNaN(finalAmount)) {
      return res.status(200).json({ 
        success: true, 
        message: 'AI đọc được chữ nhưng không tìm thấy số tiền nào hợp lệ',
        data: { tongSoTien: 0, rawText: text } 
      });
    }

    // 6. Trả về thành công
    res.json({
      success: true,
      message: '🤖 AI quét bill thành công!',
      data: {
        tongSoTien: finalAmount, 
        rawText: text 
      }
    });

  } catch (error) {
    console.error('❌ Lỗi AI OCR:', error);
    res.status(500).json({ success: false, message: 'Lỗi trong quá trình quét ảnh AI' });
  }
};

module.exports = { getReceipts, getReceiptById, createReceipt, exportPdf, scanBill };
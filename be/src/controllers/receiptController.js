const Receipt = require('../models/receiptModel');
const db = require('../config/database');
const puppeteer = require('puppeteer'); // THÊM THƯ VIỆN TẠO PDF

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

    // Validation 5 + 6 + 7 + 8: trong transaction
    const phieuThuId = await Receipt.create({
      khachHangId, tongSoTien, ngayThu, hinhThuc,
      soThamChieu, ghiChu, phanBo,
      nguoiGhiNhanId: req.user.id
    });

    res.status(201).json({ success: true, message: 'Tạo phiếu thu thành công', data: { id: phieuThuId } });

  } catch (error) {
    // Lỗi từ transaction (SO_TIEN_VUOT_QUA_CON_LAI)
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

    // 1. Lấy thông tin chung của Phiếu thu
    const [ptRows] = await db.query(`
      SELECT pt.*, kh.ten_cong_ty, kh.so_dien_thoai, kh.dia_chi, u.ho_ten as nguoi_lap
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
    // Phiếu thu thường in khổ A5 ngang cho nhỏ gọn, nếu bạn thích A4 thì đổi 'A5' thành 'A4' và xóa chữ landscape đi nhé.
    
    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="PhieuThu-PT${id}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getReceipts, getReceiptById, createReceipt, exportPdf };
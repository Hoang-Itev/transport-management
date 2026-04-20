const Waybill = require('../models/waybillModel');
const db = require('../config/database');
const puppeteer = require('puppeteer'); // THÊM THƯ VIỆN TẠO PDF

const getWaybills = async (req, res) => {
  try {
    const result = await Waybill.findAll(req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

const getWaybillById = async (req, res) => {
  try {
    const waybill = await Waybill.findById(req.params.id);
    if (!waybill) return res.status(404).json({ success: false, error: { code: 'VANDON_NOT_FOUND', message: 'Không tìm thấy vận đơn' } });
    res.json({ success: true, data: waybill });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

const getConfirmedWaybills = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT vd.*, kh.ten_cong_ty
       FROM van_dons vd
       JOIN bao_gia_chi_tiets ct ON vd.bao_gia_chi_tiet_id = ct.id
       JOIN bao_gias bg ON ct.bao_gia_id = bg.id
       JOIN khach_hangs kh ON bg.khach_hang_id = kh.id
       WHERE vd.trang_thai = 'CONFIRMED'`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// FIX: Hàm tạo Vận đơn đã nhận ngày hạn thanh toán từ form
const createWaybill = async (req, res) => {
  try {
    const { baoGiaChiTietId, nguoiLienHeLay, nguoiLienHeGiao, ngayVanChuyen, ngayHetHanThanhToan } = req.body;

    const existing = await Waybill.findByChiTietId(baoGiaChiTietId);
    if (existing) return res.status(409).json({ success: false, error: { code: 'VAN_DON_DA_TON_TAI', message: 'Chi tiết báo giá này đã có vận đơn' } });

    const [ctRows] = await db.query(
      `SELECT ct.*, bg.khach_hang_id, bg.trang_thai
       FROM bao_gia_chi_tiets ct
       JOIN bao_gias bg ON ct.bao_gia_id = bg.id
       WHERE ct.id = ?`,
      [baoGiaChiTietId]
    );
    if (!ctRows.length) return res.status(404).json({ success: false, error: { code: 'CHI_TIET_NOT_FOUND', message: 'Chi tiết báo giá không tồn tại' } });

    const chiTiet = ctRows[0];

    if (chiTiet.trang_thai !== 'ACCEPTED') {
      return res.status(422).json({ success: false, error: { code: 'BAO_GIA_CHUA_ACCEPTED', message: 'Báo giá chưa được khách hàng chấp nhận' } });
    }

    const [khRows] = await db.query(
      `SELECT han_muc_cong_no FROM khach_hangs WHERE id = ?`,
      [chiTiet.khach_hang_id]
    );
    const khachHang = khRows[0];

    const congNoHienTai = await Waybill.checkCongNo(chiTiet.khach_hang_id);
    const giaTriDuKien = Number(chiTiet.thanh_tien);

    if (Number(khachHang.han_muc_cong_no) > 0 &&
        Number(congNoHienTai) + giaTriDuKien > Number(khachHang.han_muc_cong_no)) {
      return res.status(422).json({
        success: false,
        error: {
          code: 'VUOT_HAN_MUC_CONG_NO',
          message: `Khách hàng đã vượt hạn mức công nợ ${Number(khachHang.han_muc_cong_no).toLocaleString('vi-VN')} VNĐ`
        }
      });
    }

    const waybillId = await Waybill.create({
      baoGiaChiTietId,
      nguoiLienHeLay,
      nguoiLienHeGiao,
      ngayVanChuyen,
      trongLuongDuKien: chiTiet.trong_luong,
      giaTriDuKien,
      giaTri: giaTriDuKien,
      ngayHetHanThanhToan, // Ghi nhận trực tiếp giá trị Frontend truyền lên
      nguoiTaoId: req.user.id
    });

    res.status(201).json({ success: true, message: 'Tạo vận đơn thành công', data: { id: waybillId } });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

const updateActualWeight = async (req, res) => {
  try {
    const { id } = req.params;
    const { trongLuongThucTe } = req.body;

    const waybill = await Waybill.findById(id);
    if (!waybill) return res.status(404).json({ success: false, error: { code: 'VANDON_NOT_FOUND', message: 'Không tìm thấy vận đơn' } });

    if (waybill.trang_thai === 'CANCELLED') {
      return res.status(422).json({ success: false, error: { code: 'VAN_DON_DA_HUY', message: 'Vận đơn đã bị hủy' } });
    }
    if (waybill.trang_thai_thanh_toan !== 'UNPAID') {
      return res.status(422).json({ success: false, error: { code: 'KHONG_THE_SUA_DA_CO_PHIEU_THU', message: 'Không thể sửa vận đơn đã có phiếu thu' } });
    }

    const [ctRows] = await db.query(
      `SELECT don_gia_ap_dung FROM bao_gia_chi_tiets WHERE id = ?`,
      [waybill.bao_gia_chi_tiet_id]
    );
    const donGia = Number(ctRows[0].don_gia_ap_dung);
    const giaTriThucTe = Number(trongLuongThucTe) * donGia;

    await Waybill.updateWeightWithTransaction(id, trongLuongThucTe, giaTriThucTe);

    res.json({ success: true, message: 'Cập nhật trọng lượng thực tế thành công', data: { giaTriMoi: giaTriThucTe } });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

const cancelWaybill = async (req, res) => {
  try {
    const { id } = req.params;
    const { lyDoHuy } = req.body;

    const waybill = await Waybill.findById(id);
    if (!waybill) return res.status(404).json({ success: false, error: { code: 'VANDON_NOT_FOUND', message: 'Không tìm thấy vận đơn' } });

    if (waybill.trang_thai_thanh_toan !== 'UNPAID') {
      return res.status(422).json({ success: false, error: { code: 'VANDON_DA_THANH_TOAN', message: 'Không thể hủy vận đơn đã có phiếu thu' } });
    }

    await Waybill.cancel(id, lyDoHuy || 'Không có lý do');

    res.json({ success: true, message: 'Đã hủy vận đơn thành công' });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

const getPendingWaybills = async (req, res) => {
  try {
    const rows = await Waybill.getPendingBaoGiaChiTiet();
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// TÍNH NĂNG MỚI: TẠO PDF VẬN ĐƠN (BIÊN BẢN GIAO NHẬN)
const exportPdf = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Gom dữ liệu từ 5 bảng để in phiếu giao nhận
    const [fullInfo] = await db.query(`
      SELECT vd.*, kh.ten_cong_ty, kh.nguoi_lien_he, kh.so_dien_thoai, kh.dia_chi,
             td.tinh_di, td.tinh_den, lh.ten as ten_loai_hang, ct.don_gia_ap_dung
      FROM van_dons vd
      JOIN bao_gia_chi_tiets ct ON vd.bao_gia_chi_tiet_id = ct.id
      JOIN bao_gias bg ON ct.bao_gia_id = bg.id
      JOIN khach_hangs kh ON bg.khach_hang_id = kh.id
      JOIN tuyen_duongs td ON ct.tuyen_duong_id = td.id
      JOIN loai_hangs lh ON ct.loai_hang_id = lh.id
      WHERE vd.id = ?
    `, [id]);

    if(!fullInfo.length) return res.status(404).json({success: false, message: "Lỗi tải dữ liệu"});
    const data = fullInfo[0];

    const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; line-height: 1.6; color: #333; }
            .header { text-align: center; border-bottom: 2px solid #722ed1; padding-bottom: 20px; margin-bottom: 30px; }
            .title { font-size: 28px; font-weight: bold; color: #722ed1; letter-spacing: 1px; }
            .vd-id { font-size: 16px; color: #555; margin-top: 5px; }
            .section { margin-bottom: 20px; }
            .section-title { font-size: 18px; font-weight: bold; border-bottom: 1px dashed #ccc; padding-bottom: 5px; margin-bottom: 10px; color: #1890ff; }
            .row { display: flex; justify-content: space-between; margin-bottom: 8px; }
            .col { flex: 1; }
            .label { font-weight: bold; color: #555; display: inline-block; width: 140px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #dee2e6; padding: 12px; text-align: left; }
            th { background-color: #f0f5ff; color: #1890ff; }
            .footer { margin-top: 50px; display: flex; justify-content: space-around; text-align: center; }
            .sign-box { width: 30%; }
            .sign-title { font-weight: bold; margin-bottom: 60px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">BIÊN BẢN GIAO NHẬN / VẬN ĐƠN</div>
            <div class="vd-id">Mã số: <strong>${data.id}</strong> | Ngày tạo: ${new Date(data.ngay_tao).toLocaleDateString('vi-VN')}</div>
          </div>

          <div class="section">
            <div class="section-title">1. Thông tin Khách hàng</div>
            <div class="row">
              <div class="col"><span class="label">Khách hàng:</span> ${data.ten_cong_ty}</div>
            </div>
            <div class="row">
              <div class="col"><span class="label">Đại diện:</span> ${data.nguoi_lien_he}</div>
              <div class="col"><span class="label">Điện thoại:</span> ${data.so_dien_thoai}</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">2. Lịch trình & Hàng hóa</div>
            <div class="row">
              <div class="col"><span class="label">Tuyến đường:</span> <strong>${data.tinh_di} ➔ ${data.tinh_den}</strong></div>
              <div class="col"><span class="label">Loại hàng:</span> ${data.ten_loai_hang}</div>
            </div>
            <div class="row">
              <div class="col"><span class="label">Bốc hàng (Lấy):</span> ${data.nguoi_lien_he_lay}</div>
            </div>
            <div class="row">
              <div class="col"><span class="label">Nhận hàng (Giao):</span> ${data.nguoi_lien_he_giao}</div>
            </div>
            <div class="row">
              <div class="col"><span class="label">Đơn giá áp dụng:</span> ${Number(data.don_gia_ap_dung).toLocaleString('vi-VN')} VNĐ/kg</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Trọng lượng dự kiến</th>
                <th>Trọng lượng thực tế</th>
                <th>Tổng cước phí</th>
                <th>Hạn thanh toán</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${Number(data.trong_luong_du_kien).toLocaleString('vi-VN')} kg</td>
                <td><strong style="color: #1890ff">${data.trong_luong_thuc_te ? Number(data.trong_luong_thuc_te).toLocaleString('vi-VN') + ' kg' : 'Chưa cập nhật'}</strong></td>
                <td style="color: #cf1322; font-weight: bold; font-size: 16px;">${Number(data.gia_tri).toLocaleString('vi-VN')} VNĐ</td>
                <td><strong>${new Date(data.ngay_het_han_thanh_toan).toLocaleDateString('vi-VN')}</strong></td>
              </tr>
            </tbody>
          </table>

          <div class="footer">
            <div class="sign-box">
              <div class="sign-title">Đại diện Giao hàng</div>
              <div>(Ký và ghi rõ họ tên)</div>
            </div>
            <div class="sign-box">
              <div class="sign-title">Tài xế tiếp nhận</div>
              <div>(Ký và ghi rõ họ tên)</div>
            </div>
            <div class="sign-box">
              <div class="sign-title">Đại diện Nhận hàng</div>
              <div>(Ký và ghi rõ họ tên)</div>
            </div>
          </div>
        </body>
      </html>
    `;

    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.setContent(htmlContent);
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="VanDon-${id}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { 
  getWaybills, 
  getWaybillById, 
  getConfirmedWaybills, 
  createWaybill, 
  updateActualWeight, 
  cancelWaybill,
  getPendingWaybills,
  exportPdf // XUẤT RA ROUTER SỬ DỤNG
};
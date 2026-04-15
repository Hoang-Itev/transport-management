const Receipt = require('../models/receiptModel');
const db = require('../config/database');

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

module.exports = { getReceipts, getReceiptById, createReceipt };
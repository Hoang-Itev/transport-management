const Waybill = require('../models/waybillModel');
const db = require('../config/database');

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

const createWaybill = async (req, res) => {
  try {
    const { baoGiaChiTietId, nguoiLienHeLay, nguoiLienHeGiao, ngayVanChuyen } = req.body;

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
      `SELECT han_muc_cong_no, ky_han_thanh_toan FROM khach_hangs WHERE id = ?`,
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

    const ngayTao = new Date();
    const ngayHetHan = new Date(ngayTao);
    ngayHetHan.setDate(ngayHetHan.getDate() + Number(khachHang.ky_han_thanh_toan));

    const waybillId = await Waybill.create({
      baoGiaChiTietId,
      nguoiLienHeLay,
      nguoiLienHeGiao,
      ngayVanChuyen,
      trongLuongDuKien: chiTiet.trong_luong,
      giaTriDuKien,
      giaTri: giaTriDuKien,
      ngayHetHanThanhToan: ngayHetHan.toISOString().split('T')[0],
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

// ĐÃ UPDATE: Thêm hàm xử lý lấy danh sách chờ
const getPendingWaybills = async (req, res) => {
  try {
    const rows = await Waybill.getPendingBaoGiaChiTiet();
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

module.exports = { 
  getWaybills, 
  getWaybillById, 
  getConfirmedWaybills, 
  createWaybill, 
  updateActualWeight, 
  cancelWaybill,
  getPendingWaybills // ĐÃ BỔ SUNG VÀO ĐÂY ĐỂ TRÁNH LỖI "is not a function"
};
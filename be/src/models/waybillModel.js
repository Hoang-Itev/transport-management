// src/models/waybillModel.js
const db = require('../config/database');

const Waybill = {
  // 🚀 CẬP NHẬT: Thêm tham số search vào findAll
  findAll: async ({ page = 1, limit = 10, khachHangId, trangThai, trangThaiThanhToan, tuNgay, denNgay, search }) => {
    const offset = (page - 1) * limit;
    let baseQuery = `
      FROM van_dons vd
      JOIN bookings bk ON vd.booking_id = bk.id
      JOIN bao_gias bg ON bk.bao_gia_id = bg.id
      JOIN khach_hangs kh ON bg.khach_hang_id = kh.id
      WHERE 1=1
    `;
    const params = [];

    if (khachHangId) { baseQuery += ` AND bg.khach_hang_id = ?`; params.push(khachHangId); }
    if (trangThai) { baseQuery += ` AND vd.trang_thai_van_chuyen = ?`; params.push(trangThai); }
    if (trangThaiThanhToan) { baseQuery += ` AND vd.trang_thai_thanh_toan = ?`; params.push(trangThaiThanhToan); }
    if (tuNgay && denNgay) { baseQuery += ` AND DATE(vd.ngay_tao) BETWEEN ? AND ?`; params.push(tuNgay, denNgay); }
    
    // 🚀 LOGIC TÌM KIẾM THEO MÃ HOẶC TÊN KHÁCH
    if (search) {
      baseQuery += ` AND (vd.ma_van_don LIKE ? OR kh.ten_cong_ty LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    const selectQuery = `
      SELECT vd.*, vd.ma_van_don AS id, kh.ten_cong_ty, kh.loai_khach, 
             bk.diem_lay_chi_tiet AS tinh_di, bk.diem_giao_chi_tiet AS tinh_den,
             COALESCE((SELECT SUM(so_tien_phan_bo) FROM phieu_thu_chi_tiets WHERE van_don_id = vd.ma_van_don), 0) AS da_thu
      ${baseQuery} ORDER BY vd.ngay_tao DESC LIMIT ? OFFSET ?
    `;
    const countQuery = `SELECT COUNT(*) as total ${baseQuery}`;

    const [rows] = await db.query(selectQuery, [...params, Number(limit), Number(offset)]);
    const [count] = await db.query(countQuery, params);
    return { data: rows, pagination: { total: count[0].total, page: Number(page), limit: Number(limit) } };
  },

  findById: async (ma_van_don) => {
    // 🚀 Lấy thông tin Vận đơn + Tuyến đường (Booking)
    const [rows] = await db.query(`
      SELECT vd.*, vd.ma_van_don AS id, 
             bk.hinh_thuc, bk.so_km_api, bk.diem_lay_chi_tiet, bk.diem_giao_chi_tiet, 
             kh.loai_khach
      FROM van_dons vd
      JOIN bookings bk ON vd.booking_id = bk.id
      JOIN bao_gias bg ON bk.bao_gia_id = bg.id
      JOIN khach_hangs kh ON bg.khach_hang_id = kh.id
      WHERE vd.ma_van_don = ?
    `, [ma_van_don]);

    if (!rows.length) return null;
    const waybill = rows[0];

    // 🚀 Lấy danh sách hàng hóa + Cấu hình kích thước để UI Kho đo đạc
    const [items] = await db.query(`
      SELECT bi.*, lh.ten_loai as ten_loai_hang, lh.cau_hinh_thuoc_tinh, dvt.ten_dvt 
      FROM booking_items bi 
      JOIN loai_hangs lh ON bi.loai_hang_id = lh.id 
      JOIN danh_muc_don_vi_tinhs dvt ON bi.don_vi_tinh_id = dvt.id 
      WHERE bi.booking_id = ?
    `, [waybill.booking_id]);
    waybill.items = items;

    // 🚀 Lấy lịch sử thu tiền của Kế toán
    const [lichSu] = await db.query(`
      SELECT ptct.so_tien_phan_bo, pt.ngay_thu, pt.so_tham_chieu
      FROM phieu_thu_chi_tiets ptct
      JOIN phieu_thus pt ON pt.id = ptct.phieu_thu_id
      WHERE ptct.van_don_id = ?
    `, [ma_van_don]);
    waybill.lich_su_thu = lichSu;

    return waybill;
  },

  getPendingBookings: async () => {
    const [rows] = await db.query(`
      SELECT bk.*, bk.id AS bao_gia_chi_tiet_id, bk.diem_lay_chi_tiet AS tinh_di, bk.diem_giao_chi_tiet AS tinh_den, bg.khach_hang_id, kh.ten_cong_ty
      FROM bookings bk
      JOIN bao_gias bg ON bk.bao_gia_id = bg.id
      JOIN khach_hangs kh ON bg.khach_hang_id = kh.id
      WHERE bg.trang_thai = 'ACCEPTED'
      AND bk.id NOT IN (SELECT booking_id FROM van_dons)
      ORDER BY bg.created_at DESC
    `);
    return rows;
  },

  createTransaction: async (data) => {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, ''); 
      const [countRows] = await connection.query(`SELECT COUNT(*) as cnt FROM van_dons WHERE ma_van_don LIKE ?`, [`VD-${today}%`]);
      const maVanDon = `VD-${today}-${String(countRows[0].cnt + 1).padStart(3, '0')}`;

      await connection.query(
        `INSERT INTO van_dons (ma_van_don, booking_id, nguoi_tao_id, nguoi_gui_ten_thuc_te, nguoi_gui_sdt_thuc_te, nguoi_nhan_ten_thuc_te, nguoi_nhan_sdt_thuc_te, tong_cuoc_chinh, tong_phu_phi, so_tien_chot_cuoi, hinh_thuc_thanh_toan, tien_cod_thu_ho, trang_thai_thanh_toan, trang_thai_van_chuyen)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'UNPAID', 'CHO_LAY')`,
        [maVanDon, data.bookingId, data.nguoiTaoId, data.nguoiGuiTen, data.nguoiGuiSdt, data.nguoiNhanTen, data.nguoiNhanSdt, data.tongCuocChinh, data.tongPhuPhi, data.soTienChotCuoi, data.hinhThucThanhToan, data.tienCodThuHo || 0]
      );

      if (data.hinhThucThanhToan === 'GHI_NO') {
        await connection.query(`UPDATE khach_hangs SET tong_no_hien_tai = tong_no_hien_tai + ? WHERE id = ?`, [data.soTienChotCuoi, data.khachHangId]);
      }

      await connection.commit();
      return maVanDon;
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
  },

  updateFinalNumbersAndPricing: async (ma_van_don, trong_luong_chot, kichThuocChotJSON, tong_cuoc_chinh, tong_phu_phi, so_tien_chot_cuoi) => {
  await db.query(
    `UPDATE van_dons 
     SET trong_luong_chot = ?, 
         kich_thuoc_chot = ?, 
         tong_cuoc_chinh = ?, 
         tong_phu_phi = ?, 
         so_tien_chot_cuoi = ? 
     WHERE ma_van_don = ?`,
    [
      trong_luong_chot || null, 
      JSON.stringify(kichThuocChotJSON) || null, 
      tong_cuoc_chinh, 
      tong_phu_phi, 
      so_tien_chot_cuoi, 
      ma_van_don
    ]
  );
  return true;
},

  cancel: async (ma_van_don) => {
    await db.query(`UPDATE van_dons SET trang_thai_van_chuyen = 'CANCELLED' WHERE ma_van_don = ?`, [ma_van_don]);
  },
  
  getFullDetailsForPdf: async (ma_van_don) => {
    // 🚀 ĐÃ FIX LỖI UNDEFINED BẰNG CÁCH LẤY THÊM so_km_api VÀ nguoi_lien_he
    const [fullInfo] = await db.query(`
      SELECT 
        vd.*, bk.hinh_thuc, bk.so_km_api, bk.diem_lay_chi_tiet AS tinh_di, bk.diem_giao_chi_tiet AS tinh_den, bk.diem_lay_chi_tiet, bk.diem_giao_chi_tiet,
        kh.ten_cong_ty, kh.so_dien_thoai, kh.loai_khach, kh.nguoi_lien_he
      FROM van_dons vd
      JOIN bookings bk ON vd.booking_id = bk.id
      JOIN bao_gias bg ON bk.bao_gia_id = bg.id
      JOIN khach_hangs kh ON kh.id = bg.khach_hang_id
      WHERE vd.ma_van_don = ?
    `, [ma_van_don]);

    if (!fullInfo.length) return null;
    const waybill = fullInfo[0];

    const [items] = await db.query(`
      SELECT bi.*, lh.ten_loai as ten_loai_hang, dvt.ten_dvt 
      FROM booking_items bi 
      JOIN loai_hangs lh ON bi.loai_hang_id = lh.id 
      JOIN danh_muc_don_vi_tinhs dvt ON bi.don_vi_tinh_id = dvt.id 
      WHERE bi.booking_id = ?`, [waybill.booking_id]);
    
    waybill.items = items;
    return waybill;
  }
};
module.exports = Waybill;
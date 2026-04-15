const db = require('../config/database');

const Waybill = {
  findAll: async ({ page = 1, limit = 10, khachHangId, trangThai, trangThaiThanhToan, tuNgay, denNgay, quaHan }) => {
    const offset = (page - 1) * limit;

    let baseQuery = `
      FROM van_dons vd
      JOIN bao_gia_chi_tiets ct ON vd.bao_gia_chi_tiet_id = ct.id
      JOIN bao_gias bg ON ct.bao_gia_id = bg.id
      JOIN khach_hangs kh ON bg.khach_hang_id = kh.id
      WHERE 1=1
    `;
    const params = [];

    if (khachHangId) { baseQuery += ` AND bg.khach_hang_id = ?`; params.push(khachHangId); }
    if (trangThai) { baseQuery += ` AND vd.trang_thai = ?`; params.push(trangThai); }
    if (trangThaiThanhToan) { baseQuery += ` AND vd.trang_thai_thanh_toan = ?`; params.push(trangThaiThanhToan); }
    if (tuNgay && denNgay) { baseQuery += ` AND vd.ngay_van_chuyen BETWEEN ? AND ?`; params.push(tuNgay, denNgay); }
    if (quaHan === 'true') { baseQuery += ` AND vd.ngay_het_han_thanh_toan < CURDATE() AND vd.trang_thai_thanh_toan != 'PAID'`; }

    const selectQuery = `
      SELECT 
        vd.*, 
        kh.ten_cong_ty,
        -- Lấy thêm tổng tiền đã thu của vận đơn này
        COALESCE((SELECT SUM(so_tien_phan_bo) FROM phieu_thu_chi_tiets WHERE van_don_id = vd.id), 0) AS da_thu
      ${baseQuery} 
      ORDER BY vd.ngay_tao DESC 
      LIMIT ? OFFSET ?
    `;
    const countQuery = `SELECT COUNT(*) as total ${baseQuery}`;

    const [rows] = await db.query(selectQuery, [...params, Number(limit), Number(offset)]);
    const [count] = await db.query(countQuery, params);

    return { data: rows, pagination: { total: count[0].total, page: Number(page), limit: Number(limit) } };
  },

  // ĐÃ UPDATE: Lấy chi tiết Vận Đơn kèm Lịch sử Phiếu thu
  findById: async (id) => {
    const [vdRows] = await db.query(
      `SELECT vd.*, kh.ten_cong_ty, bg.khach_hang_id
       FROM van_dons vd
       JOIN bao_gia_chi_tiets ct ON vd.bao_gia_chi_tiet_id = ct.id
       JOIN bao_gias bg ON ct.bao_gia_id = bg.id
       JOIN khach_hangs kh ON bg.khach_hang_id = kh.id
       WHERE vd.id = ?`,
      [id]
    );

    if (vdRows.length === 0) return null;
    const vanDon = vdRows[0];

    const [lichSuThu] = await db.query(
      `SELECT 
         pt.id as phieu_thu_id, 
         pt.ngay_thu, 
         pt.hinh_thuc, 
         pt.so_tham_chieu, 
         pt.ghi_chu,
         ptct.so_tien_phan_bo
       FROM phieu_thu_chi_tiets ptct
       JOIN phieu_thus pt ON pt.id = ptct.phieu_thu_id
       WHERE ptct.van_don_id = ?
       ORDER BY pt.ngay_thu DESC`,
      [id]
    );

    const tongDaThu = lichSuThu.reduce((sum, pt) => sum + Number(pt.so_tien_phan_bo || 0), 0);
    vanDon.da_thu = tongDaThu;
    vanDon.phieuThuList = lichSuThu; 

    return vanDon;
  },

  findByChiTietId: async (baoGiaChiTietId) => {
    const [rows] = await db.query(
      `SELECT id FROM van_dons WHERE bao_gia_chi_tiet_id = ? AND trang_thai != 'CANCELLED'`,
      [baoGiaChiTietId]
    );
    return rows[0];
  },

  checkCongNo: async (khachHangId) => {
    const [result] = await db.query(
      `SELECT COALESCE(SUM(vd.gia_tri), 0) - COALESCE(
         (SELECT SUM(ptct.so_tien_phan_bo)
          FROM phieu_thu_chi_tiets ptct
          JOIN van_dons vd2 ON ptct.van_don_id = vd2.id
          JOIN bao_gia_chi_tiets ct2 ON vd2.bao_gia_chi_tiet_id = ct2.id
          JOIN bao_gias bg2 ON ct2.bao_gia_id = bg2.id
          WHERE bg2.khach_hang_id = ? AND vd2.trang_thai != 'CANCELLED'
         ), 0) as cong_no_thuc
       FROM van_dons vd
       JOIN bao_gia_chi_tiets ct ON vd.bao_gia_chi_tiet_id = ct.id
       JOIN bao_gias bg ON ct.bao_gia_id = bg.id
       WHERE bg.khach_hang_id = ?
         AND vd.trang_thai_thanh_toan != 'PAID'
         AND vd.trang_thai != 'CANCELLED'`,
      [khachHangId, khachHangId]
    );
    return result[0].cong_no_thuc;
  },

  create: async (data) => {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, ''); 
    const [countRows] = await db.query(
      `SELECT COUNT(*) as cnt FROM van_dons WHERE id LIKE ?`,
      [`VD${today}%`]
    );
    const seq = String(countRows[0].cnt + 1).padStart(3, '0');
    const generatedId = `VD${today}${seq}`; 

    await db.query(
      `INSERT INTO van_dons 
      (id, bao_gia_chi_tiet_id, nguoi_lien_he_lay, nguoi_lien_he_giao, ngay_van_chuyen,
       trong_luong_du_kien, gia_tri_du_kien, gia_tri, ngay_het_han_thanh_toan,
       trang_thai, trang_thai_thanh_toan, nguoi_tao_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'CONFIRMED', 'UNPAID', ?)`,
      [generatedId, data.baoGiaChiTietId, data.nguoiLienHeLay, data.nguoiLienHeGiao,
       data.ngayVanChuyen, data.trongLuongDuKien, data.giaTriDuKien, data.giaTri,
       data.ngayHetHanThanhToan, data.nguoiTaoId]
    );
    return generatedId;
  },

  updateWeightWithTransaction: async (id, trongLuongThucTe, giaTriThucTe) => {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query(
        `UPDATE van_dons SET trong_luong_thuc_te = ?, gia_tri_thuc_te = ?, gia_tri = ?, updated_at = NOW() WHERE id = ?`,
        [trongLuongThucTe, giaTriThucTe, giaTriThucTe, id]
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  cancel: async (id, lyDoHuy) => {
    await db.query(
      `UPDATE van_dons SET trang_thai = 'CANCELLED', ly_do_huy = ?, updated_at = NOW() WHERE id = ?`,
      [lyDoHuy, id]
    );
  },

  // ĐÃ UPDATE: Hàm Lấy danh sách Vận đơn chờ (Đảm bảo nằm gọn trong object Waybill)
  getPendingBaoGiaChiTiet: async () => {
    const [rows] = await db.query(
      `SELECT 
        ct.id as bao_gia_chi_tiet_id, 
        bg.id as bao_gia_id, 
        bg.khach_hang_id, 
        kh.ten_cong_ty,
        td.tinh_di, 
        td.tinh_den, 
        lh.ten as ten_loai_hang,
        ct.trong_luong, 
        ct.thanh_tien
      FROM bao_gia_chi_tiets ct
      JOIN bao_gias bg ON ct.bao_gia_id = bg.id
      JOIN khach_hangs kh ON bg.khach_hang_id = kh.id
      JOIN tuyen_duongs td ON ct.tuyen_duong_id = td.id
      JOIN loai_hangs lh ON ct.loai_hang_id = lh.id
      WHERE bg.trang_thai = 'ACCEPTED'
        AND ct.id NOT IN (
            SELECT bao_gia_chi_tiet_id 
            FROM van_dons 
            WHERE trang_thai != 'CANCELLED'
        )
      ORDER BY bg.created_at DESC`
    );
    return rows;
  }
};

module.exports = Waybill;
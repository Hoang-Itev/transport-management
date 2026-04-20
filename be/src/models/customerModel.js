const db = require('../config/database');

const Customer = {
  // 1. Lấy danh sách có phân trang và tìm kiếm (Kèm theo tính CÔNG NỢ ĐỘNG)
  findAll: async ({ page, limit, search, isActive }) => {
    const offset = (page - 1) * limit;
    const params = [];

    // Đặt bí danh 'kh' cho bảng khach_hangs để dễ gọi trong Subquery
    let baseQuery = `FROM khach_hangs kh WHERE 1=1`;

    if (search) {
      baseQuery += ` AND (kh.ten_cong_ty LIKE ? OR kh.ma_so_thue LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    if (isActive !== undefined) {
      baseQuery += ` AND kh.is_active = ?`;
      params.push(isActive === 'true' || isActive === true ? 1 : 0);
    }

    // FIX: Nhúng Subquery tính công nợ hiện tại vào câu SELECT
    // FIX: Bổ sung thêm đếm "so_don_qua_han" vào câu SELECT
    const selectQuery = `
      SELECT 
        kh.*,
        (
          COALESCE((
            SELECT SUM(v.gia_tri) 
            FROM van_dons v JOIN bao_gia_chi_tiets bct ON v.bao_gia_chi_tiet_id = bct.id JOIN bao_gias bg ON bct.bao_gia_id = bg.id 
            WHERE bg.khach_hang_id = kh.id AND v.trang_thai = 'CONFIRMED'
          ), 0)
          - 
          COALESCE((
            SELECT SUM(pt.tong_so_tien) 
            FROM phieu_thus pt WHERE pt.khach_hang_id = kh.id
          ), 0)
        ) AS cong_no_hien_tai,
        
        -- THÊM ĐOẠN NÀY ĐỂ ĐẾM SỐ ĐƠN QUÁ HẠN:
        (
          SELECT COUNT(*)
          FROM van_dons v2
          JOIN bao_gia_chi_tiets bct2 ON v2.bao_gia_chi_tiet_id = bct2.id
          JOIN bao_gias bg2 ON bct2.bao_gia_id = bg2.id
          WHERE bg2.khach_hang_id = kh.id 
            AND v2.ngay_het_han_thanh_toan < CURDATE() 
            AND v2.trang_thai_thanh_toan != 'PAID'
            AND v2.trang_thai != 'CANCELLED'
        ) AS so_don_qua_han

      ${baseQuery} 
      ORDER BY kh.created_at DESC 
      LIMIT ? OFFSET ?
    `;
    
    const countQuery = `SELECT COUNT(*) as total ${baseQuery}`;

    const [rows] = await db.query(selectQuery, [...params, Number(limit), Number(offset)]);
    const [countRows] = await db.query(countQuery, params);

    return {
      data: rows,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total: countRows[0].total
      }
    };
  },

  // 2. Lấy chi tiết 1 khách hàng
  findById: async (id) => {
    const [rows] = await db.query(`SELECT * FROM khach_hangs WHERE id = ?`, [id]);
    return rows[0] || null;
  },

  // 3. FIX: Tính công nợ hiện tại (Đồng bộ chuẩn công thức: Tổng Vận Đơn - Tổng Phiếu Thu)
  getCongNoHienTai: async (id) => {
    const query = `
      SELECT 
        (
          COALESCE((
            SELECT SUM(v.gia_tri) 
            FROM van_dons v 
            JOIN bao_gia_chi_tiets bct ON v.bao_gia_chi_tiet_id = bct.id 
            JOIN bao_gias bg ON bct.bao_gia_id = bg.id 
            WHERE bg.khach_hang_id = ? AND v.trang_thai = 'CONFIRMED'
          ), 0)
          - 
          COALESCE((
            SELECT SUM(pt.tong_so_tien) 
            FROM phieu_thus pt 
            WHERE pt.khach_hang_id = ?
          ), 0)
        ) AS congNo
    `;
    const [rows] = await db.query(query, [id, id]);
    return Number(rows[0].congNo);
  },

  // 4. Kiểm tra khách hàng có vận đơn chưa thanh toán không (Dùng khi Xóa)
  checkUnpaidWaybills: async (id) => {
    const query = `
      SELECT 1
      FROM van_dons vd
      JOIN bao_gia_chi_tiets ct ON vd.bao_gia_chi_tiet_id = ct.id
      JOIN bao_gias bg ON ct.bao_gia_id = bg.id
      WHERE bg.khach_hang_id = ?
        AND vd.trang_thai != 'CANCELLED'
        AND vd.trang_thai_thanh_toan != 'PAID'
      LIMIT 1
    `;
    const [rows] = await db.query(query, [id]);
    return rows.length > 0;
  },

  // 5. Thêm mới
  create: async (data) => {
    const query = `
      INSERT INTO khach_hangs 
      (ten_cong_ty, ma_so_thue, nguoi_lien_he, so_dien_thoai, email, dia_chi, han_muc_cong_no, ky_han_thanh_toan, ghi_chu)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      data.tenCongTy, 
      data.maSoThue, 
      data.nguoiLienHe, 
      data.soDienThoai,
      data.email, 
      data.diaChi, 
      data.hanMucCongNo || 0, 
      data.kyHanThanhToan || 30, 
      data.ghiChu
    ];
    const [result] = await db.query(query, params);
    return result.insertId;
  },

  // 6. Cập nhật
  update: async (id, data) => {
    const query = `
      UPDATE khach_hangs 
      SET ten_cong_ty = ?, ma_so_thue = ?, nguoi_lien_he = ?, so_dien_thoai = ?, 
          email = ?, dia_chi = ?, han_muc_cong_no = ?, ky_han_thanh_toan = ?, 
          ghi_chu = ?, updated_at = NOW()
      WHERE id = ?
    `;
    const params = [
      data.tenCongTy, 
      data.maSoThue, 
      data.nguoiLienHe, 
      data.soDienThoai,
      data.email, 
      data.diaChi, 
      data.hanMucCongNo, 
      data.kyHanThanhToan, 
      data.ghiChu, 
      id
    ];
    await db.query(query, params);
  },

  // 7. Xóa mềm (Soft Delete)
  softDelete: async (id) => {
    await db.query(`UPDATE khach_hangs SET is_active = FALSE, updated_at = NOW() WHERE id = ?`, [id]);
  }
};

module.exports = Customer;
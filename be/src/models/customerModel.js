const db = require('../config/database');

const Customer = {
  // Cực nhanh vì không cần Subquery tính nợ nữa
  findAll: async ({ page = 1, limit = 10, search = '', isActive }) => {
    const offset = (page - 1) * limit;
    let query = `SELECT * FROM khach_hangs WHERE 1=1`;
    const params = [];

    if (search) {
      query += ` AND (ten_cong_ty LIKE ? OR ma_so_thue LIKE ? OR so_dien_thoai LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (isActive !== undefined) {
      query += ` AND is_active = ?`;
      params.push(isActive === 'true' ? 1 : 0);
    }

    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    
    const [rows] = await db.query(query, [...params, Number(limit), Number(offset)]);
    const [countRows] = await db.query(countQuery, params);

    return { data: rows, meta: { page: Number(page), limit: Number(limit), total: countRows[0].total } };
  },

  findById: async (id) => {
    const [rows] = await db.query(`SELECT * FROM khach_hangs WHERE id = ?`, [id]);
    if (!rows.length) return null;
    const kh = rows[0];
    kh.conLaiDuocPhepNo = Number(kh.han_muc_no_toi_da) - Number(kh.tong_no_hien_tai);
    return kh;
  },

  create: async (data) => {
    const [res] = await db.query(
      `INSERT INTO khach_hangs (loai_khach, ten_cong_ty, ma_so_thue, nguoi_lien_he, so_dien_thoai, email, dia_chi, han_muc_no_toi_da)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.loaiKhach || 'B2B_DOANH_NGHIEP', data.tenCongTy, data.maSoThue, data.nguoiLienHe, data.soDienThoai, data.email, data.diaChi, data.hanMucNoToiDa || 0]
    );
    return res.insertId;
  },

  update: async (id, data) => {
    // 🚀 ĐÃ FIX LỖI 500: Bỏ updated_at=NOW() vì DB không có cột này
    await db.query(
      `UPDATE khach_hangs 
       SET loai_khach=?, ten_cong_ty=?, ma_so_thue=?, nguoi_lien_he=?, so_dien_thoai=?, email=?, dia_chi=?, han_muc_no_toi_da=? 
       WHERE id=?`,
      [data.loaiKhach, data.tenCongTy, data.maSoThue, data.nguoiLienHe, data.soDienThoai, data.email, data.diaChi, data.hanMucNoToiDa, id]
    );
  },

  softDelete: async (id) => {
    // 🚀 ĐÃ FIX LỖI 500
    await db.query(`UPDATE khach_hangs SET is_active = FALSE WHERE id = ?`, [id]);
  }
};
module.exports = Customer;
const db = require('../config/database');

const Pricing = {
  findAll: async ({ page = 1, limit = 10, tuyenDuongId, loaiHangId, isActive }) => {
    const offset = (page - 1) * limit;
    let query = `SELECT * FROM bang_gia_cuocs WHERE 1=1`;
    let countQuery = `SELECT COUNT(*) as total FROM bang_gia_cuocs WHERE 1=1`;
    const params = [];

    if (tuyenDuongId) {
      query += ` AND tuyen_duong_id = ?`;
      countQuery += ` AND tuyen_duong_id = ?`;
      params.push(tuyenDuongId);
    }

    if (loaiHangId) {
      query += ` AND loai_hang_id = ?`;
      countQuery += ` AND loai_hang_id = ?`;
      params.push(loaiHangId);
    }

    if (isActive !== undefined && isActive !== null) {
      query += ` AND is_active = ?`;
      countQuery += ` AND is_active = ?`;
      params.push(isActive === 'true' ? 1 : 0);
    }

    query += ` ORDER BY ngay_ap_dung DESC, created_at DESC LIMIT ? OFFSET ?`;
    const finalParams = [...params, Number(limit), Number(offset)];

    const [rows] = await db.query(query, finalParams);
    const [countResult] = await db.query(countQuery, params);

    return {
      data: rows,
      pagination: {
        total: countResult[0].total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(countResult[0].total / limit)
      }
    };
  },

  findById: async (id) => {
    const [rows] = await db.query('SELECT * FROM bang_gia_cuocs WHERE id = ?', [id]);
    return rows[0];
  },

  // FIX LỖI TRÙNG KG TẠI ĐÂY: Xử lý triệt để biến ngayHetHan bị NULL truyền từ Client lên
  checkOverlap: async (tuyenDuongId, loaiHangId, kgTu, kgDen, ngayApDung, ngayHetHan, excludeId = null) => {
    let query = `
      SELECT id FROM bang_gia_cuocs 
      WHERE tuyen_duong_id = ? 
        AND loai_hang_id = ? 
        AND is_active = 1
        AND (? <= kg_den AND ? >= kg_tu)
        AND (? <= COALESCE(ngay_het_han, '2099-12-31') AND COALESCE(?, '2099-12-31') >= ngay_ap_dung)
    `;
    const params = [tuyenDuongId, loaiHangId, kgTu, kgDen, ngayApDung, ngayHetHan];

    if (excludeId) {
      query += ` AND id != ?`;
      params.push(excludeId);
    }

    const [rows] = await db.query(query, params);
    return rows.length > 0; // Trả về true nếu bị trùng
  },

  lookupPrice: async (tuyenDuongId, loaiHangId, trongLuong) => {
    const [rows] = await db.query(
      `SELECT don_gia as donGia, kg_tu as kgTu, kg_den as kgDen, ngay_ap_dung as ngayApDung 
       FROM bang_gia_cuocs 
       WHERE tuyen_duong_id = ? 
         AND loai_hang_id = ? 
         AND is_active = 1
         AND kg_tu <= ? AND kg_den >= ?
         AND ngay_ap_dung <= CURRENT_DATE 
         AND (ngay_het_han IS NULL OR ngay_het_han >= CURRENT_DATE)
       ORDER BY ngay_ap_dung DESC 
       LIMIT 1`,
      [tuyenDuongId, loaiHangId, trongLuong, trongLuong]
    );
    return rows[0];
  },

  create: async (data) => {
    const { tuyenDuongId, loaiHangId, kgTu, kgDen, donGia, ngayApDung, ngayHetHan } = data;
    const [result] = await db.query(
      `INSERT INTO bang_gia_cuocs (tuyen_duong_id, loai_hang_id, kg_tu, kg_den, don_gia, ngay_ap_dung, ngay_het_han) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [tuyenDuongId, loaiHangId, kgTu, kgDen, donGia, ngayApDung, ngayHetHan]
    );
    return result.insertId;
  },

  update: async (id, data) => {
    const { tuyenDuongId, loaiHangId, kgTu, kgDen, donGia, ngayApDung, ngayHetHan } = data;
    await db.query(
      `UPDATE bang_gia_cuocs 
       SET tuyen_duong_id = ?, loai_hang_id = ?, kg_tu = ?, kg_den = ?, don_gia = ?, ngay_ap_dung = ?, ngay_het_han = ? 
       WHERE id = ?`,
      [tuyenDuongId, loaiHangId, kgTu, kgDen, donGia, ngayApDung, ngayHetHan, id]
    );
    return true;
  },

  softDelete: async (id) => {
    await db.query(`UPDATE bang_gia_cuocs SET is_active = 0 WHERE id = ?`, [id]);
    return true;
  }
};

module.exports = Pricing;
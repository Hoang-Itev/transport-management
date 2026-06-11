// src/models/cargoTypeModel.js
const db = require('../config/database');

const CargoType = {
  findAll: async ({ page = 1, limit = 10, search = '', isActive }) => {
    const offset = (page - 1) * limit;
    
    // FIX: Đã xóa cột created_at ra khỏi câu SELECT
    let query = `SELECT id, ten_loai, he_so_gia, cau_hinh_thuoc_tinh, is_active FROM loai_hangs WHERE 1=1`;
    let countQuery = `SELECT COUNT(*) as total FROM loai_hangs WHERE 1=1`;
    const params = [];

    if (search) {
      const searchPattern = `%${search}%`;
      query += ` AND ten_loai LIKE ?`;
      countQuery += ` AND ten_loai LIKE ?`;
      params.push(searchPattern);
    }

    if (isActive !== undefined && isActive !== null) {
      query += ` AND is_active = ?`;
      countQuery += ` AND is_active = ?`;
      params.push(isActive === 'true' ? 1 : 0);
    }

    // FIX: Sửa sắp xếp từ created_at thành id
    query += ` ORDER BY id DESC LIMIT ? OFFSET ?`;
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
    const [rows] = await db.query('SELECT * FROM loai_hangs WHERE id = ?', [id]);
    return rows[0];
  },

  create: async (data) => {
    const { tenLoai, heSoGia, cauHinhThuocTinh } = data;
    const [result] = await db.query(
      `INSERT INTO loai_hangs (ten_loai, he_so_gia, cau_hinh_thuoc_tinh) VALUES (?, ?, ?)`,
      [tenLoai, heSoGia || 1.00, cauHinhThuocTinh ? JSON.stringify(cauHinhThuocTinh) : null]
    );
    return result.insertId;
  },

  update: async (id, data) => {
    const { tenLoai, heSoGia, cauHinhThuocTinh } = data;
    await db.query(
      `UPDATE loai_hangs SET ten_loai = ?, he_so_gia = ?, cau_hinh_thuoc_tinh = ? WHERE id = ?`,
      [tenLoai, heSoGia, cauHinhThuocTinh ? JSON.stringify(cauHinhThuocTinh) : null, id]
    );
    return true;
  },

  softDelete: async (id) => {
    await db.query(`UPDATE loai_hangs SET is_active = 0 WHERE id = ?`, [id]);
    return true;
  }
};

module.exports = CargoType;
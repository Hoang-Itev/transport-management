const db = require('../config/database');

const CargoType = {
  // Lấy danh sách có phân trang và tìm kiếm
  findAll: async ({ page = 1, limit = 10, search = '', isActive }) => {
    const offset = (page - 1) * limit;
    let query = `SELECT * FROM loai_hangs WHERE 1=1`;
    let countQuery = `SELECT COUNT(*) as total FROM loai_hangs WHERE 1=1`;
    const params = [];

    if (search) {
      const searchPattern = `%${search}%`;
      query += ` AND ten LIKE ?`;
      countQuery += ` AND ten LIKE ?`;
      params.push(searchPattern);
    }

    if (isActive !== undefined && isActive !== null) {
      query += ` AND is_active = ?`;
      countQuery += ` AND is_active = ?`;
      params.push(isActive === 'true' ? 1 : 0);
    }

    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
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
    const { ten, moTa } = data;
    const [result] = await db.query(
      `INSERT INTO loai_hangs (ten, mo_ta) VALUES (?, ?)`,
      [ten, moTa]
    );
    return result.insertId;
  },

  update: async (id, data) => {
    const { ten, moTa } = data;
    await db.query(
      `UPDATE loai_hangs SET ten = ?, mo_ta = ? WHERE id = ?`,
      [ten, moTa, id]
    );
    return true;
  },

  // FIX: Vô hiệu hóa dây chuyền Loại hàng -> Bảng giá cước
  softDelete: async (id) => {
    // 1. Ngưng hoạt động loại hàng
    await db.query(`UPDATE loai_hangs SET is_active = 0 WHERE id = ?`, [id]);
    
    // 2. Ngưng hoạt động toàn bộ Bảng giá cước liên quan đến loại hàng này
    await db.query(`UPDATE bang_gia_cuocs SET is_active = 0 WHERE loai_hang_id = ?`, [id]);
    
    return true;
  }
};

module.exports = CargoType;
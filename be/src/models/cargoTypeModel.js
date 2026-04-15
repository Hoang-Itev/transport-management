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

  softDelete: async (id) => {
    await db.query(`UPDATE loai_hangs SET is_active = 0 WHERE id = ?`, [id]);
    return true;
  },

  // KIỂM TRA NGHIỆP VỤ XÓA
  checkInUse: async (cargoTypeId) => {
    // Giả lập kiểm tra bảng bang_gias. 
    // Nếu chưa tạo bảng bang_gias, mình bọc try-catch để nó không sập server lúc test.
    try {
      const [rows] = await db.query(
        `SELECT COUNT(*) as count FROM bang_gias WHERE loai_hang_id = ? AND is_active = 1`,
        [cargoTypeId]
      );
      return rows[0].count > 0;
    } catch (err) {
      return false; // Trả về false nếu chưa có bảng bang_gias
    }
  }
};

module.exports = CargoType;
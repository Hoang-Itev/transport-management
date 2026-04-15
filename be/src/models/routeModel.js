const db = require('../config/database');

const Route = {
  // Lấy danh sách có tìm kiếm (Tỉnh đi/đến) và phân trang
  findAll: async ({ page = 1, limit = 10, search = '', isActive }) => {
    const offset = (page - 1) * limit;
    let query = `SELECT * FROM tuyen_duongs WHERE 1=1`;
    let countQuery = `SELECT COUNT(*) as total FROM tuyen_duongs WHERE 1=1`;
    const params = [];

    if (search) {
      const searchPattern = `%${search}%`;
      query += ` AND (tinh_di LIKE ? OR tinh_den LIKE ?)`;
      countQuery += ` AND (tinh_di LIKE ? OR tinh_den LIKE ?)`;
      params.push(searchPattern, searchPattern);
    }

    if (isActive !== undefined && isActive !== null) {
      query += ` AND is_active = ?`;
      countQuery += ` AND is_active = ?`;
      params.push(isActive === 'true' ? 1 : 0);
    }

    query += ` ORDER BY tinh_di ASC, tinh_den ASC LIMIT ? OFFSET ?`;
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
    const [rows] = await db.query('SELECT * FROM tuyen_duongs WHERE id = ?', [id]);
    return rows[0];
  },

  // Kiểm tra trùng tuyến đường (Tỉnh đi + Tỉnh đến)
  findByEndpoints: async (tinhDi, tinhDen) => {
    const [rows] = await db.query(
      'SELECT * FROM tuyen_duongs WHERE tinh_di = ? AND tinh_den = ?',
      [tinhDi, tinhDen]
    );
    return rows[0];
  },

  create: async (data) => {
    const { tinhDi, tinhDen, km } = data;
    const [result] = await db.query(
      `INSERT INTO tuyen_duongs (tinh_di, tinh_den, km) VALUES (?, ?, ?)`,
      [tinhDi, tinhDen, km]
    );
    return result.insertId;
  },

  update: async (id, data) => {
    const { tinhDi, tinhDen, km } = data;
    await db.query(
      `UPDATE tuyen_duongs SET tinh_di = ?, tinh_den = ?, km = ? WHERE id = ?`,
      [tinhDi, tinhDen, km, id]
    );
    return true;
  },

  softDelete: async (id) => {
    await db.query(`UPDATE tuyen_duongs SET is_active = 0 WHERE id = ?`, [id]);
    return true;
  },

  // Kiểm tra xem tuyến đường có đang nằm trong bảng giá nào không
  checkInUse: async (routeId) => {
    try {
      const [rows] = await db.query(
        `SELECT COUNT(*) as count FROM bang_gias WHERE tuyen_duong_id = ? AND is_active = 1`,
        [routeId]
      );
      return rows[0].count > 0;
    } catch (err) {
      return false;
    }
  }
};

module.exports = Route;
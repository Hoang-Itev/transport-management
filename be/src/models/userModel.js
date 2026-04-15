const db = require('../config/database');
const bcrypt = require('bcryptjs');

const User = {
  // --- CÁC HÀM DÙNG CHO AUTH (Giữ nguyên) ---
  findByUsername: async (username) => {
    const [rows] = await db.query('SELECT * FROM nguoi_dungs WHERE ten_dang_nhap = ?', [username]);
    return rows[0];
  },
  
  findById: async (id) => {
    const [rows] = await db.query('SELECT id, ten_dang_nhap, ho_ten, email, so_dien_thoai, vai_tro, trang_thai, created_at FROM nguoi_dungs WHERE id = ?', [id]);
    return rows[0];
  },

  // --- CÁC HÀM DÙNG CHO QUẢN LÝ CRUD ---
  findAll: async ({ page = 1, limit = 10, search = '', vaiTro, trangThai }) => {
    const offset = (page - 1) * limit;
    let query = `SELECT id, ten_dang_nhap, ho_ten, email, so_dien_thoai, vai_tro, trang_thai, created_at FROM nguoi_dungs WHERE 1=1`;
    let countQuery = `SELECT COUNT(*) as total FROM nguoi_dungs WHERE 1=1`;
    const params = [];

    if (search) {
      const searchPattern = `%${search}%`;
      query += ` AND (ho_ten LIKE ? OR ten_dang_nhap LIKE ? OR email LIKE ?)`;
      countQuery += ` AND (ho_ten LIKE ? OR ten_dang_nhap LIKE ? OR email LIKE ?)`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    if (vaiTro) {
      query += ` AND vai_tro = ?`;
      countQuery += ` AND vai_tro = ?`;
      params.push(vaiTro);
    }

    if (trangThai) {
      query += ` AND trang_thai = ?`;
      countQuery += ` AND trang_thai = ?`;
      params.push(trangThai);
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

  create: async (data) => {
    const { tenDangNhap, matKhau, hoTen, email, soDienThoai, vaiTro } = data;
    const hashPassword = await bcrypt.hash(matKhau, 10); // Băm mật khẩu
    
    const [result] = await db.query(
      `INSERT INTO nguoi_dungs (ten_dang_nhap, mat_khau_hash, ho_ten, email, so_dien_thoai, vai_tro, trang_thai) 
       VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')`,
      [tenDangNhap, hashPassword, hoTen, email, soDienThoai, vaiTro]
    );
    return result.insertId;
  },

  update: async (id, data) => {
    const { hoTen, email, soDienThoai, vaiTro, matKhau } = data;
    let query = `UPDATE nguoi_dungs SET ho_ten = ?, email = ?, so_dien_thoai = ?, vai_tro = ?`;
    const params = [hoTen, email, soDienThoai, vaiTro];

    // Nếu người quản lý muốn đổi pass cho nhân viên, thì mới cập nhật hash
    if (matKhau) {
      query += `, mat_khau_hash = ?`;
      params.push(await bcrypt.hash(matKhau, 10));
    }

    query += ` WHERE id = ?`;
    params.push(id);

    await db.query(query, params);
    return true;
  },

  toggleLock: async (id, currentStatus) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';
    await db.query(`UPDATE nguoi_dungs SET trang_thai = ? WHERE id = ?`, [newStatus, id]);
    return newStatus;
  }
};

module.exports = User;
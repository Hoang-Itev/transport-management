// src/models/pricingSurchargeModel.js
const db = require('../config/database');

module.exports = {
  findAll: async () => {
    // Lệnh JOIN lấy data từ bang_gia_phu_phis ghép với Tên phụ phí và Tên xe
    const query = `
      SELECT bg.*, pp.ten_phu_phi, lx.ten_hien_thi as ten_xe 
      FROM bang_gia_phu_phis bg
      JOIN phu_phis pp ON bg.phu_phi_id = pp.id
      LEFT JOIN loai_xes lx ON bg.loai_xe_id = lx.id
    `;
    const [rows] = await db.query(query);
    return rows;
  },

  create: async (data) => {
    const { phu_phi_id, loai_xe_id, don_gia } = data;
    const [res] = await db.query(
      `INSERT INTO bang_gia_phu_phis (phu_phi_id, loai_xe_id, don_gia) VALUES (?, ?, ?)`,
      [phu_phi_id, loai_xe_id || null, don_gia]
    );
    return res.insertId;
  },

  update: async (id, data) => {
    const { phu_phi_id, loai_xe_id, don_gia } = data;
    await db.query(
      `UPDATE bang_gia_phu_phis SET phu_phi_id=?, loai_xe_id=?, don_gia=? WHERE id=?`,
      [phu_phi_id, loai_xe_id || null, don_gia, id]
    );
  },

  delete: async (id) => {
    await db.query(`DELETE FROM bang_gia_phu_phis WHERE id = ?`, [id]);
  }
};
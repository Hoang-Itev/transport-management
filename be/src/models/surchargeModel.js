// src/models/surchargeModel.js
const db = require('../config/database');

module.exports = {
  findAll: async () => {
    // 🚀 Lấy cột cach_tinh thay vì loai_tinh_phi
    const [rows] = await db.query(`SELECT id, ten_phu_phi, cach_tinh FROM phu_phis WHERE is_active = 1`);
    return rows;
  },
  create: async (data) => {
    await db.query(`INSERT INTO phu_phis (id, ten_phu_phi, cach_tinh) VALUES (?, ?, ?)`, [data.id, data.tenPhuPhi, data.cachTinh]);
  },
  update: async (id, data) => {
    await db.query(`UPDATE phu_phis SET ten_phu_phi = ?, cach_tinh = ? WHERE id = ?`, [data.tenPhuPhi, data.cachTinh, id]);
  },
  softDelete: async (id) => {
    await db.query(`UPDATE phu_phis SET is_active = 0 WHERE id = ?`, [id]);
  }
};
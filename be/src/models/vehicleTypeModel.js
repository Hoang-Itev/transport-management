const db = require('../config/database');
module.exports = {
  findAll: async () => {
    const [rows] = await db.query(`SELECT * FROM loai_xes WHERE is_active = 1`);
    return rows;
  },
  create: async (data) => {
    await db.query(`INSERT INTO loai_xes (id, ten_hien_thi, tai_trong_max_kg) VALUES (?, ?, ?)`, [data.id, data.tenHienThi, data.taiTrongMaxKg]);
  },
  update: async (id, data) => {
    await db.query(`UPDATE loai_xes SET ten_hien_thi = ?, tai_trong_max_kg = ? WHERE id = ?`, [data.tenHienThi, data.taiTrongMaxKg, id]);
  },
  softDelete: async (id) => {
    await db.query(`UPDATE loai_xes SET is_active = 0 WHERE id = ?`, [id]);
  }
};
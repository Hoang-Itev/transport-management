const db = require('../config/database');
module.exports = {
  findAll: async () => {
    const [rows] = await db.query(`SELECT * FROM tham_so_he_thongs`);
    return rows;
  },
  update: async (maThamSo, giaTri) => {
    await db.query(`UPDATE tham_so_he_thongs SET gia_tri = ? WHERE ma_tham_so = ?`, [giaTri, maThamSo]);
  }
};
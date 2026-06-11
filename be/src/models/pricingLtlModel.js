// src/models/pricingLtlModel.js
const db = require('../config/database');

module.exports = {
  // ==========================================
  // PHẦN 1: BẢNG GIÁ LTL THEO KHOẢNG CÁCH (KM)
  // ==========================================
  findAllPricings: async () => {
    const [rows] = await db.query(`SELECT * FROM bang_gia_ltls WHERE is_active = 1 ORDER BY moc_tu_km ASC`);
    return rows;
  },

  lookupBasePrice: async (soKm) => {
    const [rows] = await db.query(
      `SELECT don_gia_goc_kg FROM bang_gia_ltls WHERE is_active = 1 AND moc_tu_km <= ? AND moc_den_km >= ? LIMIT 1`,
      [soKm, soKm]
    );
    return rows[0] || null;
  },

  createPricing: async (data) => {
    const [res] = await db.query(
      `INSERT INTO bang_gia_ltls (moc_tu_km, moc_den_km, don_gia_goc_kg) VALUES (?, ?, ?)`,
      [data.mocTuKm, data.mocDenKm, data.donGiaGocKg]
    );
    return res.insertId;
  },

  updatePricing: async (id, data) => {
    await db.query(
      `UPDATE bang_gia_ltls SET moc_tu_km=?, moc_den_km=?, don_gia_goc_kg=? WHERE id=?`,
      [data.mocTuKm, data.mocDenKm, data.donGiaGocKg, id]
    );
  },

  softDeletePricing: async (id) => {
    await db.query(`UPDATE bang_gia_ltls SET is_active = 0 WHERE id = ?`, [id]);
  },

  // ==========================================
  // PHẦN 2: CHIẾT KHẤU SẢN LƯỢNG LTL (KG)
  // ==========================================
  findAllDiscounts: async () => {
    const [rows] = await db.query(`SELECT * FROM chiet_khau_san_luong_ltls ORDER BY moc_tu_kg ASC`);
    return rows;
  },

  lookupDiscount: async (kg) => {
    const [rows] = await db.query(
      `SELECT he_so_chiet_khau FROM chiet_khau_san_luong_ltls WHERE moc_tu_kg <= ? AND moc_den_kg >= ? LIMIT 1`,
      [kg, kg]
    );
    return rows[0] || null;
  },

  createDiscount: async (data) => {
    const [res] = await db.query(
      `INSERT INTO chiet_khau_san_luong_ltls (moc_tu_kg, moc_den_km, he_so_chiet_khau) VALUES (?, ?, ?)`,
      [data.mocTuKg, data.mocDenKg, data.heSoChietKhau]
    );
    return res.insertId;
  },

  updateDiscount: async (id, data) => {
    await db.query(
      `UPDATE chiet_khau_san_luong_ltls SET moc_tu_kg=?, moc_den_kg=?, he_so_chiet_khau=? WHERE id=?`,
      [data.mocTuKg, data.mocDenKg, data.heSoChietKhau, id]
    );
  },

  deleteDiscount: async (id) => {
    await db.query(`DELETE FROM chiet_khau_san_luong_ltls WHERE id = ?`, [id]);
  }
};
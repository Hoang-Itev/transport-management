const db = require('../config/database');
module.exports = {
  checkOverlap: async (loaiXeId, mocTuKm, mocDenKm, excludeId = null) => {
    let query = `
      SELECT id FROM bang_gia_ftls 
      WHERE loai_xe_id = ? AND is_active = 1 AND (? <= moc_den_km AND ? >= moc_tu_km)
    `;
    const params = [loaiXeId, mocTuKm, mocDenKm];
    if (excludeId) { query += ` AND id != ?`; params.push(excludeId); }
    
    const [rows] = await db.query(query, params);
    return rows.length > 0;
  },
  
  findAll: async () => {
    const [rows] = await db.query(`SELECT * FROM bang_gia_ftls WHERE is_active = 1 ORDER BY loai_xe_id, moc_tu_km`);
    return { data: rows };
  },
  findByVehicle: async (loaiXeId) => {
    const [rows] = await db.query(
      `SELECT * FROM bang_gia_ftls WHERE loai_xe_id = ? AND is_active = 1 ORDER BY moc_tu_km ASC`,
      [loaiXeId]
    );
    return rows;
  },
  create: async (data) => {
    const [res] = await db.query(
      `INSERT INTO bang_gia_ftls (loai_xe_id, moc_tu_km, moc_den_km, gia_mo_cua, don_gia_km) VALUES (?, ?, ?, ?, ?)`,
      [data.loaiXeId, data.mocTuKm, data.mocDenKm, data.giaMoCua, data.donGiaKm]
    );
    return res.insertId;
  },
  update: async (id, data) => {
    await db.query(`UPDATE bang_gia_ftls SET loai_xe_id=?, moc_tu_km=?, moc_den_km=?, gia_mo_cua=?, don_gia_km=? WHERE id=?`, 
    [data.loaiXeId, data.mocTuKm, data.mocDenKm, data.giaMoCua, data.donGiaKm, id]);
  },
  softDelete: async (id) => await db.query(`UPDATE bang_gia_ftls SET is_active = 0 WHERE id = ?`, [id])
};
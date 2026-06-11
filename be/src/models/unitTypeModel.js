const db = require('../config/database');

exports.getAll = async () => {
    const [rows] = await db.execute('SELECT * FROM danh_muc_don_vi_tinhs');
    return rows;
};

exports.findById = async (id) => {
    const [rows] = await db.execute('SELECT * FROM danh_muc_don_vi_tinhs WHERE id = ?', [id]);
    return rows[0];
};

exports.create = async (data) => {
    const { ten_dvt, is_active = true } = data;
    const [result] = await db.execute(
        'INSERT INTO danh_muc_don_vi_tinhs (ten_dvt, is_active) VALUES (?, ?)',
        [ten_dvt, is_active]
    );
    return result.insertId;
};

exports.update = async (id, data) => {
    const { ten_dvt, is_active } = data;
    const [result] = await db.execute(
        'UPDATE danh_muc_don_vi_tinhs SET ten_dvt = ?, is_active = ? WHERE id = ?',
        [ten_dvt, is_active, id]
    );
    return result.affectedRows;
};

exports.delete = async (id) => {
    const [result] = await db.execute('DELETE FROM danh_muc_don_vi_tinhs WHERE id = ?', [id]);
    return result.affectedRows;
};
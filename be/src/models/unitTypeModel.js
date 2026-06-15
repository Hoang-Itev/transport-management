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
    // 🚀 Bắt thêm biến yeu_cau_kich_thuoc (mặc định false nếu ko truyền)
    const { ten_dvt, is_active = true, yeu_cau_kich_thuoc = false } = data;
    const [result] = await db.execute(
        'INSERT INTO danh_muc_don_vi_tinhs (ten_dvt, is_active, yeu_cau_kich_thuoc) VALUES (?, ?, ?)',
        [ten_dvt, is_active, yeu_cau_kich_thuoc]
    );
    return result.insertId;
};

exports.update = async (id, data) => {
    const { ten_dvt, is_active, yeu_cau_kich_thuoc } = data;
    const [result] = await db.execute(
        'UPDATE danh_muc_don_vi_tinhs SET ten_dvt = ?, is_active = ?, yeu_cau_kich_thuoc = ? WHERE id = ?',
        [ten_dvt, is_active, yeu_cau_kich_thuoc, id]
    );
    return result.affectedRows;
};

exports.delete = async (id) => {
    const [result] = await db.execute('DELETE FROM danh_muc_don_vi_tinhs WHERE id = ?', [id]);
    return result.affectedRows;
};
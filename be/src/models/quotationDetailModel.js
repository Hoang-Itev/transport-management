const db = require('../config/database');

const QuotationDetail = {
  findById: async (id) => {
    const [rows] = await db.query('SELECT * FROM bao_gia_chi_tiets WHERE id = ?', [id]);
    return rows[0];
  },

  // ⚠️ HÀM NỘI BỘ: Tự động tính lại Tổng giá trị của Báo giá
  _recalculateTotal: async (connection, baoGiaId) => {
    const [sumResult] = await connection.query(
      'SELECT COALESCE(SUM(thanh_tien), 0) as total FROM bao_gia_chi_tiets WHERE bao_gia_id = ?',
      [baoGiaId]
    );
    const total = sumResult[0].total;
    await connection.query('UPDATE bao_gias SET tong_gia_tri = ? WHERE id = ?', [total, baoGiaId]);
    return total;
  },

  addDetailWithTransaction: async (baoGiaId, data) => {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      
      // 1. Thêm dòng chi tiết
      const [result] = await connection.query(
        `INSERT INTO bao_gia_chi_tiets 
        (bao_gia_id, tuyen_duong_id, loai_hang_id, dia_chi_lay_hang, dia_chi_giao_hang, trong_luong, don_gia_ap_dung, thanh_tien, ghi_chu) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [baoGiaId, data.tuyenDuongId, data.loaiHangId, data.diaChiLayHang, data.diaChiGiaoHang, data.trongLuong, data.donGiaApDung, data.thanhTien, data.ghiChu]
      );
      
      // 2. Tính lại tổng tiền
      const newTotal = await QuotationDetail._recalculateTotal(connection, baoGiaId);
      
      await connection.commit();
      return { detailId: result.insertId, newTotal };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  updateDetailWithTransaction: async (baoGiaId, detailId, data) => {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      
      // 1. Cập nhật dòng chi tiết
      await connection.query(
        `UPDATE bao_gia_chi_tiets 
         SET tuyen_duong_id=?, loai_hang_id=?, dia_chi_lay_hang=?, dia_chi_giao_hang=?, trong_luong=?, don_gia_ap_dung=?, thanh_tien=?, ghi_chu=?
         WHERE id = ? AND bao_gia_id = ?`,
        [data.tuyenDuongId, data.loaiHangId, data.diaChiLayHang, data.diaChiGiaoHang, data.trongLuong, data.donGiaApDung, data.thanhTien, data.ghiChu, detailId, baoGiaId]
      );
      
      // 2. Tính lại tổng tiền
      const newTotal = await QuotationDetail._recalculateTotal(connection, baoGiaId);
      
      await connection.commit();
      return newTotal;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  deleteDetailWithTransaction: async (baoGiaId, detailId) => {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      
      // 1. Xóa dòng chi tiết
      await connection.query(`DELETE FROM bao_gia_chi_tiets WHERE id = ? AND bao_gia_id = ?`, [detailId, baoGiaId]);
      
      // 2. Tính lại tổng tiền
      const newTotal = await QuotationDetail._recalculateTotal(connection, baoGiaId);
      
      await connection.commit();
      return newTotal;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
};

module.exports = QuotationDetail;
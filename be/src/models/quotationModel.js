const db = require('../config/database');

const Quotation = {
  findAll: async ({ page = 1, limit = 10, khachHangId, trangThai, tuNgay, denNgay }) => {
    const offset = (page - 1) * limit;
    let query = `SELECT * FROM bao_gias WHERE 1=1`;
    let countQuery = `SELECT COUNT(*) as total FROM bao_gias WHERE 1=1`;
    const params = [];

    if (khachHangId) {
      query += ` AND khach_hang_id = ?`;
      countQuery += ` AND khach_hang_id = ?`;
      params.push(khachHangId);
    }
    if (trangThai) {
      query += ` AND trang_thai = ?`;
      countQuery += ` AND trang_thai = ?`;
      params.push(trangThai);
    }
    if (tuNgay && denNgay) {
      query += ` AND DATE(created_at) BETWEEN ? AND ?`;
      countQuery += ` AND DATE(created_at) BETWEEN ? AND ?`;
      params.push(tuNgay, denNgay);
    }

    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    const finalParams = [...params, Number(limit), Number(offset)];

    const [rows] = await db.query(query, finalParams);
    const [countResult] = await db.query(countQuery, params);

    return {
      data: rows,
      pagination: { total: countResult[0].total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(countResult[0].total / limit) }
    };
  },

  findById: async (id) => {
    // Lấy thông tin chung
    const [baoGia] = await db.query('SELECT * FROM bao_gias WHERE id = ?', [id]);
    if (!baoGia.length) return null;

    // Lấy danh sách chi tiết
    const [chiTiet] = await db.query('SELECT * FROM bao_gia_chi_tiets WHERE bao_gia_id = ?', [id]);
    
    return { ...baoGia[0], chiTiet };
  },

  // ⚠️ NGHIỆP VỤ LÕI: TRANSACTION TẠO BÁO GIÁ
  createWithDetails: async (khachHangId, ngayHetHan, ghiChu, tongGiaTri, chiTietList, userId) => {
    const connection = await db.getConnection(); // Mở 1 kết nối riêng cho Transaction
    try {
      await connection.beginTransaction(); // Bắt đầu Transaction

      // 1. Insert bảng cha (bao_gias) - Thêm nguoi_tao_id vào
      const [result] = await connection.query(
        `INSERT INTO bao_gias (khach_hang_id, ngay_het_han, ghi_chu, tong_gia_tri, trang_thai, nguoi_tao_id) 
         VALUES (?, ?, ?, ?, 'DRAFT', ?)`,
        [khachHangId, ngayHetHan, ghiChu, tongGiaTri, userId]
      );
      const baoGiaId = result.insertId;

      // 2. Insert các bảng con (bao_gia_chi_tiets)
      for (const item of chiTietList) {
        await connection.query(
          `INSERT INTO bao_gia_chi_tiets (bao_gia_id, tuyen_duong_id, loai_hang_id, dia_chi_lay_hang, dia_chi_giao_hang, trong_luong, don_gia_ap_dung, thanh_tien, ghi_chu) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [baoGiaId, item.tuyenDuongId, item.loaiHangId, item.diaChiLayHang, item.diaChiGiaoHang, item.trongLuong, item.donGiaApDung, item.thanhTien, item.ghiChu]
        );
      }

      await connection.commit(); // Thành công -> Lưu tất cả vào DB
      return baoGiaId;
    } catch (error) {
      await connection.rollback(); // Có lỗi -> Rút lại toàn bộ lệnh
      throw error;
    } finally {
      connection.release(); // Trả kết nối về Pool
    }
  },

  update: async (id, data) => {
    const { ngayHetHan, ghiChu } = data;
    await db.query(`UPDATE bao_gias SET ngay_het_han = ?, ghi_chu = ? WHERE id = ?`, [ngayHetHan, ghiChu, id]);
    return true;
  },

  updateStatus: async (id, status, reason = null) => {
    if (reason) {
      // Vì không có cột ly_do, mình sẽ ghi đè hoặc nối thêm vào cột ghi_chu
      const noteUpdate = `[PHẢN HỒI]: ${reason}`;
      await db.query(
        `UPDATE bao_gias SET trang_thai = ?, ghi_chu = CONCAT(COALESCE(ghi_chu, ''), ' | ', ?) WHERE id = ?`, 
        [status, noteUpdate, id]
      );
    } else {
      await db.query(`UPDATE bao_gias SET trang_thai = ? WHERE id = ?`, [status, id]);
    }
    return true;
  },

  // Hàm gom dữ liệu cho PDF
  getFullDetailsForPdf: async (id) => {
    // 1. Lấy thông tin chung báo giá
    const [qRows] = await db.query(
      `SELECT 
        q.*, 
        kh.ten_cong_ty, kh.nguoi_lien_he, kh.so_dien_thoai, kh.dia_chi, kh.email,
        u.ho_ten as sale_name, u.so_dien_thoai as sale_phone
       FROM bao_gias q
       JOIN khach_hangs kh ON q.khach_hang_id = kh.id
       JOIN nguoi_dungs u ON q.nguoi_tao_id = u.id
       WHERE q.id = ?`,
      [id]
    );
    
    if (qRows.length === 0) return null;
    const quotation = qRows[0];

    // 2. Lấy chi tiết báo giá (Khớp 100% với bảng bao_gia_chi_tiets)
    // Giả định cột tên trong bảng loai_hangs là 'ten'
    const [details] = await db.query(
      `SELECT ct.*, lh.ten AS ten_loai_hang 
       FROM bao_gia_chi_tiets ct
       LEFT JOIN loai_hangs lh ON ct.loai_hang_id = lh.id
       WHERE ct.bao_gia_id = ?`, 
      [id]
    );

    quotation.details = details;
    return quotation;
  },

  // Thêm đoạn này vào dưới cùng của Object Quotation
  
  // ⚠️ NGHIỆP VỤ LÕI: TRANSACTION CẬP NHẬT BÁO GIÁ (XÓA CŨ - THÊM MỚI)
  updateWithDetails: async (id, ngayHetHan, ghiChu, tongGiaTri, chiTietList) => {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Cập nhật bảng cha (bao_gias) với tổng tiền mới
      await connection.query(
        `UPDATE bao_gias SET ngay_het_han = ?, ghi_chu = ?, tong_gia_tri = ? WHERE id = ?`,
        [ngayHetHan, ghiChu, tongGiaTri, id]
      );

      // 2. Xóa SACH các chi tiết cũ của báo giá này
      await connection.query(`DELETE FROM bao_gia_chi_tiets WHERE bao_gia_id = ?`, [id]);

      // 3. Thêm lại toàn bộ chi tiết mới (đã được tra giá lại)
      for (const item of chiTietList) {
        await connection.query(
          `INSERT INTO bao_gia_chi_tiets (bao_gia_id, tuyen_duong_id, loai_hang_id, dia_chi_lay_hang, dia_chi_giao_hang, trong_luong, don_gia_ap_dung, thanh_tien, ghi_chu) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, item.tuyenDuongId, item.loaiHangId, item.diaChiLayHang, item.diaChiGiaoHang, item.trongLuong, item.donGiaApDung, item.thanhTien, item.ghiChu || item.ghi_chu || null]
        );
      }

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

};

module.exports = Quotation;
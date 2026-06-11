const db = require('../config/database');

const Quotation = {
  findAll: async ({ page = 1, limit = 10, khachHangId, trangThai }) => {
    const offset = (page - 1) * limit;
    let query = `SELECT bg.*, kh.ten_cong_ty FROM bao_gias bg JOIN khach_hangs kh ON bg.khach_hang_id = kh.id WHERE 1=1`;
    const params = [];
    if (khachHangId) { query += ` AND bg.khach_hang_id = ?`; params.push(khachHangId); }
    if (trangThai) { query += ` AND bg.trang_thai = ?`; params.push(trangThai); }
    const countQuery = query.replace('SELECT bg.*, kh.ten_cong_ty', 'SELECT COUNT(*) as total');
    query += ` ORDER BY bg.created_at DESC LIMIT ? OFFSET ?`;
    const [rows] = await db.query(query, [...params, Number(limit), Number(offset)]);
    const [count] = await db.query(countQuery, params);
    return { data: rows, pagination: { total: count[0].total, page: Number(page), totalPages: Math.ceil(count[0].total / limit) } };
  },

  findById: async (id) => {
    const [bg] = await db.query('SELECT * FROM bao_gias WHERE id = ?', [id]);
    if (!bg.length) return null;
    const [bookings] = await db.query('SELECT * FROM bookings WHERE bao_gia_id = ?', [id]);
    for (let bk of bookings) {
       const [items] = await db.query('SELECT * FROM booking_items WHERE booking_id = ?', [bk.id]);
       bk.items = items;
       const [phuPhis] = await db.query('SELECT phu_phi_id as phuPhiId, loai_xe_id as loaiXeId FROM booking_phu_phis WHERE booking_id = ?', [bk.id]);
       bk.phuPhis = phuPhis;
    }
    return { ...bg[0], bookings };
  },

  createFullTransaction: async (data) => {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const [countBG] = await connection.query(`SELECT COUNT(*) as cnt FROM bao_gias WHERE id LIKE ?`, [`BG${datePrefix}%`]);
      const bgId = `BG${datePrefix}${String(countBG[0].cnt + 1).padStart(3, '0')}`;

      await connection.query(
        `INSERT INTO bao_gias (id, khach_hang_id, nguoi_tao_id, tong_tien_truoc_thue, thue_vat_pt, tong_tien_sau_thue, ngay_het_han, ghi_chu_dieu_khoan) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [bgId, data.khachHangId, data.nguoiTaoId, data.tongTienTruocThue, data.thueVatPt, data.tongTienSauThue, data.ngayHetHan, data.ghiChu || '']
      );

      for (let i = 0; i < data.processedBookings.length; i++) {
        const bk = data.processedBookings[i];
        const bkId = `${bgId}-BK${i + 1}`;
        await connection.query(
          `INSERT INTO bookings (id, bao_gia_id, hinh_thuc, loai_xe_id, so_km_api, nguoi_gui_ten, nguoi_gui_sdt, diem_lay_chi_tiet, nguoi_nhan_ten, nguoi_nhan_sdt, diem_giao_chi_tiet, tong_cuoc_chinh) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [bkId, bgId, bk.hinhThuc, bk.loaiXeId || null, bk.soKmApi || 0, bk.nguoiGuiTen || '', bk.nguoiGuiSdt || '', bk.diemLayChiTiet || 'Chưa xác định', bk.nguoiNhanTen || '', bk.nguoiNhanSdt || '', bk.diemGiaoChiTiet || 'Chưa xác định', bk.tongCuocChinh || 0]
        );
        if(bk.items && bk.items.length > 0) {
            for (const item of bk.items) {
                await connection.query(`INSERT INTO booking_items (booking_id, loai_hang_id, ten_hang, so_luong, don_vi_tinh_id, trong_luong_thuc_te, gia_tri_khai_bao, thuoc_tinh_chi_tiet, chargeable_weight) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [bkId, item.loaiHangId || 1, item.tenHang || 'Hàng hóa', item.soLuong || 1, item.donViTinhId || 1, item.trongLuongThucTe || 0, item.giaTriKhaiBao || 0, JSON.stringify(item.thuocTinhChiTiet || {}), item.chargeableWeight || 0]);
            }
        }
        if (bk.phuPhiCoDinh && bk.phuPhiCoDinh.length > 0) {
          for (const pp of bk.phuPhiCoDinh) {
            await connection.query(`INSERT INTO booking_phu_phis (booking_id, phu_phi_id, loai_xe_id, so_tien_du_kien) VALUES (?, ?, ?, ?)`, [bkId, pp.phuPhiId, pp.loaiXeId || null, pp.soTienDuKien || 0]);
          }
        }
      }
      await connection.commit();
      return bgId;
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
  },

  updateFullTransaction: async (id, data) => {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query(`UPDATE bao_gias SET tong_tien_truoc_thue=?, thue_vat_pt=?, tong_tien_sau_thue=?, ngay_het_han=?, ghi_chu_dieu_khoan=? WHERE id=?`, [data.tongTienTruocThue, data.thueVatPt, data.tongTienSauThue, data.ngayHetHan, data.ghiChu || '', id]);
      await connection.query(`DELETE FROM bookings WHERE bao_gia_id = ?`, [id]); 

      for (let i = 0; i < data.processedBookings.length; i++) {
        const bk = data.processedBookings[i];
        const bkId = `${id}-BK${i + 1}`;
        await connection.query(
          `INSERT INTO bookings (id, bao_gia_id, hinh_thuc, loai_xe_id, so_km_api, nguoi_gui_ten, nguoi_gui_sdt, diem_lay_chi_tiet, nguoi_nhan_ten, nguoi_nhan_sdt, diem_giao_chi_tiet, tong_cuoc_chinh) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [bkId, id, bk.hinhThuc, bk.loaiXeId || null, bk.soKmApi || 0, bk.nguoiGuiTen || '', bk.nguoiGuiSdt || '', bk.diemLayChiTiet || 'Chưa xác định', bk.nguoiNhanTen || '', bk.nguoiNhanSdt || '', bk.diemGiaoChiTiet || 'Chưa xác định', bk.tongCuocChinh || 0]
        );
        if(bk.items && bk.items.length > 0) {
            for (const item of bk.items) {
                await connection.query(`INSERT INTO booking_items (booking_id, loai_hang_id, ten_hang, so_luong, don_vi_tinh_id, trong_luong_thuc_te, gia_tri_khai_bao, thuoc_tinh_chi_tiet, chargeable_weight) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [bkId, item.loaiHangId || 1, item.tenHang || 'Hàng hóa', item.soLuong || 1, item.donViTinhId || 1, item.trongLuongThucTe || 0, item.giaTriKhaiBao || 0, JSON.stringify(item.thuocTinhChiTiet || {}), item.chargeableWeight || 0]);
            }
        }
        if (bk.phuPhiCoDinh && bk.phuPhiCoDinh.length > 0) {
          for (const pp of bk.phuPhiCoDinh) {
            await connection.query(`INSERT INTO booking_phu_phis (booking_id, phu_phi_id, loai_xe_id, so_tien_du_kien) VALUES (?, ?, ?, ?)`, [bkId, pp.phuPhiId, pp.loaiXeId || null, pp.soTienDuKien || 0]);
          }
        }
      }
      await connection.commit();
      return true;
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
  },

  updateStatus: async (id, status, reason = null) => {
    let query = `UPDATE bao_gias SET trang_thai = ?`;
    const params = [status];
    if (reason) { query += `, ghi_chu_dieu_khoan = CONCAT(COALESCE(ghi_chu_dieu_khoan, ''), ' | [LÝ DO]: ', ?)`; params.push(reason); }
    query += ` WHERE id = ?`; params.push(id);
    await db.query(query, params);
  },

  getFullDetailsForPdf: async (id) => {
    const [bg] = await db.query(`SELECT bg.*, kh.ten_cong_ty, kh.so_dien_thoai, kh.email FROM bao_gias bg JOIN khach_hangs kh ON bg.khach_hang_id = kh.id WHERE bg.id = ?`, [id]);
    if (!bg.length) return null;
    const quotation = bg[0];
    
    const [details] = await db.query(`SELECT bk.*, (SELECT SUM(so_tien_du_kien) FROM booking_phu_phis WHERE booking_id = bk.id) as tong_phu_phi FROM bookings bk WHERE bk.bao_gia_id = ?`, [id]);
    
    for (let bk of details) {
        const [items] = await db.query(`SELECT bi.*, lh.ten_loai as ten_loai_hang, dvt.ten_dvt FROM booking_items bi JOIN loai_hangs lh ON bi.loai_hang_id = lh.id LEFT JOIN danh_muc_don_vi_tinhs dvt ON bi.don_vi_tinh_id = dvt.id WHERE bi.booking_id = ?`, [bk.id]);
        bk.items = items;
        const [phuPhis] = await db.query(`SELECT bp.*, pp.ten_phu_phi FROM booking_phu_phis bp JOIN phu_phis pp ON bp.phu_phi_id = pp.id WHERE bp.booking_id = ?`, [bk.id]);
        bk.chi_tiet_phu_phi = phuPhis;
        
        // 🚀 FIX LỖI PDF RỖNG: Map ngược tên trường chuẩn cho Template cũ
        bk.tinh_di = bk.diem_lay_chi_tiet;
        bk.tinh_den = bk.diem_giao_chi_tiet;
        bk.cuoc_chinh_du_kien = bk.tong_cuoc_chinh;
    }
    
    quotation.bookings = details;
    return quotation;
  }

  
};
module.exports = Quotation;
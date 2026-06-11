// src/models/receiptModel.js
const db = require('../config/database');

const Receipt = {
  findAll: async ({ page = 1, limit = 10, khachHangId, tuNgay, denNgay, hinhThuc }) => {
    const offset = (page - 1) * limit;
    let baseQuery = `
      FROM phieu_thus pt
      JOIN khach_hangs kh ON pt.khach_hang_id = kh.id
      WHERE 1=1
    `;
    const params = [];

    if (khachHangId) { baseQuery += ` AND pt.khach_hang_id = ?`; params.push(khachHangId); }
    if (tuNgay)      { baseQuery += ` AND pt.ngay_thu >= ?`;      params.push(tuNgay); }
    if (denNgay)     { baseQuery += ` AND pt.ngay_thu <= ?`;      params.push(denNgay); }
    if (hinhThuc)    { baseQuery += ` AND pt.hinh_thuc = ?`;      params.push(hinhThuc); }

    const selectQuery = `
      SELECT pt.*, kh.ten_cong_ty,
        (SELECT COUNT(*) FROM phieu_thu_chi_tiets WHERE phieu_thu_id = pt.id) as so_van_don
      ${baseQuery}
      ORDER BY pt.ngay_thu DESC LIMIT ? OFFSET ?
    `;
    const countQuery = `SELECT COUNT(*) as total ${baseQuery}`;

    const [rows] = await db.query(selectQuery, [...params, Number(limit), Number(offset)]);
    const [count] = await db.query(countQuery, params);

    return { data: rows, pagination: { total: count[0].total, page: Number(page), limit: Number(limit) } };
  },

  findById: async (id) => {
    // 🚀 ĐÃ FIX: Bổ sung JOIN khach_hangs để Frontend có tên công ty hiển thị
    const [ptRows] = await db.query(`
      SELECT pt.*, kh.ten_cong_ty 
      FROM phieu_thus pt 
      JOIN khach_hangs kh ON pt.khach_hang_id = kh.id 
      WHERE pt.id = ?
    `, [id]);
    
    if (!ptRows.length) return null;
    
    const [chiTiet] = await db.query(`SELECT * FROM phieu_thu_chi_tiets WHERE phieu_thu_id = ?`, [id]);
    return { ...ptRows[0], chiTiet };
  },

  // FIX: Chuyển vd.id thành vd.ma_van_don
  tinhConLai: async (connection, vanDonId) => {
    const [rows] = await connection.query(
      `SELECT vd.so_tien_chot_cuoi as gia_tri, COALESCE(SUM(ptct.so_tien_phan_bo), 0) as da_thu
       FROM van_dons vd
       LEFT JOIN phieu_thu_chi_tiets ptct ON vd.ma_van_don = ptct.van_don_id
       WHERE vd.ma_van_don = ? FOR UPDATE`, 
      [vanDonId]
    );
    if (!rows.length) return null;
    return { giaTri: Number(rows[0].gia_tri), daThu: Number(rows[0].da_thu), conLai: Number(rows[0].gia_tri) - Number(rows[0].da_thu) };
  },

  tinhTrangThaiThanhToan: (giaTri, tongDaThu) => {
    if (tongDaThu <= 0) return 'UNPAID';
    if (tongDaThu >= giaTri) return 'PAID';
    return 'PARTIAL';
  },

  create: async (data) => {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // 1. SELECT FOR UPDATE chặn chạy đua dữ liệu
      for (const pb of data.phanBo) {
        const conLaiInfo = await Receipt.tinhConLai(connection, pb.vanDonId);
        if (Number(pb.soTienPhanBo) > conLaiInfo.conLai) {
          throw Object.assign(new Error(`Số tiền phân bổ vượt quá công nợ vận đơn ${pb.vanDonId}`), { code: 'SO_TIEN_VUOT_QUA_CON_LAI' });
        }
      }

      // 2. Insert phiếu thu
      const [pt] = await connection.query(
        `INSERT INTO phieu_thus (khach_hang_id, nguoi_ghi_nhan_id, so_tien_nhan_duoc, ngay_thu, hinh_thuc, so_tham_chieu, hinh_anh_bill, ghi_chu)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [data.khachHangId, data.nguoiGhiNhanId, data.tongSoTien, data.ngayThu, data.hinhThuc, data.soThamChieu, data.hinhAnhBill, data.ghiChu]
      );
      const phieuThuId = pt.insertId;

      let tongDaPhanBo = 0;
      for (const pb of data.phanBo) {
        tongDaPhanBo += Number(pb.soTienPhanBo);
        
        await connection.query(
          `INSERT INTO phieu_thu_chi_tiets (phieu_thu_id, van_don_id, so_tien_phan_bo) VALUES (?, ?, ?)`,
          [phieuThuId, pb.vanDonId, pb.soTienPhanBo]
        );

        // FIX: Tính toán PARTIAL / PAID tự động (Sửa vd.id thành ma_van_don)
        const [tongRows] = await connection.query(
          `SELECT vd.so_tien_chot_cuoi, COALESCE(SUM(ptct.so_tien_phan_bo), 0) as tong_da_thu
           FROM van_dons vd LEFT JOIN phieu_thu_chi_tiets ptct ON vd.ma_van_don = ptct.van_don_id WHERE vd.ma_van_don = ?`, [pb.vanDonId]
        );
        const trangThai = Receipt.tinhTrangThaiThanhToan(Number(tongRows[0].so_tien_chot_cuoi), Number(tongRows[0].tong_da_thu));

        await connection.query(`UPDATE van_dons SET trang_thai_thanh_toan = ? WHERE ma_van_don = ?`, [trangThai, pb.vanDonId]);
      }

      // 3. Giảm nợ khách hàng
      await connection.query(
        `UPDATE khach_hangs SET tong_no_hien_tai = GREATEST(0, tong_no_hien_tai - ?) WHERE id = ?`,
        [tongDaPhanBo, data.khachHangId]
      );

      await connection.commit();
      return phieuThuId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
};
module.exports = Receipt;
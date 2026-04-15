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
      ORDER BY pt.ngay_thu DESC
      LIMIT ? OFFSET ?
    `;
    const countQuery = `SELECT COUNT(*) as total ${baseQuery}`;

    const [rows] = await db.query(selectQuery, [...params, Number(limit), Number(offset)]);
    const [count] = await db.query(countQuery, params);

    return { data: rows, pagination: { total: count[0].total, page: Number(page), limit: Number(limit) } };
  },

  findById: async (id) => {
    // Lấy header phiếu thu
    const [ptRows] = await db.query(
      `SELECT pt.*, kh.ten_cong_ty, nd.ho_ten as nguoi_ghi_nhan
       FROM phieu_thus pt
       JOIN khach_hangs kh ON pt.khach_hang_id = kh.id
       JOIN nguoi_dungs nd ON pt.nguoi_ghi_nhan_id = nd.id
       WHERE pt.id = ?`,
      [id]
    );
    if (!ptRows.length) return null;

    // Lấy chi tiết phân bổ
    const [chiTiet] = await db.query(
      `SELECT ptct.van_don_id, ptct.so_tien_phan_bo
       FROM phieu_thu_chi_tiets ptct
       WHERE ptct.phieu_thu_id = ?`,
      [id]
    );

    return { ...ptRows[0], chiTiet };
  },

  // Tính conLai của 1 vận đơn (dùng trong transaction nên nhận connection)
  tinhConLai: async (connection, vanDonId) => {
    const [rows] = await connection.query(
      `SELECT vd.gia_tri,
        COALESCE(SUM(ptct.so_tien_phan_bo), 0) as da_thu
       FROM van_dons vd
       LEFT JOIN phieu_thu_chi_tiets ptct ON vd.id = ptct.van_don_id
       WHERE vd.id = ?
       FOR UPDATE`,
      [vanDonId]
    );
    if (!rows.length) return null;
    const row = rows[0];
    return {
      giaTri: Number(row.gia_tri),
      daThu: Number(row.da_thu),
      conLai: Number(row.gia_tri) - Number(row.da_thu)
    };
  },

  // Tính trạng thái thanh toán sau khi thu
  tinhTrangThaiThanhToan: (giaTri, tongDaThu) => {
    if (tongDaThu <= 0)          return 'UNPAID';
    if (tongDaThu >= giaTri)     return 'PAID';
    return 'PARTIAL';
  },

  create: async (data) => {
    const { khachHangId, tongSoTien, ngayThu, hinhThuc, soThamChieu, ghiChu, phanBo, nguoiGhiNhanId } = data;
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // 5. SELECT FOR UPDATE từng VĐ, tính conLai + check
      for (const pb of phanBo) {
        const conLaiInfo = await Receipt.tinhConLai(connection, pb.vanDonId);
        if (Number(pb.soTienPhanBo) > conLaiInfo.conLai) {
          await connection.rollback();
          connection.release();
          const err = new Error(`Số tiền phân bổ vượt quá công nợ vận đơn ${pb.vanDonId}`);
          err.code = 'SO_TIEN_VUOT_QUA_CON_LAI';
          err.vanDonId = pb.vanDonId;
          throw err;
        }
      }

      // 7. Insert phieu_thus
      const [ptResult] = await connection.query(
        `INSERT INTO phieu_thus (khach_hang_id, nguoi_ghi_nhan_id, tong_so_tien, ngay_thu, hinh_thuc, so_tham_chieu, ghi_chu)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [khachHangId, nguoiGhiNhanId, tongSoTien, ngayThu, hinhThuc, soThamChieu || null, ghiChu || null]
      );
      const phieuThuId = ptResult.insertId;

      // 7. Insert phieu_thu_chi_tiets + 8. Update trang_thai_thanh_toan
      for (const pb of phanBo) {
        await connection.query(
          `INSERT INTO phieu_thu_chi_tiets (phieu_thu_id, van_don_id, so_tien_phan_bo)
           VALUES (?, ?, ?)`,
          [phieuThuId, pb.vanDonId, pb.soTienPhanBo]
        );

        // Tính lại tổng đã thu sau khi insert
        const [tongRows] = await connection.query(
          `SELECT vd.gia_tri,
            COALESCE(SUM(ptct.so_tien_phan_bo), 0) as tong_da_thu
           FROM van_dons vd
           LEFT JOIN phieu_thu_chi_tiets ptct ON vd.id = ptct.van_don_id
           WHERE vd.id = ?`,
          [pb.vanDonId]
        );
        const { gia_tri, tong_da_thu } = tongRows[0];
        const trangThai = Receipt.tinhTrangThaiThanhToan(Number(gia_tri), Number(tong_da_thu));

        await connection.query(
          `UPDATE van_dons SET trang_thai_thanh_toan = ?, updated_at = NOW() WHERE id = ?`,
          [trangThai, pb.vanDonId]
        );
      }

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
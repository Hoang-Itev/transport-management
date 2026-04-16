const db = require('../config/database');

const CongNo = {
  // GET /cong-no — danh sách tổng hợp
  // FIX 1: Thêm tham số 'search' vào hàm nhận
  findAll: async ({ page = 1, limit = 20, quaHan, nguoiTaoId, search }) => {
    const offset = (page - 1) * limit;

    let baseQuery = `
      FROM khach_hangs kh
      WHERE kh.is_active = TRUE
    `;
    const params = [];

    // FIX 2: Bổ sung logic lọc theo Tên công ty nếu có search
    if (search) {
      baseQuery += ` AND kh.ten_cong_ty LIKE ? `;
      params.push(`%${search}%`);
    }

    if (nguoiTaoId) {
      baseQuery += `
        AND EXISTS (
          SELECT 1 FROM bao_gias bg
          WHERE bg.khach_hang_id = kh.id
          AND bg.nguoi_tao_id = ?
        )
      `;
      params.push(nguoiTaoId);
    }

    // Đẩy điều kiện lọc quá hạn vào thẳng SQL
    if (quaHan === 'true' || quaHan === true) {
      baseQuery += `
        AND EXISTS (
          SELECT 1 FROM van_dons vd
          JOIN bao_gia_chi_tiets ct ON vd.bao_gia_chi_tiet_id = ct.id
          JOIN bao_gias bg ON ct.bao_gia_id = bg.id
          WHERE bg.khach_hang_id = kh.id
            AND vd.trang_thai = 'CONFIRMED'
            AND vd.trang_thai_thanh_toan != 'PAID'
            AND vd.ngay_het_han_thanh_toan < CURDATE()
        )
      `;
    }

    const selectQuery = `
      SELECT
        kh.id            AS khachHangId,
        kh.ten_cong_ty   AS tenCongTy,
        kh.han_muc_cong_no AS hanMucCongNo,
        COALESCE((
          SELECT SUM(vd.gia_tri - COALESCE(
            (SELECT SUM(so_tien_phan_bo) FROM phieu_thu_chi_tiets ptct WHERE ptct.van_don_id = vd.id), 0
          ))
          FROM van_dons vd
          JOIN bao_gia_chi_tiets ct ON vd.bao_gia_chi_tiet_id = ct.id
          JOIN bao_gias bg ON ct.bao_gia_id = bg.id
          WHERE bg.khach_hang_id = kh.id
            AND vd.trang_thai = 'CONFIRMED'
            AND vd.trang_thai_thanh_toan != 'PAID'
        ), 0) AS congNoHienTai,
        COALESCE((
          SELECT COUNT(*)
          FROM van_dons vd
          JOIN bao_gia_chi_tiets ct ON vd.bao_gia_chi_tiet_id = ct.id
          JOIN bao_gias bg ON ct.bao_gia_id = bg.id
          WHERE bg.khach_hang_id = kh.id
            AND vd.trang_thai = 'CONFIRMED'
            AND vd.trang_thai_thanh_toan != 'PAID'
        ), 0) AS soVanDonChuaTT,
        COALESCE((
          SELECT 1 FROM van_dons vd
          JOIN bao_gia_chi_tiets ct ON vd.bao_gia_chi_tiet_id = ct.id
          JOIN bao_gias bg ON ct.bao_gia_id = bg.id
          WHERE bg.khach_hang_id = kh.id
            AND vd.trang_thai = 'CONFIRMED'
            AND vd.trang_thai_thanh_toan != 'PAID'
            AND vd.ngay_het_han_thanh_toan < CURDATE()
          LIMIT 1
        ), 0) AS isQuaHan
      ${baseQuery}
      ORDER BY congNoHienTai DESC
      LIMIT ? OFFSET ?
    `;
    
    const countQuery = `SELECT COUNT(*) as total ${baseQuery}`;

    const [rows] = await db.query(selectQuery, [...params, Number(limit), Number(offset)]);
    const [count] = await db.query(countQuery, params);

    const data = rows.map(row => {
      const congNoHienTai = Number(row.congNoHienTai);
      const hanMucCongNo = Number(row.hanMucCongNo);
      return {
        khachHangId:      row.khachHangId,
        tenCongTy:        row.tenCongTy,
        hanMucCongNo,
        congNoHienTai,
        conLaiDuocPhepNo: hanMucCongNo - congNoHienTai,
        soVanDonChuaTT:   Number(row.soVanDonChuaTT),
        isQuaHan:         row.isQuaHan === 1 
      };
    });

    return {
      data,
      pagination: {
        total: count[0].total,
        page:  Number(page),
        limit: Number(limit)
      }
    };
  },

  // GET /cong-no/:khachHangId — chi tiết 1 khách
  findByKhachHangId: async (khachHangId) => {
    const [khRows] = await db.query(
      `SELECT id, ten_cong_ty, han_muc_cong_no FROM khach_hangs WHERE id = ?`,
      [khachHangId]
    );
    if (!khRows.length) return null;
    const kh = khRows[0];

    const today = new Date().toISOString().split('T')[0];

    // Vận đơn quá hạn
    const [vanDonQuaHan] = await db.query(
      `SELECT
        vd.id                        AS vanDonId,
        vd.gia_tri                   AS giaTri,
        vd.ngay_het_han_thanh_toan   AS ngayHetHanThanhToan,
        COALESCE((SELECT SUM(so_tien_phan_bo) FROM phieu_thu_chi_tiets WHERE van_don_id = vd.id), 0) AS daThu,
        DATEDIFF(NOW(), vd.ngay_het_han_thanh_toan) AS soNgayQuaHan
       FROM van_dons vd
       JOIN bao_gia_chi_tiets ct ON vd.bao_gia_chi_tiet_id = ct.id
       JOIN bao_gias bg ON ct.bao_gia_id = bg.id
       WHERE bg.khach_hang_id = ?
         AND vd.trang_thai = 'CONFIRMED'
         AND vd.trang_thai_thanh_toan != 'PAID'
         AND vd.ngay_het_han_thanh_toan < ?`,
      [khachHangId, today]
    );

    // Vận đơn chưa thanh toán (trong hạn)
    const [vanDonChuaTT] = await db.query(
      `SELECT
        vd.id                        AS vanDonId,
        vd.gia_tri                   AS giaTri,
        vd.ngay_het_han_thanh_toan   AS ngayHetHanThanhToan,
        COALESCE((SELECT SUM(so_tien_phan_bo) FROM phieu_thu_chi_tiets WHERE van_don_id = vd.id), 0) AS daThu
       FROM van_dons vd
       JOIN bao_gia_chi_tiets ct ON vd.bao_gia_chi_tiet_id = ct.id
       JOIN bao_gias bg ON ct.bao_gia_id = bg.id
       WHERE bg.khach_hang_id = ?
         AND vd.trang_thai = 'CONFIRMED'
         AND vd.trang_thai_thanh_toan != 'PAID'
         AND vd.ngay_het_han_thanh_toan >= ?`,
      [khachHangId, today]
    );

    const [lichSu] = await db.query(
      `SELECT
        pt.id         AS maPhieuThu,
        pt.ngay_thu   AS ngayThu,
        pt.hinh_thuc  AS hinhThuc,
        ptct.so_tien_phan_bo AS soTienPhanBo
       FROM phieu_thus pt
       JOIN phieu_thu_chi_tiets ptct ON pt.id = ptct.phieu_thu_id
       WHERE pt.khach_hang_id = ?
       ORDER BY pt.ngay_thu DESC`,
      [khachHangId]
    );

    const formatVanDon = (vd) => ({
      vanDonId:             vd.vanDonId,
      giaTri:               Number(vd.giaTri),
      conLai:               Number(vd.giaTri) - Number(vd.daThu),
      ngayHetHanThanhToan:  vd.ngayHetHanThanhToan,
      ...(vd.soNgayQuaHan !== undefined && { soNgayQuaHan: Number(vd.soNgayQuaHan) })
    });

    const congNoHienTai = [
      ...vanDonQuaHan.map(formatVanDon),
      ...vanDonChuaTT.map(formatVanDon)
    ].reduce((sum, vd) => sum + vd.conLai, 0);

    const hanMucCongNo = Number(kh.han_muc_cong_no);

    return {
      khachHangId:      Number(kh.id),
      tenCongTy:        kh.ten_cong_ty,
      hanMucCongNo,
      congNoHienTai,
      conLaiDuocPhepNo: hanMucCongNo - congNoHienTai,
      vanDonQuaHan:     vanDonQuaHan.map(formatVanDon),
      vanDonChuaTT:     vanDonChuaTT.map(formatVanDon),
      lichSuThanhToan:  lichSu.map(ls => ({
        maPhieuThu:    ls.maPhieuThu,
        ngayThu:       ls.ngayThu,
        soTienPhanBo:  Number(ls.soTienPhanBo),
        hinhThuc:      ls.hinhThuc
      }))
    };
  },

  // GET /xuat-bao-cao — data để xuất báo cáo
  baoCaoCongNo: async ({ thang, nam }) => {
    const params = [];
    let whereClause = `
      WHERE vd.trang_thai = 'CONFIRMED'
        AND vd.trang_thai_thanh_toan != 'PAID'
    `;

    if (thang && nam) {
      whereClause += ` AND MONTH(vd.ngay_tao) = ? AND YEAR(vd.ngay_tao) = ?`;
      params.push(Number(thang), Number(nam));
    }

    const [rows] = await db.query(
      `SELECT
        kh.ten_cong_ty            AS tenCongTy,
        kh.nguoi_lien_he          AS nguoiLienHe,
        kh.so_dien_thoai          AS soDienThoai,
        vd.id                     AS vanDonId,
        vd.gia_tri                AS giaTri,
        vd.ngay_het_han_thanh_toan AS ngayHetHan,
        COALESCE(SUM(ptct.so_tien_phan_bo), 0) AS daThu,
        DATEDIFF(NOW(), vd.ngay_het_han_thanh_toan) AS soNgayQuaHan
       FROM van_dons vd
       JOIN bao_gia_chi_tiets ct ON vd.bao_gia_chi_tiet_id = ct.id
       JOIN bao_gias bg ON ct.bao_gia_id = bg.id
       JOIN khach_hangs kh ON bg.khach_hang_id = kh.id
       LEFT JOIN phieu_thu_chi_tiets ptct ON vd.id = ptct.van_don_id
       ${whereClause}
       GROUP BY vd.id
       ORDER BY kh.ten_cong_ty, vd.ngay_het_han_thanh_toan`,
      params
    );

    return rows.map(r => ({
      tenCongTy:    r.tenCongTy,
      nguoiLienHe:  r.nguoiLienHe,
      soDienThoai:  r.soDienThoai,
      vanDonId:     r.vanDonId,
      giaTri:       Number(r.giaTri),
      daThu:        Number(r.daThu),
      conLai:       Number(r.giaTri) - Number(r.daThu),
      ngayHetHan:   r.ngayHetHan,
      soNgayQuaHan: Number(r.soNgayQuaHan),
      isQuaHan:     Number(r.soNgayQuaHan) > 0
    }));
  }
};

module.exports = CongNo;
// src/models/congNoModel.js
const db = require('../config/database');


const CongNo = {
  findAll: async ({ page = 1, limit = 20, search, quaHan }) => {
    const offset = (page - 1) * limit;
    let baseQuery = `FROM khach_hangs WHERE loai_khach = 'B2B_DOANH_NGHIEP' AND is_active = 1`;
    const params = [];
    
    if (search) { baseQuery += ` AND ten_cong_ty LIKE ?`; params.push(`%${search}%`); }

    if (quaHan === 'true' || quaHan === true) {
      baseQuery += ` AND EXISTS(
        SELECT 1 FROM van_dons vd JOIN bookings bk ON vd.booking_id = bk.id JOIN bao_gias bg ON bk.bao_gia_id = bg.id 
        WHERE bg.khach_hang_id = khach_hangs.id AND vd.hinh_thuc_thanh_toan = 'GHI_NO' AND vd.trang_thai_van_chuyen != 'CANCELLED' 
        AND vd.trang_thai_thanh_toan != 'PAID' AND DATE_ADD(vd.ngay_tao, INTERVAL 30 DAY) < NOW()
      )`;
    }

    const selectQuery = `
      SELECT id as khachHangId, ten_cong_ty as tenCongTy, han_muc_no_toi_da as hanMucCongNo, tong_no_hien_tai as congNoHienTai, (han_muc_no_toi_da - tong_no_hien_tai) as conLaiDuocPhepNo,
      (SELECT COUNT(*) FROM van_dons vd JOIN bookings bk ON vd.booking_id = bk.id JOIN bao_gias bg ON bk.bao_gia_id = bg.id WHERE bg.khach_hang_id = khach_hangs.id AND vd.hinh_thuc_thanh_toan = 'GHI_NO' AND vd.trang_thai_van_chuyen != 'CANCELLED' AND vd.trang_thai_thanh_toan != 'PAID') as soVanDonChuaTT,
      EXISTS(SELECT 1 FROM van_dons vd JOIN bookings bk ON vd.booking_id = bk.id JOIN bao_gias bg ON bk.bao_gia_id = bg.id WHERE bg.khach_hang_id = khach_hangs.id AND vd.hinh_thuc_thanh_toan = 'GHI_NO' AND vd.trang_thai_van_chuyen != 'CANCELLED' AND vd.trang_thai_thanh_toan != 'PAID' AND DATE_ADD(vd.ngay_tao, INTERVAL 30 DAY) < NOW()) as isQuaHan
      ${baseQuery} ORDER BY tong_no_hien_tai DESC LIMIT ? OFFSET ?`;
      
    const countQuery = `SELECT COUNT(*) as total ${baseQuery}`;
    
    // 🚀 ĐÃ FIX: Tính tổng nợ toàn cục (Bỏ qua Limit/Offset) để trang Công nợ hiển thị đúng
    const sumDebtQuery = `SELECT COALESCE(SUM(tong_no_hien_tai), 0) as globalTotalDebt ${baseQuery}`;
    
    const [rows] = await db.query(selectQuery, [...params, Number(limit), Number(offset)]);
    const [count] = await db.query(countQuery, params);
    const [sumDebt] = await db.query(sumDebtQuery, params);
    
    return { 
      data: rows, 
      pagination: { total: count[0].total, page: Number(page), limit: Number(limit) },
      globalTotalDebt: Number(sumDebt[0].globalTotalDebt) // Trả về FE để hiển thị
    };
  },

  // 🚀 HÀM MỚI: Lấy danh sách toàn bộ khách hàng đang có nợ để gửi Mail hàng loạt
  getDanhSachKhachNoEmail: async () => {
    const [rows] = await db.query(`
      SELECT id, ten_cong_ty, email, tong_no_hien_tai 
      FROM khach_hangs 
      WHERE loai_khach = 'B2B_DOANH_NGHIEP' AND is_active = 1 AND tong_no_hien_tai > 0 AND email IS NOT NULL AND email != ''
    `);
    
    for (let i = 0; i < rows.length; i++) {
        // Lấy ngày của đơn nợ cũ nhất để tính số ngày quá hạn (Nếu > 30 ngày)
        const [oldest] = await db.query(`
            SELECT DATEDIFF(NOW(), DATE_ADD(MIN(vd.ngay_tao), INTERVAL 30 DAY)) AS soNgayQuaHan
            FROM van_dons vd JOIN bookings bk ON vd.booking_id = bk.id JOIN bao_gias bg ON bk.bao_gia_id = bg.id
            WHERE bg.khach_hang_id = ? AND vd.hinh_thuc_thanh_toan = 'GHI_NO' AND vd.trang_thai_van_chuyen != 'CANCELLED' AND vd.trang_thai_thanh_toan != 'PAID'
        `, [rows[i].id]);
        
        rows[i].soNgayQuaHan = oldest[0]?.soNgayQuaHan > 0 ? oldest[0].soNgayQuaHan : 0;
    }
    return rows;
  },
  

  findByKhachHangId: async (khachHangId) => {
    // ... [Mã gốc hàm này giữ nguyên] ...
    const [khRows] = await db.query(`SELECT id, ten_cong_ty, han_muc_no_toi_da, tong_no_hien_tai FROM khach_hangs WHERE id = ?`, [khachHangId]);
    if (!khRows.length) return null;
    const kh = khRows[0];

    const [vanDonChuaTT] = await db.query(
      `SELECT
        vd.ma_van_don                AS vanDonId,
        vd.so_tien_chot_cuoi         AS giaTri,
        DATE_ADD(vd.ngay_tao, INTERVAL 30 DAY) AS ngayHetHanThanhToan,
        DATEDIFF(NOW(), DATE_ADD(vd.ngay_tao, INTERVAL 30 DAY)) AS soNgayQuaHan,
        COALESCE((SELECT SUM(so_tien_phan_bo) FROM phieu_thu_chi_tiets WHERE van_don_id = vd.ma_van_don), 0) AS daThu
       FROM van_dons vd
       JOIN bookings bk ON vd.booking_id = bk.id
       JOIN bao_gias bg ON bk.bao_gia_id = bg.id
       WHERE bg.khach_hang_id = ?
         AND vd.hinh_thuc_thanh_toan = 'GHI_NO'
         AND vd.trang_thai_van_chuyen != 'CANCELLED'
         AND vd.trang_thai_thanh_toan != 'PAID'
       ORDER BY vd.ngay_tao ASC`,
      [khachHangId]
    );

    const [lichSu] = await db.query(
      `SELECT pt.id AS maPhieuThu, pt.ngay_thu AS ngayThu, pt.hinh_thuc AS hinhThuc, ptct.so_tien_phan_bo AS soTienPhanBo
       FROM phieu_thus pt
       JOIN phieu_thu_chi_tiets ptct ON pt.id = ptct.phieu_thu_id
       WHERE pt.khach_hang_id = ? ORDER BY pt.ngay_thu DESC`,
      [khachHangId]
    );

    return {
      khachHangId: Number(kh.id), tenCongTy: kh.ten_cong_ty, hanMucCongNo: Number(kh.han_muc_no_toi_da), congNoHienTai: Number(kh.tong_no_hien_tai),
      conLaiDuocPhepNo: Number(kh.han_muc_no_toi_da) - Number(kh.tong_no_hien_tai),
      vanDonChuaTT: vanDonChuaTT.map(vd => ({
        vanDonId: vd.vanDonId, giaTri: Number(vd.giaTri), daThu: Number(vd.daThu),
        conLai: Number(vd.giaTri) - Number(vd.daThu), ngayHetHanThanhToan: vd.ngayHetHanThanhToan, soNgayQuaHan: Number(vd.soNgayQuaHan) 
      })),
      lichSuThanhToan: lichSu.map(ls => ({
        maPhieuThu: ls.maPhieuThu, ngayThu: ls.ngayThu, soTienPhanBo: Number(ls.soTienPhanBo), hinhThuc: ls.hinhThuc
      }))
    };
  },

  // 🚀 FIX LỖI XUẤT EXCEL: Nhận trực tiếp bộ lọc từ Frontend để xuất dữ liệu chính xác
  baoCaoCongNo: async ({ search, quaHan }) => {
    const params = [];
    let whereClause = `
      WHERE vd.trang_thai_van_chuyen != 'CANCELLED'
        AND vd.hinh_thuc_thanh_toan = 'GHI_NO'
        AND vd.trang_thai_thanh_toan != 'PAID'
        AND kh.loai_khach = 'B2B_DOANH_NGHIEP'
    `;

    if (search) {
      whereClause += ` AND kh.ten_cong_ty LIKE ?`;
      params.push(`%${search}%`);
    }

    if (quaHan === 'true' || quaHan === true) {
      whereClause += ` AND DATE_ADD(vd.ngay_tao, INTERVAL 30 DAY) < NOW()`;
    }

    const [rows] = await db.query(
      `SELECT
        kh.ten_cong_ty            AS tenCongTy,
        kh.nguoi_lien_he          AS nguoiLienHe,
        kh.so_dien_thoai          AS soDienThoai,
        vd.ma_van_don             AS vanDonId,
        vd.so_tien_chot_cuoi      AS giaTri,
        DATE_ADD(vd.ngay_tao, INTERVAL 30 DAY) AS ngayHetHan,
        COALESCE((SELECT SUM(so_tien_phan_bo) FROM phieu_thu_chi_tiets WHERE van_don_id = vd.ma_van_don), 0) AS daThu,
        DATEDIFF(NOW(), DATE_ADD(vd.ngay_tao, INTERVAL 30 DAY)) AS soNgayQuaHan
       FROM van_dons vd
       JOIN bookings bk ON vd.booking_id = bk.id
       JOIN bao_gias bg ON bk.bao_gia_id = bg.id
       JOIN khach_hangs kh ON bg.khach_hang_id = kh.id
       ${whereClause}
       ORDER BY kh.ten_cong_ty, ngayHetHan`,
      params
    );

    return rows.map(r => ({
      tenCongTy: r.tenCongTy, nguoiLienHe: r.nguoiLienHe, soDienThoai: r.soDienThoai,
      vanDonId: r.vanDonId, giaTri: Number(r.giaTri), daThu: Number(r.daThu),
      conLai: Number(r.giaTri) - Number(r.daThu), ngayHetHan: r.ngayHetHan,
      soNgayQuaHan: Number(r.soNgayQuaHan), isQuaHan: Number(r.soNgayQuaHan) > 0
    }));
  }
};

module.exports = CongNo;
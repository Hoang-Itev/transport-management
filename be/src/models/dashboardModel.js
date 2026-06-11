// src/models/dashboardModel.js
const db = require('../config/database');

const Dashboard = {
  tongQuan: async () => {
    // 1. Chỉ số Hôm nay
    const [homNay] = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM van_dons WHERE DATE(ngay_tao) = CURDATE() AND trang_thai_van_chuyen != 'CANCELLED') AS soVanDon,
        (SELECT COALESCE(SUM(so_tien_chot_cuoi), 0) FROM van_dons WHERE DATE(ngay_tao) = CURDATE() AND trang_thai_van_chuyen != 'CANCELLED') AS doanhThu,
        (SELECT COALESCE(SUM(so_tien_nhan_duoc), 0) FROM phieu_thus WHERE DATE(ngay_thu) = CURDATE()) AS dongTienThuVao
    `);

    // 2. Chỉ số Tháng này
    const [thangNay] = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM van_dons WHERE MONTH(ngay_tao) = MONTH(CURDATE()) AND YEAR(ngay_tao) = YEAR(CURDATE()) AND trang_thai_van_chuyen != 'CANCELLED') AS soVanDon,
        (SELECT COALESCE(SUM(so_tien_chot_cuoi), 0) FROM van_dons WHERE MONTH(ngay_tao) = MONTH(CURDATE()) AND YEAR(ngay_tao) = YEAR(CURDATE()) AND trang_thai_van_chuyen != 'CANCELLED') AS doanhThu,
        (SELECT COALESCE(SUM(so_tien_nhan_duoc), 0) FROM phieu_thus WHERE MONTH(ngay_thu) = MONTH(CURDATE()) AND YEAR(ngay_thu) = YEAR(CURDATE())) AS dongTienThuVao
    `);

    // 3. Tổng công nợ toàn hệ thống (Cực nhanh)
    const [congNo] = await db.query(`SELECT COALESCE(SUM(tong_no_hien_tai), 0) AS tongCongNo FROM khach_hangs WHERE loai_khach = 'B2B_DOANH_NGHIEP'`);

    // 4. Top 5 khách nhiều nợ nhất
    const [top5] = await db.query(`
      SELECT id AS khachHangId, ten_cong_ty AS tenCongTy, tong_no_hien_tai AS congNo
      FROM khach_hangs WHERE tong_no_hien_tai > 0 AND is_active = 1
      ORDER BY tong_no_hien_tai DESC LIMIT 5
    `);

    // 5. Biểu đồ 30 ngày gần nhất (Doanh thu cước chốt)
    const [bieu_do] = await db.query(`
      SELECT DATE(ngay_tao) AS ngay, COUNT(*) AS soVanDon, COALESCE(SUM(so_tien_chot_cuoi), 0) AS doanhThu
      FROM van_dons
      WHERE trang_thai_van_chuyen != 'CANCELLED' AND DATE(ngay_tao) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY DATE(ngay_tao) ORDER BY ngay ASC
    `);

    return {
      homNay: { soVanDon: Number(homNay[0].soVanDon), doanhThu: Number(homNay[0].doanhThu), dongTien: Number(homNay[0].dongTienThuVao) },
      thangNay: { soVanDon: Number(thangNay[0].soVanDon), doanhThu: Number(thangNay[0].doanhThu), dongTien: Number(thangNay[0].dongTienThuVao) },
      tongCongNo: Number(congNo[0].tongCongNo),
      top5KhachNhieuNo: top5.map(r => ({ khachHangId: r.khachHangId, tenCongTy: r.tenCongTy, congNo: Number(r.congNo) })),
      bieu_do_30_ngay: bieu_do.map(r => ({ ngay: new Date(r.ngay).toISOString().split('T')[0], soVanDon: Number(r.soVanDon), doanhThu: Number(r.doanhThu) }))
    };
  },


  doanhThu: async ({ thang, nam }) => {
    const now = new Date();
    const thangQuery = Number(thang) || now.getMonth() + 1;
    const namQuery = Number(nam) || now.getFullYear();

    const [tongHop] = await db.query(
      `SELECT COUNT(*) AS tongVanDon, COALESCE(SUM(so_tien_chot_cuoi), 0) AS tongDoanhThu
       FROM van_dons
       WHERE trang_thai_van_chuyen != 'CANCELLED'
         AND MONTH(ngay_tao) = ? AND YEAR(ngay_tao) = ?`,
      [thangQuery, namQuery]
    );

    const [chiTiet] = await db.query(
      `SELECT DATE(ngay_tao) AS ngay, COUNT(*) AS soVanDon, COALESCE(SUM(so_tien_chot_cuoi), 0) AS doanhThu
       FROM van_dons
       WHERE trang_thai_van_chuyen != 'CANCELLED'
         AND MONTH(ngay_tao) = ? AND YEAR(ngay_tao) = ?
       GROUP BY DATE(ngay_tao)
       ORDER BY ngay ASC`,
      [thangQuery, namQuery]
    );

    return {
      thang: thangQuery, nam: namQuery,
      tongDoanhThu: Number(tongHop[0].tongDoanhThu), tongVanDon: Number(tongHop[0].tongVanDon),
      chiTietTheoNgay: chiTiet.map(r => ({
        ngay: new Date(r.ngay).toISOString().split('T')[0], soVanDon: Number(r.soVanDon), doanhThu: Number(r.doanhThu)
      }))
    };
  }
};

module.exports = Dashboard;
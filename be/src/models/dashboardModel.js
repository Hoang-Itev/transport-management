const db = require('../config/database');

const Dashboard = {
  tongQuan: async () => {
    const today = new Date().toISOString().split('T')[0];
    const firstDayOfMonth = `${today.slice(0, 7)}-01`;

    // 1. Hôm nay (Dùng gia_tri theo chuẩn của bạn)
    const [homNay] = await db.query(
      `SELECT
        COUNT(*) AS soVanDon,
        COALESCE(SUM(vd.gia_tri), 0) AS doanhThu
       FROM van_dons vd
       WHERE vd.trang_thai != 'CANCELLED'
         AND DATE(vd.ngay_tao) = ?`,
      [today]
    );

    // 2. Tháng này
    const [thangNay] = await db.query(
      `SELECT
        COUNT(*) AS soVanDon,
        COALESCE(SUM(vd.gia_tri), 0) AS doanhThu
       FROM van_dons vd
       WHERE vd.trang_thai != 'CANCELLED'
         AND DATE(vd.ngay_tao) >= ?`,
      [firstDayOfMonth]
    );

    // 3. Tổng công nợ toàn hệ thống (Phải join để biết khách hàng)
    const [congNo] = await db.query(
      `SELECT COALESCE(SUM(vd.gia_tri), 0) AS tongCongNo
       FROM van_dons vd
       WHERE vd.trang_thai != 'CANCELLED'
         AND vd.trang_thai_thanh_toan != 'PAID'`
    );

    // 4. Top 5 khách nhiều nợ nhất (SỬA LẠI JOIN ĐÚNG SCHEMA CỦA BẠN)
    const [top5] = await db.query(
      `SELECT
        kh.id          AS khachHangId,
        kh.ten_cong_ty AS tenCongTy,
        COALESCE(SUM(vd.gia_tri), 0) AS congNo
       FROM khach_hangs kh
       JOIN bao_gias bg ON bg.khach_hang_id = kh.id
       JOIN bao_gia_chi_tiets ct ON ct.bao_gia_id = bg.id
       JOIN van_dons vd ON vd.bao_gia_chi_tiet_id = ct.id
       WHERE vd.trang_thai != 'CANCELLED'
         AND vd.trang_thai_thanh_toan != 'PAID'
       GROUP BY kh.id
       ORDER BY congNo DESC
       LIMIT 5`
    );

    // 5. Biểu đồ 30 ngày gần nhất
    const [bieu_do] = await db.query(
      `SELECT
        DATE(ngay_tao)             AS ngay,
        COUNT(*)                   AS soVanDon,
        COALESCE(SUM(gia_tri), 0)  AS doanhThu
       FROM van_dons
       WHERE trang_thai != 'CANCELLED'
         AND DATE(ngay_tao) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
       GROUP BY DATE(ngay_tao)
       ORDER BY ngay ASC`
    );

    return {
      homNay: {
        soVanDon:  Number(homNay[0].soVanDon),
        doanhThu:  Number(homNay[0].doanhThu)
      },
      thangNay: {
        soVanDon:  Number(thangNay[0].soVanDon),
        doanhThu:  Number(thangNay[0].doanhThu)
      },
      tongCongNo: Number(congNo[0].tongCongNo),
      top5KhachNhieuNo: top5.map(r => ({
        khachHangId: r.khachHangId,
        tenCongTy:   r.tenCongTy,
        congNo:      Number(r.congNo)
      })),
      bieu_do_30_ngay: bieu_do.map(r => ({
        ngay:      new Date(r.ngay).toISOString().split('T')[0],
        soVanDon:  Number(r.soVanDon),
        doanhThu:  Number(r.doanhThu)
      }))
    };
  },

  doanhThu: async ({ thang, nam }) => {
    const now        = new Date();
    const thangQuery = Number(thang) || now.getMonth() + 1;
    const namQuery   = Number(nam)   || now.getFullYear();

    const [tongHop] = await db.query(
      `SELECT
        COUNT(*) AS tongVanDon,
        COALESCE(SUM(gia_tri), 0) AS tongDoanhThu
       FROM van_dons
       WHERE trang_thai != 'CANCELLED'
         AND MONTH(ngay_tao) = ?
         AND YEAR(ngay_tao)  = ?`,
      [thangQuery, namQuery]
    );

    const [chiTiet] = await db.query(
      `SELECT
        DATE(ngay_tao)            AS ngay,
        COUNT(*)                  AS soVanDon,
        COALESCE(SUM(gia_tri), 0) AS doanhThu
       FROM van_dons
       WHERE trang_thai != 'CANCELLED'
         AND MONTH(ngay_tao) = ?
         AND YEAR(ngay_tao)  = ?
       GROUP BY DATE(ngay_tao)
       ORDER BY ngay ASC`,
      [thangQuery, namQuery]
    );

    return {
      thang:        thangQuery,
      nam:          namQuery,
      tongDoanhThu: Number(tongHop[0].tongDoanhThu),
      tongVanDon:   Number(tongHop[0].tongVanDon),
      chiTietTheoNgay: chiTiet.map(r => ({
        ngay:     new Date(r.ngay).toISOString().split('T')[0],
        soVanDon: Number(r.soVanDon),
        doanhThu: Number(r.doanhThu)
      }))
    };
  }
};

module.exports = Dashboard;
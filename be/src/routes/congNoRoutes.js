  const express = require('express');
  const router  = express.Router();
  const congNoController = require('../controllers/congNoController');
  const { verifyToken, authorize } = require('../middlewares/authMiddleware');

  router.use(verifyToken);

  // ⚠️ THỨ TỰ ROUTE RẤT QUAN TRỌNG ở file này:
  // Các route có path tĩnh (/xuat-bao-cao, /van-don-chua-thanh-toan)
  // PHẢI khai báo TRƯỚC route động (/:khachHangId)
  // Nếu không, Express khớp chuỗi tĩnh vào /:khachHangId → sai handler

  // ─── DANH SÁCH TỔNG HỢP CÔNG NỢ ────────────────────────────────────────────
  // Trả về tất cả khách hàng kèm tong_no_hien_tai & han_muc_no_toi_da
  router.get('/',
    authorize('MANAGER', 'KE_TOAN', 'SALE'),
    congNoController.getCongNo
  );

  // ─── XUẤT BÁO CÁO EXCEL/PDF ─────────────────────────────────────────────────
  router.get('/xuat-bao-cao',
    authorize('MANAGER', 'KE_TOAN'),
    congNoController.xuatBaoCao
  );

  // ─── DANH SÁCH VẬN ĐƠN CHƯA THANH TOÁN CỦA 1 KHÁCH ────────────────────────
  // Trả về các vận đơn UNPAID + PARTIAL kèm so_tien_con_lai từng cái.
  // Kế toán dùng màn hình này để tick chọn vận đơn khi tạo phiếu thu phân bổ.
  router.get('/van-don-chua-thanh-toan/:khachHangId',
    authorize('MANAGER', 'KE_TOAN', 'SALE'),
    congNoController.getVanDonChuaThanhToan
  );

  // ─── CÔNG NỢ CHI TIẾT THEO KHÁCH HÀNG ──────────────────────────────────────
  // Trả về lịch sử toàn bộ vận đơn + phiếu thu của 1 khách
  router.get('/:khachHangId',
    authorize('MANAGER', 'KE_TOAN', 'SALE'),
    congNoController.getCongNoByKhachHang
  );

  router.post('/nhac-no-toan-bo', authorize('MANAGER', 'KE_TOAN'), congNoController.guiMailNhacNoToanBo);

  module.exports = router;
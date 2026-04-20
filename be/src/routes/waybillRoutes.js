const express = require('express');
const router = express.Router();
const waybillController = require('../controllers/waybillController');
const { verifyToken, authorize } = require('../middlewares/authMiddleware');

// Route Internal API 
router.get('/confirmed', waybillController.getConfirmedWaybills);

// Các route bên dưới phải đăng nhập
router.use(verifyToken);

router.get('/', authorize('MANAGER', 'SALE', 'KE_TOAN'), waybillController.getWaybills);
router.post('/', authorize('MANAGER', 'SALE'), waybillController.createWaybill);

// Tuyến này lấy danh sách chờ
router.get('/pending', authorize('MANAGER', 'SALE', 'KE_TOAN'), waybillController.getPendingWaybills);

// ⚠️ MỚI THÊM: Route xuất PDF (Phải để trước route /:id nếu không nó tưởng "xuat-pdf" là cái ID vận đơn)
router.get('/:id/xuat-pdf', authorize('MANAGER', 'SALE', 'KE_TOAN'), waybillController.exportPdf);

// ⚠️ Tuyến lấy ID chi tiết
router.get('/:id', authorize('MANAGER', 'SALE', 'KE_TOAN'), waybillController.getWaybillById);

// Các thao tác nghiệp vụ
router.put('/:id/trong-luong-thuc-te', authorize('MANAGER', 'SALE'), waybillController.updateActualWeight);
router.post('/:id/huy', authorize('MANAGER', 'SALE'), waybillController.cancelWaybill);

module.exports = router;
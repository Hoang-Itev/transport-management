const express = require('express');
const router = express.Router();
const waybillController = require('../controllers/waybillController');
const { verifyToken, authorize } = require('../middlewares/authMiddleware');

// Route Internal API (Dùng API Key, không dùng Bearer Token chuẩn của User)
// Giả sử bạn có middleware checkApiKey, ở đây mình tạm bỏ qua bước check đó để test
router.get('/confirmed', waybillController.getConfirmedWaybills);

// Các route bên dưới phải đăng nhập
router.use(verifyToken);

router.get('/', authorize('MANAGER', 'SALE', 'KE_TOAN'), waybillController.getWaybills);
router.post('/', authorize('MANAGER', 'SALE'), waybillController.createWaybill);

// ⚠️ MỚI THÊM: Route lấy danh sách chờ (Bắt buộc phải nằm trên route /:id)
router.get('/pending', authorize('MANAGER', 'SALE', 'KE_TOAN'), waybillController.getPendingWaybills);

// ⚠️ Phải nằm dưới /confirmed
router.get('/:id', authorize('MANAGER', 'SALE', 'KE_TOAN'), waybillController.getWaybillById);

// Các thao tác nghiệp vụ
router.put('/:id/trong-luong-thuc-te', authorize('MANAGER', 'SALE'), waybillController.updateActualWeight);
router.post('/:id/huy', authorize('MANAGER', 'SALE'), waybillController.cancelWaybill);

module.exports = router;
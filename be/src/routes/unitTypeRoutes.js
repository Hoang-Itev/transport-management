const express = require('express');
const router = express.Router();
const unitTypeController = require('../controllers/unitTypeController');
const { verifyToken, authorize } = require('../middlewares/authMiddleware');

router.use(verifyToken);

// Ai cũng xem được để chọn lúc làm Báo giá
router.get('/', unitTypeController.getUnitTypes); 

// Chỉ MANAGER mới được thêm/sửa/xóa danh mục
router.post('/', authorize('MANAGER'), unitTypeController.createUnitType);
router.put('/:id', authorize('MANAGER'), unitTypeController.updateUnitType);
router.delete('/:id', authorize('MANAGER'), unitTypeController.deleteUnitType);

module.exports = router;
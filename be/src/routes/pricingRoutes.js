const express = require('express');
const router = express.Router();
const pricingController = require('../controllers/pricingController');
const { verifyToken, authorize } = require('../middlewares/authMiddleware');

router.use(verifyToken);

// 1. Tra giá: Phải nằm trên cùng
router.get('/tra-gia', authorize('MANAGER', 'SALE'), pricingController.lookupPrice);

// 2. Lấy danh sách
router.get('/', authorize('MANAGER', 'SALE'), pricingController.getPricings);

// 3. Lấy CHI TIẾT theo ID (Thêm dòng này vào nè)
// Phải nằm dưới /tra-gia để không bị tranh chấp route
router.get('/:id', authorize('MANAGER', 'SALE'), pricingController.getPricingById);

// 4. Các thao tác quản trị của MANAGER
router.post('/', authorize('MANAGER'), pricingController.createPricing);
router.put('/:id', authorize('MANAGER'), pricingController.updatePricing);
router.delete('/:id', authorize('MANAGER'), pricingController.deletePricing);

module.exports = router;
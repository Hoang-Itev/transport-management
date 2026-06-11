const express = require('express');
const router = express.Router();
const pricingController = require('../controllers/pricingController');
const { verifyToken, authorize } = require('../middlewares/authMiddleware');

router.use(verifyToken);

// 1. API TRA GIÁ TỰ ĐỘNG (Nằm trên cùng)
router.post('/tra-gia', authorize('MANAGER', 'SALE'), pricingController.lookupPrice);

// 2. NHÁNH BẢNG GIÁ LTL (HÀNG GHÉP THEO KM)
router.get('/ltl', authorize('MANAGER', 'SALE'), pricingController.getLtlPricings);
router.post('/ltl', authorize('MANAGER'), pricingController.createLtlPricing);
router.put('/ltl/:id', authorize('MANAGER'), pricingController.updateLtlPricing);
router.delete('/ltl/:id', authorize('MANAGER'), pricingController.deleteLtlPricing);

// 3. NHÁNH BẢNG GIÁ FTL (BAO XE)
router.get('/ftl', authorize('MANAGER', 'SALE'), pricingController.getFtlPricings);
router.post('/ftl', authorize('MANAGER'), pricingController.createFtlPricing);
router.put('/ftl/:id', authorize('MANAGER'), pricingController.updateFtlPricing);
router.delete('/ftl/:id', authorize('MANAGER'), pricingController.deleteFtlPricing);

// 4. NHÁNH CHIẾT KHẤU LTL (Gộp vào đây luôn cho gọn)
router.get('/chiet-khau-ltl', authorize('MANAGER', 'SALE'), pricingController.getLtlDiscounts);
router.post('/chiet-khau-ltl', authorize('MANAGER'), pricingController.createLtlDiscount);
router.put('/chiet-khau-ltl/:id', authorize('MANAGER'), pricingController.updateLtlDiscount);
router.delete('/chiet-khau-ltl/:id', authorize('MANAGER'), pricingController.deleteLtlDiscount);

// 5. NHÁNH MA TRẬN GIÁ PHỤ PHÍ (Bốc xếp, Lấy/Giao)
router.get('/phu-phi', authorize('MANAGER', 'SALE'), pricingController.getSurchargePricings);
router.post('/phu-phi', authorize('MANAGER'), pricingController.createSurchargePricing);
router.put('/phu-phi/:id', authorize('MANAGER'), pricingController.updateSurchargePricing);
router.delete('/phu-phi/:id', authorize('MANAGER'), pricingController.deleteSurchargePricing);

module.exports = router;
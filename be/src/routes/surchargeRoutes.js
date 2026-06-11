const express = require('express');
const router = express.Router();
const surchargeController = require('../controllers/surchargeController');
const { verifyToken, authorize } = require('../middlewares/authMiddleware');

router.use(verifyToken);

// ─── DANH MỤC PHỤ PHÍ (MASTER DATA) ─────────────────────────────────────────
// Ai cũng xem được để tick checkbox trên form báo giá / vận đơn
router.get('/',    surchargeController.getSurcharges);
router.get('/:id', surchargeController.getSurchargeById); // ← Thêm mới

// Chỉ MANAGER mới được thêm/sửa/xóa danh mục
router.post('/',    authorize('MANAGER'), surchargeController.createSurcharge);
router.put('/:id',  authorize('MANAGER'), surchargeController.updateSurcharge);
router.delete('/:id', authorize('MANAGER'), surchargeController.deleteSurcharge);

module.exports = router;
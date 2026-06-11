// src/routes/waybillRoutes.js
const express = require('express');
const router = express.Router();
const waybillController = require('../controllers/waybillController');
const { verifyToken, authorize } = require('../middlewares/authMiddleware');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

router.use(verifyToken);

// ─── XUẤT PDF ────────────────────────────────────────────────────────────────
router.get('/:id/export-pdf', authorize('MANAGER', 'SALE', 'KE_TOAN'), waybillController.exportPdf);

// ─── TẠO VẬN ĐƠN (2 LUỒNG) ───────────────────────────────────────────────────
router.post('/tu-bao-gia',  authorize('MANAGER', 'SALE'), waybillController.createFromQuotation);
router.post('/truc-tiep',   authorize('MANAGER', 'SALE'), waybillController.createDirectly);

// ─── VẬN HÀNH CHỐT SỐ LIỆU (Thủ kho cân thực tế) ─────────────────────────────
router.put( '/:id/chot-so-lieu', authorize('MANAGER', 'SALE', 'KE_TOAN'), waybillController.finalizeNumbers);
router.post('/:id/upload-pod',   authorize('MANAGER', 'SALE', 'KE_TOAN'), upload.single('podImage'), waybillController.uploadPod);
router.post('/:id/huy',          authorize('MANAGER', 'SALE'), waybillController.cancelWaybill);

router.post('/:id/gui-mail', authorize('MANAGER', 'SALE', 'KE_TOAN'), waybillController.sendWaybillEmailController);

// ─── XEM DANH SÁCH ────────────────────────────────────────────────────────────
// ⚠️ QUAN TRỌNG: /pending PHẢI khai báo TRƯỚC /:id
router.get('/pending', authorize('MANAGER', 'SALE', 'KE_TOAN'), waybillController.getPendingWaybills);
router.get('/',        authorize('MANAGER', 'SALE', 'KE_TOAN'), waybillController.getWaybills);
router.get('/:id',     authorize('MANAGER', 'SALE', 'KE_TOAN'), waybillController.getWaybillById);

module.exports = router;
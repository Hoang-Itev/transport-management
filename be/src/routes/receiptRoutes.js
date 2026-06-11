const express = require('express');
const router = express.Router();
const receiptController = require('../controllers/receiptController');
const { verifyToken, authorize } = require('../middlewares/authMiddleware');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

router.use(verifyToken);

// 1. AI OCR QUÉT BILL (Đặt trên cùng)
router.post('/scan-bill', authorize('MANAGER', 'KE_TOAN'), upload.single('billImage'), receiptController.scanBill);

// 2. THAO TÁC CƠ BẢN
router.get('/', authorize('MANAGER', 'KE_TOAN', 'SALE'), receiptController.getReceipts);
router.post('/', authorize('MANAGER', 'KE_TOAN'), receiptController.createReceipt); // Gồm cả mảng Phân Bổ

// 3. XUẤT PDF VÀ CHI TIẾT
router.get('/:id/xuat-pdf', authorize('MANAGER', 'KE_TOAN', 'SALE'), receiptController.exportPdf);
router.get('/:id', authorize('MANAGER', 'KE_TOAN', 'SALE'), receiptController.getReceiptById);

router.post('/:id/gui-mail', authorize('MANAGER', 'KE_TOAN'), receiptController.sendEmailManual);

module.exports = router;
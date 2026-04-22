const express = require('express');
const router = express.Router();
const receiptController = require('../controllers/receiptController');
const { verifyToken, authorize } = require('../middlewares/authMiddleware');


//phan ai scan
const multer = require('multer');
// Cấu hình Multer lưu ảnh vào bộ nhớ tạm (RAM)
const upload = multer({ storage: multer.memoryStorage() });



router.use(verifyToken);

router.get('/',     authorize('MANAGER', 'KE_TOAN', 'SALE'), receiptController.getReceipts);
router.post('/',   authorize('MANAGER', 'KE_TOAN'),         receiptController.createReceipt);

// 🚀 THÊM ROUTE NÀY (Nhớ đặt trước route /:id để tránh bị lầm lẫn param)
router.get('/:id/xuat-pdf', authorize('MANAGER', 'KE_TOAN', 'SALE'), receiptController.exportPdf);

router.get('/:id', authorize('MANAGER', 'KE_TOAN', 'SALE'), receiptController.getReceiptById);

// Thêm dòng định tuyến API này (đặt ngay DƯỚI các route POST khác)
router.post('/scan-bill', upload.single('billImage'), receiptController.scanBill);

module.exports = router;
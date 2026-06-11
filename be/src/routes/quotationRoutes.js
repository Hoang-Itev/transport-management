// src/routes/quotationRoutes.js
const express = require('express');
const router = express.Router();
const quotationController = require('../controllers/quotationController');
const { verifyToken, authorize } = require('../middlewares/authMiddleware');

// 1. Dùng cho AI (Không dính dáng đến ID)
router.post('/ai-phan-tich', verifyToken, authorize('MANAGER', 'SALE'), quotationController.analyzeZaloText);

// 2. Bảo mật toàn bộ các Route bên dưới
router.use(verifyToken, authorize('MANAGER', 'SALE'));

// 3. API Xuất PDF
router.get('/:id/xuat-pdf', quotationController.exportPdf);

// 4. Thao tác chuyển trạng thái
router.post('/:id/gui', quotationController.sendQuotation);
router.post('/:id/xac-nhan', quotationController.confirmQuotation);
router.post('/:id/tu-choi', quotationController.rejectQuotation);

// 5. CRUD Cơ bản
router.get('/',    quotationController.getQuotations);
router.post('/',   quotationController.createQuotation);
router.get('/:id', quotationController.getQuotationById);
router.put('/:id', quotationController.updateQuotation);
router.delete('/:id', quotationController.deleteQuotation);

module.exports = router;
const express = require('express');
const router = express.Router();
const quotationController = require('../controllers/quotationController');
const quotationDetailController = require('../controllers/quotationDetailController');
const { verifyToken, authorize } = require('../middlewares/authMiddleware');


router.get('/:id/xuat-pdf', quotationController.exportPdf); // 👈 Đưa lên đây!

// Áp dụng bảo mật cho toàn bộ file này
router.use(verifyToken, authorize('MANAGER', 'SALE'));

// --- CÁC API HÀNH ĐỘNG CỤ THỂ (PHẢI ĐẶT LÊN TRÊN) ---
router.post('/:id/gui', quotationController.sendQuotation);
router.post('/:id/xac-nhan', quotationController.confirmQuotation);
//cho xuat pdf


// --- MODULE CHI TIẾT BÁO GIÁ ---
router.post('/:id/chi-tiet', quotationDetailController.addDetail);
router.put('/:id/chi-tiet/:ctId', quotationDetailController.updateDetail);
router.delete('/:id/chi-tiet/:ctId', quotationDetailController.deleteDetail);

// --- CRUD CƠ BẢN (CÁI CÓ /:id ĐẶT XUỐNG DƯỚI CÙNG) ---
router.get('/', quotationController.getQuotations);
router.post('/', quotationController.createQuotation);
router.get('/:id', quotationController.getQuotationById);
router.put('/:id', quotationController.updateQuotation);

module.exports = router;
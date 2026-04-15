const express = require('express');
const router = express.Router();
const receiptController = require('../controllers/receiptController');
const { verifyToken, authorize } = require('../middlewares/authMiddleware');

router.use(verifyToken);

router.get('/',    authorize('MANAGER', 'KE_TOAN', 'SALE'), receiptController.getReceipts);
router.post('/',   authorize('MANAGER', 'KE_TOAN'),         receiptController.createReceipt);
router.get('/:id', authorize('MANAGER', 'KE_TOAN', 'SALE'), receiptController.getReceiptById);

module.exports = router;
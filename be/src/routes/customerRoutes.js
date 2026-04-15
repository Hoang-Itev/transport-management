const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { verifyToken, authorize } = require('../middlewares/authMiddleware');

// Áp dụng verifyToken cho TẤT CẢ các route ở dưới (không ai không đăng nhập mà được vào)
router.use(verifyToken);

// [GET] ALL (Đã qua verifyToken nên ai cũng xem được)
router.get('/', customerController.getCustomers);
router.get('/:id', customerController.getCustomerById);

// [POST, PUT] Chỉ MANAGER và SALE
router.post('/', authorize('MANAGER', 'SALE'), customerController.createCustomer);
router.put('/:id', authorize('MANAGER', 'SALE'), customerController.updateCustomer);

// [DELETE] Chỉ MANAGER
router.delete('/:id', authorize('MANAGER'), customerController.deleteCustomer);

module.exports = router;
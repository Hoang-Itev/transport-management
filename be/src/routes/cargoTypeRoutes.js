const express = require('express');
const router = express.Router();
const cargoTypeController = require('../controllers/cargoTypeController');
const { verifyToken, authorize } = require('../middlewares/authMiddleware');

// Mọi route đều cần đăng nhập
router.use(verifyToken);

// [GET] Ai cũng xem được
router.get('/', cargoTypeController.getCargoTypes);

// [POST, PUT, DELETE] Yêu cầu quyền MANAGER
router.post('/', authorize('MANAGER'), cargoTypeController.createCargoType);
router.put('/:id', authorize('MANAGER'), cargoTypeController.updateCargoType);
router.delete('/:id', authorize('MANAGER'), cargoTypeController.deleteCargoType);

module.exports = router;
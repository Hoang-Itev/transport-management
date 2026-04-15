const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken, authorize } = require('../middlewares/authMiddleware');

// Áp dụng bảo vệ kép cho TOÀN BỘ file này: Phải đăng nhập + Phải là MANAGER
router.use(verifyToken, authorize('MANAGER'));

router.get('/', userController.getUsers);
router.post('/', userController.createUser);
router.get('/:id', userController.getUserById);
router.put('/:id', userController.updateUser);
router.put('/:id/khoa', userController.toggleLock);

module.exports = router;
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middlewares/authMiddleware'); // Import bảo vệ

// 1. Route Đăng nhập (Công khai)
router.post('/login', authController.login);

// 2. Route Lấy thông tin cá nhân (Cần Token)
// Khi gọi GET /me, nó sẽ chạy qua verifyToken trước để kiểm tra vé
router.get('/me', verifyToken, authController.getMe);

// 3. Route Đăng xuất
router.post('/logout', authController.logout);

// Lưu ý: Đã xóa route /fix-admin để đảm bảo bảo mật cho hệ thống của bạn
module.exports = router;
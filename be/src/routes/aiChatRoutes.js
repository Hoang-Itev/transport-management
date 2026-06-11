// src/routes/aiChatRoutes.js
const express = require('express');
const router = express.Router();
const aiChatController = require('../controllers/aiChatController');
const { verifyToken, authorize } = require('../middlewares/authMiddleware');

// Chỉ cho phép Sếp, Sale và Kế toán chat với Database
router.post('/query', verifyToken, authorize('MANAGER', 'SALE', 'KE_TOAN'), aiChatController.chatWithDatabase);

module.exports = router;
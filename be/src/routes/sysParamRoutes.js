const express = require('express');
const router = express.Router();
const sysParamController = require('../controllers/sysParamController');
const { verifyToken, authorize } = require('../middlewares/authMiddleware');

router.use(verifyToken, authorize('MANAGER')); // Chỉ Manager được đổi luật

router.get('/', sysParamController.getParams);
router.put('/:maThamSo', sysParamController.updateParam);

module.exports = router;
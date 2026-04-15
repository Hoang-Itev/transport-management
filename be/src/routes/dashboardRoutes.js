const express    = require('express');
const router     = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { verifyToken, authorize } = require('../middlewares/authMiddleware');

router.use(verifyToken);
router.use(authorize('MANAGER'));

router.get('/tong-quan', dashboardController.getTongQuan);
router.get('/doanh-thu', dashboardController.getDoanhThu);

module.exports = router;
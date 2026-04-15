const express = require('express');
const router  = express.Router();
const congNoController = require('../controllers/congNoController');
const { verifyToken, authorize } = require('../middlewares/authMiddleware');

router.use(verifyToken);

// ⚠️ /xuat-bao-cao PHẢI khai báo TRƯỚC /:khachHangId
// nếu không Express hiểu "xuat-bao-cao" là 1 khachHangId
router.get('/',
  authorize('MANAGER', 'KE_TOAN', 'SALE'),
  congNoController.getCongNo
);

router.get('/xuat-bao-cao',
  authorize('MANAGER', 'KE_TOAN'),
  congNoController.xuatBaoCao
);

router.get('/:khachHangId',
  authorize('MANAGER', 'KE_TOAN', 'SALE'),
  congNoController.getCongNoByKhachHang
);

module.exports = router;

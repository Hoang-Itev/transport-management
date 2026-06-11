const express = require('express');
const router = express.Router();
const vehicleTypeController = require('../controllers/vehicleTypeController');
const { verifyToken, authorize } = require('../middlewares/authMiddleware');

router.use(verifyToken);

router.get('/', vehicleTypeController.getVehicles); // Ai cũng xem được để chọn báo giá
router.post('/', authorize('MANAGER'), vehicleTypeController.createVehicle);
router.put('/:id', authorize('MANAGER'), vehicleTypeController.updateVehicle);
router.delete('/:id', authorize('MANAGER'), vehicleTypeController.deleteVehicle);

module.exports = router;
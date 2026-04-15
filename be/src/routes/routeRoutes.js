const express = require('express');
const router = express.Router();
const routeController = require('../controllers/routeController');
const { verifyToken, authorize } = require('../middlewares/authMiddleware');

router.use(verifyToken);

router.get('/', routeController.getRoutes);
router.post('/', authorize('MANAGER'), routeController.createRoute);
router.put('/:id', authorize('MANAGER'), routeController.updateRoute);
router.delete('/:id', authorize('MANAGER'), routeController.deleteRoute);

module.exports = router;
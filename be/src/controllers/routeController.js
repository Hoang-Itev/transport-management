const Route = require('../models/routeModel');

const getRoutes = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', isActive } = req.query;
    const result = await Route.findAll({ page, limit, search, isActive });
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

const createRoute = async (req, res) => {
  try {
    const { tinhDi, tinhDen, km } = req.body;

    // 1. Kiểm tra đã tồn tại tuyến này chưa
    const existingRoute = await Route.findByEndpoints(tinhDi, tinhDen);
    if (existingRoute) {
      return res.status(409).json({ 
        success: false, 
        error: { code: 'TUYEN_DUONG_DA_TON_TAI', message: 'Tuyến đường này đã tồn tại trong hệ thống' } 
      });
    }

    const id = await Route.create({ tinhDi, tinhDen, km });
    res.status(201).json({ success: true, message: 'Thêm tuyến đường thành công', data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

const updateRoute = async (req, res) => {
  try {
    const { id } = req.params;
    const route = await Route.findById(id);
    if (!route) return res.status(404).json({ success: false, message: 'Không tìm thấy tuyến đường' });

    await Route.update(id, req.body);
    res.json({ success: true, message: 'Cập nhật tuyến đường thành công' });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

const deleteRoute = async (req, res) => {
  try {
    const { id } = req.params;
    const isUsed = await Route.checkInUse(id);
    if (isUsed) {
      return res.status(422).json({ 
        success: false, 
        error: { code: 'DANH_MUC_DANG_DUOC_SU_DUNG', message: 'Không thể xóa tuyến đường đang có bảng giá hiệu lực' } 
      });
    }

    await Route.softDelete(id);
    res.json({ success: true, message: 'Đã vô hiệu hóa tuyến đường' });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

module.exports = { getRoutes, createRoute, updateRoute, deleteRoute };
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

    // 1. Kiểm tra đã tồn tại tuyến này trong Database chưa (bất kể đang mở hay ngưng)
    const existingRoute = await Route.findByEndpoints(tinhDi, tinhDen);
    
    if (existingRoute) {
      // TRƯỜNG HỢP A: Tuyến đường đang hoạt động bình thường -> Báo lỗi trùng lặp
      if (existingRoute.is_active === 1 || existingRoute.is_active === true) {
        return res.status(409).json({ 
          success: false, 
          error: { code: 'TUYEN_DUONG_DA_TON_TAI', message: 'Tuyến đường này đã tồn tại trong hệ thống' } 
        });
      } 
      // TRƯỜNG HỢP B: Tuyến đường đã bị Xóa mềm (Ngưng hoạt động) -> Đánh thức nó dậy
      else {
        await Route.reactivate(existingRoute.id, km);
        return res.status(200).json({ 
          success: true, 
          message: 'Đã khôi phục tuyến đường cũ thành công', 
          data: { id: existingRoute.id } 
        });
      }
    }

    // 2. Nếu hoàn toàn mới tinh chưa từng tồn tại -> Tạo mới bình thường
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
    
    // Kiểm tra tồn tại trước
    const route = await Route.findById(id);
    if (!route) {
      return res.status(404).json({ success: false, error: { message: 'Không tìm thấy tuyến đường' } });
    }

    // Xóa dây chuyền (Tuyến đường + Bảng giá)
    await Route.softDelete(id);
    res.json({ success: true, message: 'Đã vô hiệu hóa tuyến đường và các bảng giá liên quan' });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

module.exports = { getRoutes, createRoute, updateRoute, deleteRoute };
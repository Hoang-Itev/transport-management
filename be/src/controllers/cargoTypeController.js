const CargoType = require('../models/cargoTypeModel');

// [GET] /api/v1/loai-hang
const getCargoTypes = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', isActive } = req.query;
    const result = await CargoType.findAll({ page, limit, search, isActive });
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// [POST] /api/v1/loai-hang
const createCargoType = async (req, res) => {
  try {
    const { ten, moTa } = req.body;
    if (!ten) {
      return res.status(400).json({ success: false, message: 'Tên loại hàng không được để trống' });
    }

    const id = await CargoType.create({ ten, moTa });
    res.status(201).json({ success: true, message: 'Thêm loại hàng thành công', data: { id } });
  } catch (error) {
    // Bắt lỗi trùng tên nếu bạn đã set UNIQUE cho cột 'ten' trong MySQL
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, error: { message: 'Tên loại hàng đã tồn tại' } });
    }
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// [PUT] /api/v1/loai-hang/:id
const updateCargoType = async (req, res) => {
  try {
    const { id } = req.params;
    const cargoType = await CargoType.findById(id);

    if (!cargoType) {
      return res.status(404).json({ success: false, error: { message: 'Không tìm thấy loại hàng' } });
    }

    await CargoType.update(id, req.body);
    res.json({ success: true, message: 'Cập nhật loại hàng thành công' });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// [DELETE] /api/v1/loai-hang/:id
const deleteCargoType = async (req, res) => {
  try {
    const { id } = req.params;
    
    const cargoType = await CargoType.findById(id);
    if (!cargoType) {
      return res.status(404).json({ success: false, error: { message: 'Không tìm thấy loại hàng' } });
    }

    // Nghiệp vụ: Chặn xóa nếu có Bảng giá đang sử dụng
    const isUsed = await CargoType.checkInUse(id);
    if (isUsed) {
      return res.status(422).json({ 
        success: false, 
        error: { code: 'DANH_MUC_DANG_DUOC_SU_DUNG', message: 'Không thể xóa! Loại hàng này đang được sử dụng trong một Bảng giá đang hoạt động.' } 
      });
    }

    await CargoType.softDelete(id);
    res.json({ success: true, message: 'Đã vô hiệu hóa loại hàng thành công' });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

module.exports = { getCargoTypes, createCargoType, updateCargoType, deleteCargoType };
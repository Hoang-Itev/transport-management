// src/controllers/vehicleTypeController.js
const VehicleType = require('../models/vehicleTypeModel');

const getVehicles = async (req, res) => {
  try {
    const data = await VehicleType.findAll();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

const createVehicle = async (req, res) => {
  try {
    const { id, tenHienThi, taiTrongMaxKg } = req.body;
    if (!id || !tenHienThi || !taiTrongMaxKg) {
      return res.status(400).json({ success: false, error: { message: 'Vui lòng nhập đủ ID, Tên và Tải trọng' } });
    }
    await VehicleType.create({ id, tenHienThi, taiTrongMaxKg });
    res.status(201).json({ success: true, message: 'Thêm loại xe thành công', data: { id } });
  } catch (error) {
    // Xử lý lỗi trùng khóa chính (ID)
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, error: { message: 'Mã loại xe (ID) này đã tồn tại!' } });
    }
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

const updateVehicle = async (req, res) => {
  try {
    await VehicleType.update(req.params.id, req.body);
    res.json({ success: true, message: 'Cập nhật loại xe thành công' });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

const deleteVehicle = async (req, res) => {
  try {
    await VehicleType.softDelete(req.params.id);
    res.json({ success: true, message: 'Đã vô hiệu hóa loại xe' });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

module.exports = { getVehicles, createVehicle, updateVehicle, deleteVehicle };
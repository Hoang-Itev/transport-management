// src/controllers/cargoTypeController.js
const CargoType = require('../models/cargoTypeModel');

const getCargoTypes = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', isActive } = req.query;
    const result = await CargoType.findAll({ page, limit, search, isActive });
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

const createCargoType = async (req, res) => {
  try {
    // FIX: Bổ sung cauHinhThuocTinh (Mảng JSON)
    const { tenLoai, heSoGia, cauHinhThuocTinh } = req.body;
    const id = await CargoType.create({ tenLoai, heSoGia: heSoGia || 1.00, cauHinhThuocTinh });
    res.status(201).json({ success: true, message: 'Thêm loại hàng thành công', data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

const updateCargoType = async (req, res) => {
  try {
    const { id } = req.params;
    // req.body chứa { tenLoai, heSoGia, cauHinhThuocTinh }
    await CargoType.update(id, req.body);
    res.json({ success: true, message: 'Cập nhật loại hàng thành công' });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

const deleteCargoType = async (req, res) => {
  try {
    await CargoType.softDelete(req.params.id);
    res.json({ success: true, message: 'Đã vô hiệu hóa loại hàng' });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

module.exports = { getCargoTypes, createCargoType, updateCargoType, deleteCargoType };
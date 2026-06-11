// src/controllers/surchargeController.js
const Surcharge = require('../models/surchargeModel');
const db = require('../config/database');

const getSurcharges = async (req, res) => {
  const data = await Surcharge.findAll();
  res.json({ success: true, data });
};

const createSurcharge = async (req, res) => {
  // 🚀 Nhận biến cachTinh từ Frontend thay vì loaiTinhPhi
  const { id, tenPhuPhi, cachTinh } = req.body;
  await Surcharge.create({ id, tenPhuPhi, cachTinh });
  res.status(201).json({ success: true, message: 'Thêm phụ phí thành công', data: { id } });
};

const updateSurcharge = async (req, res) => {
  await Surcharge.update(req.params.id, req.body);
  res.json({ success: true, message: 'Cập nhật phụ phí thành công' });
};

const deleteSurcharge = async (req, res) => {
  await Surcharge.softDelete(req.params.id);
  res.json({ success: true, message: 'Đã vô hiệu hóa phụ phí' });
};

const getSurchargeById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query('SELECT * FROM phu_phis WHERE id = ?', [id]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phụ phí' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getSurcharges, createSurcharge, updateSurcharge, deleteSurcharge, getSurchargeById };
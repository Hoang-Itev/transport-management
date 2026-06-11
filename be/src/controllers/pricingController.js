// src/controllers/pricingController.js
const PricingLTL = require('../models/pricingLtlModel');
const PricingFTL = require('../models/pricingFtlModel');
const PricingSurcharge = require('../models/pricingSurchargeModel');
const pricingEngine = require('../services/pricingEngine');


// ====================================
// NHÁNH LTL (HÀNG GHÉP THEO KHOẢNG CÁCH)
// ====================================
const getLtlPricings = async (req, res) => {
  try {
    const data = await PricingLTL.findAllPricings();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};
const createLtlPricing = async (req, res) => {
  try {
    const id = await PricingLTL.createPricing(req.body);
    res.status(201).json({ success: true, message: 'Cấu hình giá LTL thành công', data: { id } });
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }); }
};
const updateLtlPricing = async (req, res) => {
  try {
    await PricingLTL.updatePricing(req.params.id, req.body);
    res.json({ success: true, message: 'Cập nhật giá LTL thành công' });
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }); }
};
const deleteLtlPricing = async (req, res) => {
  try {
    await PricingLTL.softDeletePricing(req.params.id);
    res.json({ success: true, message: 'Đã vô hiệu hóa giá LTL' });
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }); }
};

// ====================================
// NHÁNH CHIẾT KHẤU SẢN LƯỢNG LTL
// ====================================
const getLtlDiscounts = async (req, res) => {
  try {
    const data = await PricingLTL.findAllDiscounts();
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }); }
};
const createLtlDiscount = async (req, res) => {
  try {
    const id = await PricingLTL.createDiscount(req.body);
    res.status(201).json({ success: true, message: 'Thêm mốc chiết khấu thành công', data: { id } });
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }); }
};
const updateLtlDiscount = async (req, res) => {
  try {
    await PricingLTL.updateDiscount(req.params.id, req.body);
    res.json({ success: true, message: 'Cập nhật mốc chiết khấu thành công' });
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }); }
};
const deleteLtlDiscount = async (req, res) => {
  try {
    await PricingLTL.deleteDiscount(req.params.id);
    res.json({ success: true, message: 'Đã xóa mốc chiết khấu' });
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }); }
};

// ====================================
// NHÁNH FTL (BAO XE THEO KM)
// ====================================
const getFtlPricings = async (req, res) => {
  try {
    const data = await PricingFTL.findAll(); // Sử dụng hàm findAll từ model FTL cũ của bạn
    res.json({ success: true, data: data.data });
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }); }
};
const createFtlPricing = async (req, res) => {
  try {
    const id = await PricingFTL.create(req.body);
    res.status(201).json({ success: true, message: 'Cấu hình giá FTL thành công', data: { id } });
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }); }
};
const updateFtlPricing = async (req, res) => {
  try {
    await PricingFTL.update(req.params.id, req.body);
    res.json({ success: true, message: 'Cập nhật giá FTL thành công' });
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }); }
};
const deleteFtlPricing = async (req, res) => {
  try {
    await PricingFTL.softDelete(req.params.id);
    res.json({ success: true, message: 'Đã vô hiệu hóa giá FTL' });
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }); }
};

// ====================================
// API TRA GIÁ TỰ ĐỘNG (Tra Cước Chính)
// ====================================
const lookupPrice = async (req, res) => {
  try {
    // Lưu ý: TinhDi và TinhDen đã bị loại bỏ, thay bằng soKmApi
    const { hinhThuc, soKmApi, loaiHangId, trongLuongKg, soLuong, thuocTinhChiTiet, loaiXeId } = req.body;

    let result = null;

    if (hinhThuc === 'LTL') {
       result = await pricingEngine.calculateLTL(soKmApi, loaiHangId, trongLuongKg, soLuong, thuocTinhChiTiet);
       if(!result) return res.status(404).json({ success: false, message: 'Khoảng cách Km này chưa được cấu hình bảng giá gốc' });
    } else if (hinhThuc === 'FTL') {
       result = await pricingEngine.calculateFTL(loaiXeId, soKmApi);
       if(!result) return res.status(404).json({ success: false, message: 'Loại xe hoặc số Km này chưa có cấu hình giá FTL' });
    } else {
       return res.status(400).json({ success: false, message: 'Hình thức tính giá (LTL/FTL) không hợp lệ' });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// Chưa bao gồm logic Phụ Phí (Bốc xếp/Giao nhận), bạn có thể thêm model Surcharge vào sau.

const getSurchargePricings = async (req, res) => {
  try {
    const data = await PricingSurcharge.findAll();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

const createSurchargePricing = async (req, res) => {
  try {
    const id = await PricingSurcharge.create(req.body);
    res.status(201).json({ success: true, message: 'Cấu hình giá phụ phí thành công', data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

const updateSurchargePricing = async (req, res) => {
  try {
    await PricingSurcharge.update(req.params.id, req.body);
    res.json({ success: true, message: 'Cập nhật giá phụ phí thành công' });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

const deleteSurchargePricing = async (req, res) => {
  try {
    await PricingSurcharge.delete(req.params.id);
    res.json({ success: true, message: 'Đã xóa giá phụ phí' });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// Cập nhật lại cục module.exports cuối file:
module.exports = { 
  getLtlPricings, createLtlPricing, updateLtlPricing, deleteLtlPricing,
  getLtlDiscounts, createLtlDiscount, updateLtlDiscount, deleteLtlDiscount,
  getFtlPricings, createFtlPricing, updateFtlPricing, deleteFtlPricing,
  getSurchargePricings, createSurchargePricing, updateSurchargePricing, deleteSurchargePricing, // Bổ sung nhánh này
  lookupPrice
};
const Pricing = require('../models/pricingModel');

const getPricings = async (req, res) => {
  try {
    const { page, limit, tuyenDuongId, loaiHangId, isActive } = req.query;
    const result = await Pricing.findAll({ page, limit, tuyenDuongId, loaiHangId, isActive });
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

const createPricing = async (req, res) => {
  try {
    const { tuyenDuongId, loaiHangId, kgTu, kgDen, donGia, ngayApDung, ngayHetHan } = req.body;

    // Check Overlap
    const isOverlap = await Pricing.checkOverlap(tuyenDuongId, loaiHangId, kgTu, kgDen, ngayApDung, ngayHetHan);
    if (isOverlap) {
      return res.status(409).json({ 
        success: false, 
        error: { code: 'BANG_GIA_OVERLAP', message: 'Khoảng giá hoặc thời gian bị trùng lặp với bảng giá đang hoạt động' } 
      });
    }

    const id = await Pricing.create(req.body);
    res.status(201).json({ success: true, message: 'Thêm bảng giá thành công', data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

const updatePricing = async (req, res) => {
  try {
    const { id } = req.params;
    const { tuyenDuongId, loaiHangId, kgTu, kgDen, donGia, ngayApDung, ngayHetHan } = req.body;

    const pricing = await Pricing.findById(id);
    if (!pricing) return res.status(404).json({ success: false, message: 'Không tìm thấy bảng giá' });

    // Check Overlap (loại trừ chính nó)
    const isOverlap = await Pricing.checkOverlap(tuyenDuongId, loaiHangId, kgTu, kgDen, ngayApDung, ngayHetHan, id);
    if (isOverlap) {
      return res.status(409).json({ 
        success: false, 
        error: { code: 'BANG_GIA_OVERLAP', message: 'Khoảng giá hoặc thời gian bị trùng lặp' } 
      });
    }

    await Pricing.update(id, req.body);
    res.json({ success: true, message: 'Cập nhật bảng giá thành công' });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

const deletePricing = async (req, res) => {
  try {
    await Pricing.softDelete(req.params.id);
    res.json({ success: true, message: 'Đã vô hiệu hóa bảng giá' });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// --- API CHUYÊN BIỆT ĐỂ TRA GIÁ ---
const lookupPrice = async (req, res) => {
  try {
    const { tuyenDuongId, loaiHangId, trongLuong } = req.query;

    if (!tuyenDuongId || !loaiHangId || !trongLuong) {
      return res.status(400).json({ success: false, message: 'Thiếu tham số tra giá' });
    }

    const price = await Pricing.lookupPrice(tuyenDuongId, loaiHangId, trongLuong);
    
    if (!price) {
      return res.status(404).json({ 
        success: false, 
        error: { code: 'GIA_KHONG_TIM_THAY', message: 'Không tìm thấy bảng giá phù hợp với trọng lượng này' } 
      });
    }

    res.json({ success: true, data: price });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

const getPricingById = async (req, res) => {
  try {
    const { id } = req.params;
    const pricing = await Pricing.findById(id);
    if (!pricing) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bảng giá' });
    }
    res.json({ success: true, data: pricing });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};



module.exports = { getPricings, createPricing, updatePricing, deletePricing, lookupPrice, getPricingById };
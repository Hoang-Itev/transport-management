const QuotationDetail = require('../models/quotationDetailModel');
const Quotation = require('../models/quotationModel'); // Để check trạng thái DRAFT
const Pricing = require('../models/pricingModel'); // Để tra giá

// Helper check trạng thái DRAFT (Tránh lặp code)
const checkDraftStatus = async (baoGiaId, res) => {
  const quotation = await Quotation.findById(baoGiaId);
  if (!quotation) {
    res.status(404).json({ success: false, message: 'Không tìm thấy báo giá' });
    return null;
  }
  if (quotation.trang_thai !== 'DRAFT') {
    res.status(422).json({ 
      success: false, 
      error: { code: 'KHONG_THE_THAO_TAC', message: 'Chỉ được thay đổi chi tiết khi báo giá ở trạng thái DRAFT' } 
    });
    return null;
  }
  return quotation;
};

// POST: Thêm 1 dòng chi tiết
const addDetail = async (req, res) => {
  try {
    const baoGiaId = req.params.id;
    const { tuyenDuongId, loaiHangId, diaChiLayHang, diaChiGiaoHang, trongLuong, ghiChu } = req.body;

    if (!await checkDraftStatus(baoGiaId, res)) return;

    // Tra giá
    const priceResult = await Pricing.lookupPrice(tuyenDuongId, loaiHangId, trongLuong);
    if (!priceResult) {
      return res.status(404).json({ success: false, error: { code: 'GIA_KHONG_TIM_THAY', message: 'Không tìm thấy bảng giá phù hợp' } });
    }

    const donGiaApDung = priceResult.donGia;
    const thanhTien = Number(donGiaApDung) * Number(trongLuong);

    const result = await QuotationDetail.addDetailWithTransaction(baoGiaId, {
      tuyenDuongId, loaiHangId, diaChiLayHang, diaChiGiaoHang, trongLuong, donGiaApDung, thanhTien, ghiChu
    });

    res.status(201).json({ success: true, message: 'Thêm chi tiết thành công', data: { newDetailId: result.detailId, tongGiaTriMoi: result.newTotal } });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// PUT: Sửa 1 dòng chi tiết
const updateDetail = async (req, res) => {
  try {
    const { id: baoGiaId, ctId: detailId } = req.params;
    const { tuyenDuongId, loaiHangId, diaChiLayHang, diaChiGiaoHang, trongLuong, ghiChu } = req.body;

    if (!await checkDraftStatus(baoGiaId, res)) return;

    const existingDetail = await QuotationDetail.findById(detailId);
    if (!existingDetail || existingDetail.bao_gia_id !== Number(baoGiaId)) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy dòng chi tiết này trong báo giá' });
    }

    // Tra giá lại vì có thể người dùng đã đổi Cân nặng hoặc Tuyến đường
    const priceResult = await Pricing.lookupPrice(tuyenDuongId, loaiHangId, trongLuong);
    if (!priceResult) {
      return res.status(404).json({ success: false, error: { code: 'GIA_KHONG_TIM_THAY', message: 'Không tìm thấy bảng giá phù hợp' } });
    }

    const donGiaApDung = priceResult.donGia;
    const thanhTien = Number(donGiaApDung) * Number(trongLuong);

    const newTotal = await QuotationDetail.updateDetailWithTransaction(baoGiaId, detailId, {
      tuyenDuongId, loaiHangId, diaChiLayHang, diaChiGiaoHang, trongLuong, donGiaApDung, thanhTien, ghiChu
    });

    res.json({ success: true, message: 'Cập nhật chi tiết thành công', data: { tongGiaTriMoi: newTotal } });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// DELETE: Xóa 1 dòng chi tiết
const deleteDetail = async (req, res) => {
  try {
    const { id: baoGiaId, ctId: detailId } = req.params;

    if (!await checkDraftStatus(baoGiaId, res)) return;

    const existingDetail = await QuotationDetail.findById(detailId);
    if (!existingDetail || existingDetail.bao_gia_id !== Number(baoGiaId)) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy dòng chi tiết' });
    }

    const newTotal = await QuotationDetail.deleteDetailWithTransaction(baoGiaId, detailId);

    res.json({ success: true, message: 'Đã xóa dòng chi tiết', data: { tongGiaTriMoi: newTotal } });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

module.exports = { addDetail, updateDetail, deleteDetail };
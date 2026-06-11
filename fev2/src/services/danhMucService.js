// src/services/danhMucService.js
import axiosClient from './axiosClient';

export const danhMucService = {

  // ========================================================
  // NHÓM 1: CÁC DANH MỤC LÕI (MASTER DATA)
  // ========================================================
  
  // 1. Loại hàng hóa
  getLoaiHangList: (params) => axiosClient.get('/danh-muc/loai-hang', { params }),
  createLoaiHang: (data) => axiosClient.post('/danh-muc/loai-hang', data),
  updateLoaiHang: (id, data) => axiosClient.put(`/danh-muc/loai-hang/${id}`, data),
  deleteLoaiHang: (id) => axiosClient.delete(`/danh-muc/loai-hang/${id}`),

  // 2. Loại xe tải
  getLoaiXeList: () => axiosClient.get('/danh-muc/loai-xe'),
  createLoaiXe: (data) => axiosClient.post('/danh-muc/loai-xe', data),
  updateLoaiXe: (id, data) => axiosClient.put(`/danh-muc/loai-xe/${id}`, data),
  deleteLoaiXe: (id) => axiosClient.delete(`/danh-muc/loai-xe/${id}`),

  // 3. Phụ phí (Chỉ là định nghĩa Tên và Cách tính)
  getPhuPhiList: () => axiosClient.get('/danh-muc/phu-phi'),
  createPhuPhi: (data) => axiosClient.post('/danh-muc/phu-phi', data),
  updatePhuPhi: (id, data) => axiosClient.put(`/danh-muc/phu-phi/${id}`, data),
  deletePhuPhi: (id) => axiosClient.delete(`/danh-muc/phu-phi/${id}`),

  // 4. Đơn vị tính (MỚI THÊM)
  getDonViTinhList: () => axiosClient.get('/danh-muc/don-vi-tinh'),
  createDonViTinh: (data) => axiosClient.post('/danh-muc/don-vi-tinh', data),
  updateDonViTinh: (id, data) => axiosClient.put(`/danh-muc/don-vi-tinh/${id}`, data),
  deleteDonViTinh: (id) => axiosClient.delete(`/danh-muc/don-vi-tinh/${id}`),


  // ========================================================
  // NHÓM 2: CẤU HÌNH HỆ THỐNG & BẢNG GIÁ
  // ========================================================
  
  // 5. Tham số hệ thống
  getThamSoList: () => axiosClient.get('/tham-so'),
  updateThamSo: (maThamSo, data) => axiosClient.put(`/tham-so/${maThamSo}`, data),

  // 6. Bảng giá LTL (Hàng ghép theo Km)
  getBangGiaLTL: (params) => axiosClient.get('/bang-gia/ltl', { params }),
  createBangGiaLTL: (data) => axiosClient.post('/bang-gia/ltl', data),
  updateBangGiaLTL: (id, data) => axiosClient.put(`/bang-gia/ltl/${id}`, data),
  deleteBangGiaLTL: (id) => axiosClient.delete(`/bang-gia/ltl/${id}`),

  // 7. Chiết khấu sản lượng LTL (MỚI THÊM)
  getChietKhauLTL: (params) => axiosClient.get('/bang-gia/chiet-khau-ltl', { params }),
  createChietKhauLTL: (data) => axiosClient.post('/bang-gia/chiet-khau-ltl', data),
  updateChietKhauLTL: (id, data) => axiosClient.put(`/bang-gia/chiet-khau-ltl/${id}`, data),
  deleteChietKhauLTL: (id) => axiosClient.delete(`/bang-gia/chiet-khau-ltl/${id}`),

  // 8. Bảng giá FTL (Bao xe)
  getBangGiaFTL: (params) => axiosClient.get('/bang-gia/ftl', { params }),
  createBangGiaFTL: (data) => axiosClient.post('/bang-gia/ftl', data),
  updateBangGiaFTL: (id, data) => axiosClient.put(`/bang-gia/ftl/${id}`, data),
  deleteBangGiaFTL: (id) => axiosClient.delete(`/bang-gia/ftl/${id}`),

  // 9. Ma trận Bảng giá Phụ phí (MỚI THÊM)
  getBangGiaPhuPhi: (params) => axiosClient.get('/bang-gia/phu-phi', { params }),
  createBangGiaPhuPhi: (data) => axiosClient.post('/bang-gia/phu-phi', data),
  updateBangGiaPhuPhi: (id, data) => axiosClient.put(`/bang-gia/phu-phi/${id}`, data),
  deleteBangGiaPhuPhi: (id) => axiosClient.delete(`/bang-gia/phu-phi/${id}`),

  // 10. Tra giá tự động (API tính tiền cho form Báo giá)
  traGia: (payload) => axiosClient.post('/bang-gia/tra-gia', payload),


  // ========================================================
  // NHÓM 3: NGƯỜI DÙNG
  // ========================================================
  getNguoiDungList: (params) => axiosClient.get('/nguoi-dung', { params }),
  createNguoiDung: (data) => axiosClient.post('/nguoi-dung', data),
  updateNguoiDung: (id, data) => axiosClient.put(`/nguoi-dung/${id}`, data),
  khoaNguoiDung: (id) => axiosClient.put(`/nguoi-dung/${id}/khoa`),
};
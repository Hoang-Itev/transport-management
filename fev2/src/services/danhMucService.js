import axiosClient from './axiosClient';

export const danhMucService = {
  // --- LOẠI HÀNG ---
  getLoaiHangList: (params) => axiosClient.get('/loai-hang', { params }),
  createLoaiHang: (data) => axiosClient.post('/loai-hang', data),
  updateLoaiHang: (id, data) => axiosClient.put(`/loai-hang/${id}`, data),
  deleteLoaiHang: (id) => axiosClient.delete(`/loai-hang/${id}`),

  // --- TUYẾN ĐƯỜNG ---
  getTuyenDuongList: (params) => axiosClient.get('/tuyen-duong', { params }),
  createTuyenDuong: (data) => axiosClient.post('/tuyen-duong', data),
  updateTuyenDuong: (id, data) => axiosClient.put(`/tuyen-duong/${id}`, data),
  deleteTuyenDuong: (id) => axiosClient.delete(`/tuyen-duong/${id}`),

  // --- BẢNG GIÁ CƯỚC ---
  getBangGiaList: (params) => axiosClient.get('/bang-gia', { params }),
  createBangGia: (data) => axiosClient.post('/bang-gia', data),
  updateBangGia: (id, data) => axiosClient.put(`/bang-gia/${id}`, data),
  deleteBangGia: (id) => axiosClient.delete(`/bang-gia/${id}`),
  traGia: (params) => axiosClient.get('/bang-gia/tra-gia', { params }),

  // --- NGƯỜI DÙNG ---
  getNguoiDungList: (params) => axiosClient.get('/nguoi-dung', { params }),
  createNguoiDung: (data) => axiosClient.post('/nguoi-dung', data),
  updateNguoiDung: (id, data) => axiosClient.put(`/nguoi-dung/${id}`, data),
  khoaNguoiDung: (id) => axiosClient.put(`/nguoi-dung/${id}/khoa`),
};
// src/services/baoGiaService.js
import axiosClient from './axiosClient';

export const baoGiaService = {
  // 🚀 AI Bóc tách Zalo
  aiPhanTichZalo: (text) => axiosClient.post('/bao-gia/ai-phan-tich', { text }),

  getList: (params) => axiosClient.get('/bao-gia', { params }),
  getById: (id) => axiosClient.get(`/bao-gia/${id}`),
  create: (data) => axiosClient.post('/bao-gia', data), // Đã bao gồm cả mảng bookings
  update: (id, data) => axiosClient.put(`/bao-gia/${id}`, data), // Cập nhật nguyên cục
  
  // Chuyển trạng thái
  guiBaoGia: (id) => axiosClient.post(`/bao-gia/${id}/gui`),
  xacNhan: (id, payload) => axiosClient.post(`/bao-gia/${id}/xac-nhan`, payload),
  tuChoi: (id, payload) => axiosClient.post(`/bao-gia/${id}/tu-choi`, payload),
  
  // Xóa báo giá (Chỉ dành cho DRAFT)
  delete: (id) => axiosClient.delete(`/bao-gia/${id}`),

  sendEmail: (id) => axiosClient.post(`/bao-gia/${id}/gui-email`),

  exportPdf: async (id) => {
    const response = await axiosClient.get(`/bao-gia/${id}/xuat-pdf`, { responseType: 'blob' });
    const fileData = response.data ? response.data : response;
    const blob = new Blob([fileData], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `BaoGia_${id}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
};
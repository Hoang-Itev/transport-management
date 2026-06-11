// src/services/congNoService.js
import axiosClient from './axiosClient';

export const congNoService = {
  getList: (params) => axiosClient.get('/cong-no', { params }),
  getDetail: (khachHangId) => axiosClient.get(`/cong-no/${khachHangId}`),
  
  // 🚀 Thêm API lấy riêng danh sách các dòng Vận đơn chưa thanh toán để đổ vào bảng lập Phiếu Thu
  getVanDonChuaThanhToan: (khachHangId) => axiosClient.get(`/cong-no/van-don-chua-thanh-toan/${khachHangId}`),
  
  exportExcel: async (params) => {
    const response = await axiosClient.get('/cong-no/xuat-bao-cao', { 
      params, 
      responseType: 'blob' 
    });
    
    const url = window.URL.createObjectURL(new Blob([response]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Bao_Cao_Cong_No_${params.thang || ''}_${params.nam || ''}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },
  guiMailNhacNoToanBo: () => axiosClient.post('/cong-no/nhac-no-toan-bo')
};
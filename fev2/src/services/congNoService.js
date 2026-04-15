import axiosClient from './axiosClient';

export const congNoService = {
  getList: (params) => axiosClient.get('/cong-no', { params }),
  getDetail: (khachHangId) => axiosClient.get(`/cong-no/${khachHangId}`),
  
  exportExcel: async (params) => {
    const response = await axiosClient.get('/cong-no/xuat-bao-cao', { 
      params, 
      responseType: 'blob' // Bắt buộc để tải file PDF/Excel
    });
    
    // Logic tự động tải file xuống trình duyệt
    const url = window.URL.createObjectURL(new Blob([response]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Bao_Cao_Cong_No_${params.thang || ''}_${params.nam || ''}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
};
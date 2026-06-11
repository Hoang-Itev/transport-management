import axiosClient from './axiosClient';

export const phieuThuService = {
  getList: (params) => axiosClient.get('/phieu-thu', { params }),
  getById: (id) => axiosClient.get(`/phieu-thu/${id}`),
  create: (data) => axiosClient.post('/phieu-thu', data),

  // 🚀 API AI QUÉT BILL
  scanBill: (formData) => axiosClient.post('/phieu-thu/scan-bill', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),

  // 🚀 BỔ SUNG THÊM DÒNG NÀY: Để UI gọi được nút Gửi Email
  sendEmail: (id) => axiosClient.post(`/phieu-thu/${id}/gui-mail`),

  exportPdf: async (id) => {
    try {
      // Đổi chữ 'van-don' thành 'phieu-thu'
      const response = await axiosClient.get(`/phieu-thu/${id}/xuat-pdf`, { 
        responseType: 'blob' 
      });

      const blobData = response.data ? response.data : response;

      if (blobData.type && blobData.type.includes('application/json')) {
        const text = await blobData.text();
        const errorData = JSON.parse(text);
        throw new Error(errorData.message || errorData.error?.message || 'Lỗi hệ thống khi tạo PDF');
      }

      const blob = new Blob([blobData], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Đổi tên file tải về cho đúng chuẩn Phiếu Thu
      link.setAttribute('download', `PhieuThu-PT${id}.pdf`); 
      
      document.body.appendChild(link);
      link.click();
      
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      throw error; 
    }
  },
};
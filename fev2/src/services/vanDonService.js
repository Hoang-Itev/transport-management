// src/services/vanDonService.js
import axiosClient from './axiosClient';

export const vanDonService = {
  getList: (params) => axiosClient.get('/van-don', { params }),
  getById: (id) => axiosClient.get(`/van-don/${id}`),
  getPendingList: () => axiosClient.get('/van-don/pending'),
  
  // Luồng tạo vận đơn 1 chạm
  createFromQuotation: (data) => axiosClient.post('/van-don/tu-bao-gia', data),
  createDirectly: (data) => axiosClient.post('/van-don/truc-tiep', data),
  
  // Vận hành chốt thông tin liên hệ, hình thức TT & số liệu cân đo thực tế
  chotSoLieu: (id, payload) => axiosClient.put(`/van-don/${id}/chot-so-lieu`, payload),
  huyVanDon: (id, lyDoHuy) => axiosClient.post(`/van-don/${id}/huy`, { lyDoHuy }),
  
  // Cập nhật lộ trình xe chạy
  updateStatus: (id, trangThai) => axiosClient.put(`/van-don/${id}/trang-thai`, { trang_thai_van_chuyen: trangThai }),

  // 🚀 BỔ SUNG THÊM HÀM NÀY: Để màn hình Detail gọi được nút "Gửi Email Cho Khách" mà không bị báo lỗi function
  sendEmail: (id) => axiosClient.post(`/van-don/${id}/gui-mail`),

  // Tải ảnh bằng chứng POD
  uploadPod: (id, formData) => axiosClient.post(`/van-don/${id}/upload-pod`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),

  exportPdf: async (id) => {
    try {
      // 🚀 ĐỒNG BỘ ROUTE: Đổi từ 'xuat-pdf' sang 'export-pdf' cho khớp chuẩn API Backend ở file Controller
      const response = await axiosClient.get(`/van-don/${id}/export-pdf`, { responseType: 'blob' });
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
      link.setAttribute('download', `VanDon-${id}.pdf`); 
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      throw error; 
    }
  },
};
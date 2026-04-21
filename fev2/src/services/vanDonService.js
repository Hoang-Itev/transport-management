import axiosClient from './axiosClient';

export const vanDonService = {
  getList: (params) => axiosClient.get('/van-don', { params }),
  getById: (id) => axiosClient.get(`/van-don/${id}`),
  create: (data) => axiosClient.post('/van-don', data),
  
  // ---> THÊM DÒNG NÀY: Lấy danh sách chờ tạo VĐ
  getPendingList: () => axiosClient.get('/van-don/pending'),
  
  // updateTrongLuong: (id, trongLuongThucTe) => {
  //   return axiosClient.put(`/van-don/${id}/trong-luong-thuc-te`, { trongLuongThucTe });
  // },

  // Đổi hàm cũ thành hàm này
  update: (id, payload) => {
    return axiosClient.put(`/van-don/${id}`, payload);
  },
  huyVanDon: (id, lyDoHuy) => {
    return axiosClient.post(`/van-don/${id}/huy`, { lyDoHuy });
  },

 exportPdf: async (id) => {
    try {
      // 1. Ép axios phải nhận dữ liệu dưới dạng thô (blob)
      const response = await axiosClient.get(`/van-don/${id}/xuat-pdf`, { 
        responseType: 'blob' 
      });

      // Tùy thuộc vào cấu hình interceptor của file axiosClient, 
      // dữ liệu trả về có thể nằm ở 'response' hoặc 'response.data'
      const blobData = response.data ? response.data : response;

      // 2. CHECK LỖI BACKEND: Nếu file trả về là JSON (lỗi) chứ không phải PDF
      if (blobData.type && blobData.type.includes('application/json')) {
        // Đọc blob đó thành text JSON để lấy câu chửi của Backend
        const text = await blobData.text();
        const errorData = JSON.parse(text);
        throw new Error(errorData.message || errorData.error?.message || 'Lỗi hệ thống khi tạo PDF');
      }

      // 3. TẠO FILE PDF THÀNH CÔNG
      const blob = new Blob([blobData], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `VanDon-${id}.pdf`); // Tên file tải về
      
      document.body.appendChild(link);
      link.click();
      
      // Dọn dẹp
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      // Quăng lỗi ra ngoài cho component (VanDonDetail/VanDonPage) bắt và hiển thị message.error
      throw error; 
    }
  },
};
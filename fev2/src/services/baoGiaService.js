import axiosClient from './axiosClient';

export const baoGiaService = {
  getList: (params) => axiosClient.get('/bao-gia', { params }),
  getById: (id) => axiosClient.get(`/bao-gia/${id}`),
  create: (data) => axiosClient.post('/bao-gia', data),
  update: (id, data) => axiosClient.put(`/bao-gia/${id}`, data),
  
  // Chuyển trạng thái
  guiBaoGia: (id) => axiosClient.post(`/bao-gia/${id}/gui`),
  xacNhan: (id, payload) => axiosClient.post(`/bao-gia/${id}/xac-nhan`, payload), // payload: { trangThai, lyDo }
  
  // Thao tác chi tiết (khi sửa Báo giá DRAFT)
  addChiTiet: (id, data) => axiosClient.post(`/bao-gia/${id}/chi-tiet`, data),
  deleteChiTiet: (id, ctId) => axiosClient.delete(`/bao-gia/${id}/chi-tiet/${ctId}`),

  exportPdf: async (id) => {
    // 1. Gọi API lấy luồng file
    const response = await axiosClient.get(`/bao-gia/${id}/xuat-pdf`, {
      responseType: 'blob' // Ép kiểu nhận về tệp tin
    });

    // 2. Tùy thuộc vào cấu hình axiosClient, dữ liệu file có thể nằm ở response hoặc response.data
    // Dòng này giúp bắt chuẩn xác cục dữ liệu file ở bất kỳ trường hợp nào!
    const fileData = response.data ? response.data : response;

    // 3. Đóng gói lại thành Blob chuẩn PDF
    const blob = new Blob([fileData], { type: 'application/pdf' });

    // 4. Tạo link tải ngầm và kích hoạt tải về
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `BaoGia_${id}.pdf`);
    document.body.appendChild(link);
    link.click();
    
    // 5. Dọn dẹp bộ nhớ
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
};


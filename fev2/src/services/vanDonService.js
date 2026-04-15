import axiosClient from './axiosClient';

export const vanDonService = {
  getList: (params) => axiosClient.get('/van-don', { params }),
  getById: (id) => axiosClient.get(`/van-don/${id}`),
  create: (data) => axiosClient.post('/van-don', data),
  
  // ---> THÊM DÒNG NÀY: Lấy danh sách chờ tạo VĐ
  getPendingList: () => axiosClient.get('/van-don/pending'),
  
  updateTrongLuong: (id, trongLuongThucTe) => {
    return axiosClient.put(`/van-don/${id}/trong-luong-thuc-te`, { trongLuongThucTe });
  },
  huyVanDon: (id, lyDoHuy) => {
    return axiosClient.post(`/van-don/${id}/huy`, { lyDoHuy });
  }
};
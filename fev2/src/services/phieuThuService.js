import axiosClient from './axiosClient';

export const phieuThuService = {
  getList: (params) => axiosClient.get('/phieu-thu', { params }),
  getById: (id) => axiosClient.get(`/phieu-thu/${id}`),
  create: (data) => axiosClient.post('/phieu-thu', data)
};
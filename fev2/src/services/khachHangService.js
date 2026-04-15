import axiosClient from './axiosClient';

export const khachHangService = {
  getList: (params) => {
    // params: { page, limit, search, isActive }
    return axiosClient.get('/khach-hang', { params });
  },
  getById: (id) => {
    return axiosClient.get(`/khach-hang/${id}`);
  },
  create: (data) => {
    return axiosClient.post('/khach-hang', data);
  },
  update: (id, data) => {
    return axiosClient.put(`/khach-hang/${id}`, data);
  },
  delete: (id) => {
    return axiosClient.delete(`/khach-hang/${id}`);
  }
};
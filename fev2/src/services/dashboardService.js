// src/services/dashboardService.js
import axiosClient from './axiosClient';

export const dashboardService = {
  getTongQuan: () => axiosClient.get('/dashboard/tong-quan'),
  getDoanhThu: (params) => axiosClient.get('/dashboard/doanh-thu', { params })
};
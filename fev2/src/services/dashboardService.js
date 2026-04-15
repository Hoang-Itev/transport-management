import axiosClient from './axiosClient';

export const dashboardService = {
  getTongQuan: () => axiosClient.get('/dashboard/tong-quan')
};
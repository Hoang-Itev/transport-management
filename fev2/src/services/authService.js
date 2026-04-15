import axiosClient from './axiosClient'; // <-- Đường dẫn đã được sửa lại chuẩn xác

export const authService = {
  login: (tenDangNhap, matKhau) => {
    return axiosClient.post('/auth/login', { tenDangNhap, matKhau });
  },
  
  logout: () => {
    return axiosClient.post('/auth/logout');
  },
  
  getMe: () => {
    return axiosClient.get('/auth/me');
  }
};
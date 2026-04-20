import axios from 'axios';

const axiosClient = axios.create({
  baseURL: 'http://localhost:5000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor: Gắn token trước khi gửi request
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor: Bắt lỗi response
axiosClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // 🚀 FIX LỖI TẠI ĐÂY: Thêm điều kiện KHÔNG PHẢI api '/login' thì mới reload trang
    const isLoginApi = error.config?.url?.includes('/login');
    
    if (error.response?.status === 401 && !isLoginApi) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    return Promise.reject(error.response?.data || error);
  }
);

export default axiosClient;
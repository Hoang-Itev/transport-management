import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const useAuth = () => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const navigate = useNavigate();

  const login = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    
    // FIX: Tùy theo Role mà đẩy về trang chủ (Homepage) tương ứng
    const role = userData.vai_tro || userData.vaiTro;
    if (role === 'MANAGER') {
      navigate('/'); // Về Dashboard
    } else if (role === 'SALE') {
      navigate('/bao-gia'); 
    } else if (role === 'KE_TOAN') {
      navigate('/phieu-thu');
    } else {
      navigate('/van-don');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
  };

  return { user, login, logout, isAuthenticated: !!user };
};
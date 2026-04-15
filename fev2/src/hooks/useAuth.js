import { useState, useEffect } from 'react';
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
    navigate('/'); // Chuyển về Dashboard sau khi log in thành công
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
  };

  return { user, login, logout, isAuthenticated: !!user };
};
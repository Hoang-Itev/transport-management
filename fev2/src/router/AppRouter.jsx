import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

import LoginPage from '../pages/Login/LoginPage';
import AppLayout from '../components/Layout/AppLayout';

// --- IMPORT TRANG THẬT ---
import KhachHangPage from '../pages/KhachHang/KhachHangPage';
import KhachHangForm from '../pages/KhachHang/KhachHangForm';
import BaoGiaPage from '../pages/BaoGia/BaoGiaPage';
import BaoGiaDetail from '../pages/BaoGia/BaoGiaDetail';
import LoaiHangPage from '../pages/DanhMuc/LoaiHangPage';
import TuyenDuongPage from '../pages/DanhMuc/TuyenDuongPage';
import BangGiaPage from '../pages/DanhMuc/BangGiaPage';
import NguoiDungPage from '../pages/DanhMuc/NguoiDungPage';
import VanDonPage from '../pages/VanDon/VanDonPage';
import VanDonDetail from '../pages/VanDon/VanDonDetail';
import PhieuThuPage from '../pages/PhieuThu/PhieuThuPage';
import PhieuThuForm from '../pages/PhieuThu/PhieuThuForm';
import DashboardPage from '../pages/Dashboard/DashboardPage';
import CongNoPage from '../pages/CongNo/CongNoPage';

// 1. Kiểm tra đăng nhập
const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// 2. BỨC TƯỜNG THÉP: Kiểm tra quyền truy cập theo URL
const RoleRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();
  const role = user?.vai_tro || user?.vaiTro;
  
  if (!allowedRoles.includes(role)) {
    return <Navigate to="/van-don" replace />; 
  }
  return children;
};

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route path="/" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
          
          {/* DASHBOARD: CHỈ MANAGER */}
          <Route index element={<RoleRoute allowedRoles={['MANAGER']}><DashboardPage /></RoleRoute>} />
          
          {/* KHÁCH HÀNG & BÁO GIÁ: MANAGER, SALE */}
          <Route path="khach-hang" element={<RoleRoute allowedRoles={['MANAGER', 'SALE']}><KhachHangPage /></RoleRoute>} />
          <Route path="khach-hang/tao-moi" element={<RoleRoute allowedRoles={['MANAGER', 'SALE']}><KhachHangForm /></RoleRoute>} />
          <Route path="khach-hang/:id/sua" element={<RoleRoute allowedRoles={['MANAGER', 'SALE']}><KhachHangForm /></RoleRoute>} />

          <Route path="bao-gia" element={<RoleRoute allowedRoles={['MANAGER', 'SALE']}><BaoGiaPage /></RoleRoute>} />
          <Route path="bao-gia/tao-moi" element={<RoleRoute allowedRoles={['MANAGER', 'SALE']}><BaoGiaDetail /></RoleRoute>} />
          <Route path="bao-gia/:id" element={<RoleRoute allowedRoles={['MANAGER', 'SALE']}><BaoGiaDetail /></RoleRoute>} />

          {/* VẬN ĐƠN, CÔNG NỢ: TẤT CẢ ĐỀU VÀO ĐƯỢC */}
          <Route path="van-don" element={<VanDonPage />} />
          <Route path="van-don/:id" element={<VanDonDetail />} />
          <Route path="cong-no" element={<CongNoPage />} />

          {/* PHIẾU THU: CHỈ MANAGER, KE_TOAN (Đã chặn SALE truy cập bằng URL) */}
          <Route path="phieu-thu" element={<RoleRoute allowedRoles={['MANAGER', 'KE_TOAN']}><PhieuThuPage /></RoleRoute>} />
          <Route path="phieu-thu/tao-moi" element={<RoleRoute allowedRoles={['MANAGER', 'KE_TOAN']}><PhieuThuForm /></RoleRoute>} />

          {/* DANH MỤC: MANAGER (Toàn quyền), SALE (Chỉ xem Giá/Tuyến/Hàng) */}
          <Route path="danh-muc/nguoi-dung" element={<RoleRoute allowedRoles={['MANAGER']}><NguoiDungPage /></RoleRoute>} />
          <Route path="danh-muc/loai-hang" element={<RoleRoute allowedRoles={['MANAGER', 'SALE']}><LoaiHangPage /></RoleRoute>} />
          <Route path="danh-muc/tuyen-duong" element={<RoleRoute allowedRoles={['MANAGER', 'SALE']}><TuyenDuongPage /></RoleRoute>} />
          <Route path="danh-muc/bang-gia" element={<RoleRoute allowedRoles={['MANAGER', 'SALE']}><BangGiaPage /></RoleRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/van-don" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;
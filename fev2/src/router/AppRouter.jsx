// src/router/AppRouter.jsx
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
import VanDonPage from '../pages/VanDon/VanDonPage';
import VanDonDetail from '../pages/VanDon/VanDonDetail';
import PhieuThuPage from '../pages/PhieuThu/PhieuThuPage';
import PhieuThuForm from '../pages/PhieuThu/PhieuThuForm';
import DashboardPage from '../pages/Dashboard/DashboardPage';
import CongNoPage from '../pages/CongNo/CongNoPage';

// --- IMPORT DANH MỤC V3 ---
import NguoiDungPage from '../pages/DanhMuc/NguoiDungPage';
import LoaiHangPage from '../pages/DanhMuc/LoaiHangPage';
import LoaiXePage from '../pages/DanhMuc/LoaiXePage'; // 🆕 Mới
import PhuPhiPage from '../pages/DanhMuc/PhuPhiPage'; // 🆕 Mới
import BangGiaLTLPage from '../pages/DanhMuc/BangGiaLTLPage'; // 🆕 Đã tách
import BangGiaFTLPage from '../pages/DanhMuc/BangGiaFTLPage'; // 🆕 Đã tách
import ThamSoHeThongPage from '../pages/DanhMuc/ThamSoHeThongPage'; // 🆕 Mới
import DonViTinhPage from '../pages/DanhMuc/DonViTinhPage';

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

          {/* PHIẾU THU: CHỈ MANAGER, KE_TOAN */}
          <Route path="phieu-thu" element={<RoleRoute allowedRoles={['MANAGER', 'KE_TOAN']}><PhieuThuPage /></RoleRoute>} />
          <Route path="phieu-thu/tao-moi" element={<RoleRoute allowedRoles={['MANAGER', 'KE_TOAN']}><PhieuThuForm /></RoleRoute>} />

          {/* DANH MỤC V3: MANAGER (Toàn quyền), SALE (Chỉ xem) */}
          <Route path="danh-muc/nguoi-dung" element={<RoleRoute allowedRoles={['MANAGER']}><NguoiDungPage /></RoleRoute>} />
          <Route path="danh-muc/loai-hang" element={<RoleRoute allowedRoles={['MANAGER', 'SALE']}><LoaiHangPage /></RoleRoute>} />
          <Route path="danh-muc/loai-xe" element={<RoleRoute allowedRoles={['MANAGER', 'SALE']}><LoaiXePage /></RoleRoute>} />
          <Route path="danh-muc/don-vi-tinh" element={<RoleRoute allowedRoles={['MANAGER', 'SALE']}><DonViTinhPage /></RoleRoute>} />
          <Route path="danh-muc/phu-phi" element={<RoleRoute allowedRoles={['MANAGER', 'SALE']}><PhuPhiPage /></RoleRoute>} />
          <Route path="danh-muc/bang-gia-ltl" element={<RoleRoute allowedRoles={['MANAGER', 'SALE']}><BangGiaLTLPage /></RoleRoute>} />
          <Route path="danh-muc/bang-gia-ftl" element={<RoleRoute allowedRoles={['MANAGER', 'SALE']}><BangGiaFTLPage /></RoleRoute>} />
          <Route path="tham-so" element={<RoleRoute allowedRoles={['MANAGER']}><ThamSoHeThongPage /></RoleRoute>} />



        </Route>

        <Route path="*" element={<Navigate to="/van-don" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;
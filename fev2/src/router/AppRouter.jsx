import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

import LoginPage from '../pages/Login/LoginPage';
import AppLayout from '../components/Layout/AppLayout';

// --- IMPORT TRANG THẬT ---
// Khách hàng
import KhachHangPage from '../pages/KhachHang/KhachHangPage';
import KhachHangForm from '../pages/KhachHang/KhachHangForm';

// Báo giá
import BaoGiaPage from '../pages/BaoGia/BaoGiaPage';
import BaoGiaDetail from '../pages/BaoGia/BaoGiaDetail';

// Danh mục
import LoaiHangPage from '../pages/DanhMuc/LoaiHangPage';
import TuyenDuongPage from '../pages/DanhMuc/TuyenDuongPage';
import BangGiaPage from '../pages/DanhMuc/BangGiaPage';
import NguoiDungPage from '../pages/DanhMuc/NguoiDungPage';

// Vận đơn
import VanDonPage from '../pages/VanDon/VanDonPage';
import VanDonDetail from '../pages/VanDon/VanDonDetail';

//phieu thu
import PhieuThuPage from '../pages/PhieuThu/PhieuThuPage';
import PhieuThuForm from '../pages/PhieuThu/PhieuThuForm';


//dashbord
import DashboardPage from '../pages/Dashboard/DashboardPage';



//cong no
import CongNoPage from '../pages/CongNo/CongNoPage';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const PlaceholderPage = ({ title }) => <h2>Đây là màn hình {title} (Đang phát triển...)</h2>;

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route path="/" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
          {/* DASHBOARD */}
          <Route index element={<DashboardPage />} />
          {/* KHÁCH HÀNG */}
          <Route path="khach-hang" element={<KhachHangPage />} />
          <Route path="khach-hang/tao-moi" element={<KhachHangForm />} />
          <Route path="khach-hang/:id/sua" element={<KhachHangForm />} />

          {/* BÁO GIÁ */}
          <Route path="bao-gia" element={<BaoGiaPage />} />
          <Route path="bao-gia/tao-moi" element={<BaoGiaDetail />} />
          <Route path="bao-gia/:id" element={<BaoGiaDetail />} />

          {/* VẬN ĐƠN */}
          <Route path="van-don" element={<VanDonPage />} />
          <Route path="van-don/:id" element={<VanDonDetail />} />

          {/* // 2. Thay thế <Route path="phieu-thu" ... /> cũ bằng đoạn này */}
          <Route path="phieu-thu" element={<PhieuThuPage />} />
          <Route path="phieu-thu/tao-moi" element={<PhieuThuForm />} />

          {/* // 2. Thay thế <Route path="cong-no" ... /> cũ bằng: */}
          <Route path="cong-no" element={<CongNoPage />} />

          {/* DANH MỤC */}
          <Route path="danh-muc/nguoi-dung" element={<NguoiDungPage />} />
          <Route path="danh-muc/loai-hang" element={<LoaiHangPage />} />
          <Route path="danh-muc/tuyen-duong" element={<TuyenDuongPage />} />
          <Route path="danh-muc/bang-gia" element={<BangGiaPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;
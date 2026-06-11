// src/components/Layout/AppSider.jsx
import React from 'react';
import { Layout, Menu } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  TeamOutlined,
  FileTextOutlined,
  CarOutlined,
  DollarOutlined,
  BarChartOutlined,
  SettingOutlined,
  ToolOutlined 
} from '@ant-design/icons';
import { useAuth } from '../../hooks/useAuth';

const { Sider } = Layout;

const AppSider = ({ collapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const role = user?.vai_tro || user?.vaiTro; 

  const menuItems = [
    ...(role === 'MANAGER' ? [{ key: '/', icon: <DashboardOutlined />, label: 'Tổng quan' }] : []),
    ...(['MANAGER', 'SALE'].includes(role) ? [{ key: '/khach-hang', icon: <TeamOutlined />, label: 'Khách hàng' }] : []),
    ...(['MANAGER', 'SALE'].includes(role) ? [{ key: '/bao-gia', icon: <FileTextOutlined />, label: 'Báo giá' }] : []),
    { key: '/van-don', icon: <CarOutlined />, label: 'Vận đơn' },
    ...(['MANAGER', 'KE_TOAN'].includes(role) ? [{ key: '/phieu-thu', icon: <DollarOutlined />, label: 'Phiếu thu' }] : []),
    { key: '/cong-no', icon: <BarChartOutlined />, label: 'Công nợ' },

    // 7. DANH MỤC V3
    ...(['MANAGER', 'SALE'].includes(role) ? [{
      key: 'danh-muc',
      icon: <SettingOutlined />,
      label: 'Danh mục',
      children: [
        ...(role === 'MANAGER' ? [{ key: '/danh-muc/nguoi-dung', label: 'Người dùng' }] : []),
        { key: '/danh-muc/loai-hang', label: 'Loại hàng hóa' },
        { key: '/danh-muc/loai-xe', label: 'Loại xe tải' },
        { key: '/danh-muc/don-vi-tinh', label: 'Đơn vị tính' }, // 🚀 Đã bổ sung
        { key: '/danh-muc/phu-phi', label: 'Bảng giá Phụ phí' }, 
        { key: '/danh-muc/bang-gia-ltl', label: 'Bảng giá LTL (Hàng ghép)' }, // 🚀 Chuẩn hóa tên
        { key: '/danh-muc/bang-gia-ftl', label: 'Bảng giá FTL (Bao xe)' }, // 🚀 Chuẩn hóa tên
      ]
    }] : []),

    ...(role === 'MANAGER' ? [{ key: '/tham-so', icon: <ToolOutlined />, label: 'Luật hệ thống' }] : [])
  ];

  return (
    <Sider trigger={null} collapsible collapsed={collapsed} theme="dark" width={250}>
      <div style={{ height: 32, margin: 16, background: 'rgba(255, 255, 255, 0.2)', borderRadius: 6, display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', fontWeight: 'bold', overflow: 'hidden' }}>
        {collapsed ? 'LOGI' : 'ERP LOGISTICS'}
      </div>
      <Menu theme="dark" mode="inline" selectedKeys={[location.pathname]} defaultOpenKeys={location.pathname.includes('danh-muc') ? ['danh-muc'] : []} items={menuItems} onClick={({ key }) => navigate(key)} />
    </Sider>
  );
};

export default AppSider;
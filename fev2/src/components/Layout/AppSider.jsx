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
  SettingOutlined
} from '@ant-design/icons';
import { useAuth } from '../../hooks/useAuth';

const { Sider } = Layout;

const AppSider = ({ collapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const role = user?.vai_tro || user?.vaiTro; 

  const menuItems = [
    // 1. Dashboard: CHỈ Manager
    ...(role === 'MANAGER' ? [{
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: 'Tổng quan'
    }] : []),

    // 2. Khách hàng: Manager + Sale
    ...(['MANAGER', 'SALE'].includes(role) ? [{
      key: '/khach-hang',
      icon: <TeamOutlined />,
      label: 'Khách hàng'
    }] : []),

    // 3. Báo giá: Manager + Sale
    ...(['MANAGER', 'SALE'].includes(role) ? [{
      key: '/bao-gia',
      icon: <FileTextOutlined />,
      label: 'Báo giá'
    }] : []),

    // 4. Vận đơn: Tất cả (MANAGER, SALE, KE_TOAN)
    {
      key: '/van-don',
      icon: <CarOutlined />,
      label: 'Vận đơn'
    },

    // 5. Phiếu thu: CHỈ Manager + Kế toán (Sale đã có trang Công nợ để xem lịch sử)
    ...(['MANAGER', 'KE_TOAN'].includes(role) ? [{
      key: '/phieu-thu',
      icon: <DollarOutlined />,
      label: 'Phiếu thu'
    }] : []),

    // 6. Công nợ: Tất cả (MANAGER, SALE, KE_TOAN)
    {
      key: '/cong-no',
      icon: <BarChartOutlined />,
      label: 'Công nợ'
    },

    // 7. Danh mục cấu hình: Manager + Sale
    ...(['MANAGER', 'SALE'].includes(role) ? [{
      key: 'danh-muc',
      icon: <SettingOutlined />,
      label: 'Danh mục',
      children: [
        // Quản lý người dùng: CHỈ MANAGER mới được thấy
        ...(role === 'MANAGER' ? [{ key: '/danh-muc/nguoi-dung', label: 'Người dùng' }] : []),
        
        // Tuyến, Loại hàng, Giá: Sale được vào xem để báo giá khách
        { key: '/danh-muc/loai-hang', label: 'Loại hàng' },
        { key: '/danh-muc/tuyen-duong', label: 'Tuyến đường' },
        { key: '/danh-muc/bang-gia', label: 'Bảng giá cước' },
      ]
    }] : [])
  ];

  return (
    <Sider trigger={null} collapsible collapsed={collapsed} theme="dark" width={240}>
      <div style={{ height: 32, margin: 16, background: 'rgba(255, 255, 255, 0.2)', borderRadius: 6, display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', fontWeight: 'bold', overflow: 'hidden' }}>
        {collapsed ? 'LOGI' : 'LOGISTICS'}
      </div>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[location.pathname]}
        defaultOpenKeys={location.pathname.includes('danh-muc') ? ['danh-muc'] : []}
        items={menuItems}
        onClick={({ key }) => navigate(key)}
      />
    </Sider>
  );
};

export default AppSider;
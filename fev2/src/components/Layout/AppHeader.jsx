import React from 'react';
import { Layout, Button, Dropdown, Space, Avatar, Typography } from 'antd';
import { MenuUnfoldOutlined, MenuFoldOutlined, LogoutOutlined, UserOutlined } from '@ant-design/icons';
import { useAuth } from '../../hooks/useAuth';

const { Header } = Layout;
const { Text } = Typography;

const AppHeader = ({ collapsed, setCollapsed }) => {
  const { user, logout } = useAuth();

  const items = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Đăng xuất',
      danger: true,
      onClick: () => logout(),
    },
  ];

  return (
    <Header style={{ padding: 0, background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,21,41,.08)' }}>
      <Button
        type="text"
        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        onClick={() => setCollapsed(!collapsed)}
        style={{ fontSize: '16px', width: 64, height: 64 }}
      />
      <div style={{ paddingRight: 24 }}>
        <Dropdown menu={{ items }} placement="bottomRight">
          <Space style={{ cursor: 'pointer' }}>
            <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
            <span style={{ fontWeight: 500 }}>{user?.hoTen}</span>
            <Text type="secondary" style={{ fontSize: '12px' }}>({user?.vaiTro})</Text>
          </Space>
        </Dropdown>
      </div>
    </Header>
  );
};

export default AppHeader;
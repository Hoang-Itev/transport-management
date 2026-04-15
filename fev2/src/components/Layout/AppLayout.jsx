import React, { useState } from 'react';
import { Layout } from 'antd';
import { Outlet } from 'react-router-dom';
import AppSider from './AppSider';
import AppHeader from './AppHeader';

const { Content } = Layout;

const AppLayout = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <AppSider collapsed={collapsed} />
      <Layout>
        <AppHeader collapsed={collapsed} setCollapsed={setCollapsed} />
        <Content style={{ margin: '24px 16px', padding: 24, background: '#fff', borderRadius: 8, overflow: 'initial' }}>
          {/* Nơi chứa các trang con như KhachHangPage, BaoGiaPage... sẽ được render tại đây */}
          <Outlet /> 
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
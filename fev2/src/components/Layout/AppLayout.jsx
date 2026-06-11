import React, { useState } from 'react';
import { Layout } from 'antd';
import { Outlet } from 'react-router-dom';
import AppSider from './AppSider';
import AppHeader from './AppHeader';
import AiChatWidget from '../common/AiChatWidget';


const { Content } = Layout;

const AppLayout = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Layout style={{ height: '100vh', overflow: 'hidden' }}> {/* 👈 khóa viewport */}
      <AppSider collapsed={collapsed} />
      <Layout style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <AppHeader collapsed={collapsed} setCollapsed={setCollapsed} />
        <Content style={{
          margin: '24px 16px',
          padding: 24,
          background: '#fff',
          borderRadius: 8,
          overflow: 'auto',  // 👈 scroll xảy ra ở đây, không phải toàn trang
          flex: 1
        }}>
          <Outlet />
        </Content>
      </Layout>

      {/* 🚀 AI CHAT WIDGET LƠ LỬNG Ở MỌI TRANG */}
      <AiChatWidget />
      
    </Layout>
  );
};

export default AppLayout;
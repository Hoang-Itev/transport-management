import React from 'react';
import AppRouter from './router/AppRouter';
import { ConfigProvider } from 'antd';
import vi_VN from 'antd/locale/vi_VN';

function App() {
  return (
    <ConfigProvider locale={vi_VN}>
      <AppRouter />
    </ConfigProvider>
  );
}

export default App;
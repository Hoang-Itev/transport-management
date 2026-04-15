import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, message, Alert } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { authService } from '../../services/authService';
import { useAuth } from '../../hooks/useAuth';

const { Title } = Typography;

const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const { login } = useAuth();

  const onFinish = async (values) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const response = await authService.login(values.tenDangNhap, values.matKhau);
      if (response.success) {
        message.success(`Chào mừng quay trở lại, ${response.data.user.hoTen}!`);
        // Lưu token & user vào hook/localstorage
        login(response.data.token, response.data.user);
      }
    } catch (error) {
      // Bắt mã lỗi từ backend
      const code = error?.error?.code;
      if (code === 'INVALID_CREDENTIALS') {
        setErrorMsg('Tên đăng nhập hoặc mật khẩu không chính xác.');
      } else if (code === 'ACCOUNT_LOCKED') {
        setErrorMsg('Tài khoản đã bị khóa do đăng nhập sai quá nhiều lần.');
      } else {
        setErrorMsg('Lỗi kết nối máy chủ. Vui lòng thử lại sau.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f0f2f5' }}>
      <Card style={{ width: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={3} style={{ color: '#1890ff', margin: 0 }}>HỆ THỐNG LOGISTICS</Title>
          <span style={{ color: '#8c8c8c' }}>Đăng nhập để tiếp tục</span>
        </div>

        {errorMsg && (
          <Alert message={errorMsg} type="error" showIcon style={{ marginBottom: 16 }} />
        )}

        <Form
          name="login_form"
          layout="vertical"
          onFinish={onFinish}
          size="large"
        >
          <Form.Item
            name="tenDangNhap"
            rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập!' }]}
          >
            <Input prefix={<UserOutlined style={{ color: '#bfbfbf' }} />} placeholder="Tên đăng nhập" />
          </Form.Item>

          <Form.Item
            name="matKhau"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}
          >
            <Input.Password prefix={<LockOutlined style={{ color: '#bfbfbf' }} />} placeholder="Mật khẩu" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" style={{ width: '100%' }} loading={loading}>
              Đăng nhập
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default LoginPage;
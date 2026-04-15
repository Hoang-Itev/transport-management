import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Typography, Table, Spin, message, Statistic } from 'antd';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { FileDoneOutlined, DollarOutlined, BankOutlined, RiseOutlined } from '@ant-design/icons';
import { dashboardService } from '../../services/dashboardService';
import CurrencyText from '../../components/common/CurrencyText';

const { Title, Text } = Typography;

const DashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    homNay: { soVanDon: 0, doanhThu: 0 },
    thangNay: { soVanDon: 0, doanhThu: 0 },
    tongCongNo: 0,
    top5KhachNhieuNo: [],
    bieu_do_30_ngay: []
  });

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await dashboardService.getTongQuan();
        if (res.success) {
          setData(res.data);
        }
      } catch (error) {
        message.error('Không tải được dữ liệu Dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: '100px 0' }}><Spin size="large" /></div>;

  return (
    <div>
      <Title level={3} style={{ marginBottom: 24 }}>Tổng quan (Dashboard)</Title>

      {/* DÒNG 1: 4 THẺ THỐNG KÊ */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card variant="borderless" style={{ backgroundColor: '#e6f4ff' }}>
            <Statistic title="Hôm nay Vận đơn" value={data.homNay.soVanDon} suffix="đơn" prefix={<FileDoneOutlined />} valueStyle={{ color: '#1677ff' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card variant="borderless" style={{ backgroundColor: '#f6ffed' }}>
            <Statistic title="Hôm nay Doanh thu" value={data.homNay.doanhThu} prefix={<RiseOutlined />} valueStyle={{ color: '#52c41a' }} formatter={val => new Intl.NumberFormat('vi-VN').format(val) + ' đ'} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card variant="borderless" style={{ backgroundColor: '#fffbe6' }}>
            <Statistic title="Tháng này Doanh thu" value={data.thangNay.doanhThu} prefix={<DollarOutlined />} valueStyle={{ color: '#faad14' }} formatter={val => new Intl.NumberFormat('vi-VN').format(val) + ' đ'} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card variant="borderless" style={{ backgroundColor: '#fff1f0' }}>
            <Statistic title="Tổng Công nợ hệ thống" value={data.tongCongNo} prefix={<BankOutlined />} valueStyle={{ color: '#cf1322' }} formatter={val => new Intl.NumberFormat('vi-VN').format(val) + ' đ'} />
          </Card>
        </Col>
      </Row>

      {/* DÒNG 2: BIỂU ĐỒ & BẢNG TOP 5 */}
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={14}>
          <Card title="Biểu đồ doanh thu 30 ngày (Line)" variant="borderless" style={{ height: '100%' }}>
            <div style={{ height: 350 }}>
              {data.bieu_do_30_ngay.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.bieu_do_30_ngay} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="ngay" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(value) => new Intl.NumberFormat('vi-VN', { notation: "compact", compactDisplay: "short" }).format(value)} />
                    <RechartsTooltip formatter={(value) => new Intl.NumberFormat('vi-VN').format(value) + ' đ'} />
                    <Legend />
                    <Line type="monotone" name="Doanh thu (VNĐ)" dataKey="doanhThu" stroke="#1677ff" strokeWidth={3} activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ textAlign: 'center', marginTop: 150, color: 'gray' }}>Chưa có dữ liệu 30 ngày qua</div>
              )}
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card title="Top 5 Khách hàng nhiều nợ" variant="borderless" style={{ height: '100%' }}>
            <Table 
              dataSource={data.top5KhachNhieuNo} 
              rowKey="khachHangId" 
              pagination={false}
              size="middle"
              columns={[
                { 
                  title: 'Hạng', 
                  key: 'index', 
                  align: 'center',
                  width: 60,
                  render: (_, __, index) => {
                    const color = index === 0 ? '#cf1322' : index === 1 ? '#fa8c16' : index === 2 ? '#fadb14' : 'gray';
                    return <strong style={{ color }}>#{index + 1}</strong>;
                  } 
                },
                { title: 'Khách hàng', dataIndex: 'tenCongTy', render: val => <Text strong>{val}</Text> },
                { title: 'Công nợ', dataIndex: 'congNo', align: 'right', render: val => <CurrencyText value={val} style={{ color: '#cf1322' }} /> }
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardPage;
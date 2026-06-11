import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Typography, Table, Spin, message, Statistic, Button } from 'antd';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { FileDoneOutlined, DollarOutlined, BankOutlined, RiseOutlined, ReloadOutlined, WalletOutlined } from '@ant-design/icons';
import { dashboardService } from '../../services/dashboardService';
import CurrencyText from '../../components/common/CurrencyText';

const { Title, Text } = Typography;

const DashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    homNay: { soVanDon: 0, doanhThu: 0, dongTien: 0 },
    thangNay: { soVanDon: 0, doanhThu: 0, dongTien: 0 },
    tongCongNo: 0,
    top5KhachNhieuNo: [],
    bieu_do_30_ngay: []
  });

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await dashboardService.getTongQuan();
      if (res.success) setData(res.data);
    } catch (error) { message.error('Không tải được dữ liệu Dashboard'); } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchDashboard(); }, []);

  if (loading && !data?.homNay) return <div style={{ textAlign: 'center', padding: '100px 0' }}><Spin size="large" /></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>Tổng quan (Dashboard)</Title>
        <Button type="primary" icon={<ReloadOutlined />} onClick={fetchDashboard} loading={loading}>
          Làm mới số liệu
        </Button>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={8}>
          <Card variant="borderless" style={{ backgroundColor: '#e6f4ff', height: '100%' }}>
            <Statistic title="Hôm nay Vận đơn" value={data?.homNay?.soVanDon || 0} suffix="đơn" prefix={<FileDoneOutlined />} valueStyle={{ color: '#1677ff' }} />
            <div style={{ marginTop: 15, display: 'flex', justifyContent: 'space-between' }}>
                <Statistic title="Doanh thu" value={data?.homNay?.doanhThu || 0} valueStyle={{ color: '#1677ff', fontSize: 16 }} formatter={val => new Intl.NumberFormat('vi-VN').format(val) + 'đ'} />
                <Statistic title="Thực thu tiền" value={data?.homNay?.dongTien || 0} valueStyle={{ color: '#52c41a', fontSize: 16 }} formatter={val => new Intl.NumberFormat('vi-VN').format(val) + 'đ'} />
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card variant="borderless" style={{ backgroundColor: '#fffbe6', height: '100%' }}>
            <Statistic title="Tháng này Vận đơn" value={data?.thangNay?.soVanDon || 0} suffix="đơn" prefix={<RiseOutlined />} valueStyle={{ color: '#faad14' }} />
            <div style={{ marginTop: 15, display: 'flex', justifyContent: 'space-between' }}>
                <Statistic title="Doanh thu" value={data?.thangNay?.doanhThu || 0} valueStyle={{ color: '#faad14', fontSize: 16 }} formatter={val => new Intl.NumberFormat('vi-VN').format(val) + 'đ'} />
                <Statistic title="Thực thu tiền" value={data?.thangNay?.dongTien || 0} valueStyle={{ color: '#52c41a', fontSize: 16 }} formatter={val => new Intl.NumberFormat('vi-VN').format(val) + 'đ'} />
            </div>
          </Card>
        </Col>
        
        <Col xs={24} lg={8}>
          <Card variant="borderless" style={{ backgroundColor: '#fff1f0', height: '100%' }}>
            <Statistic title="Tổng Công nợ (Khách B2B chưa trả)" value={data?.tongCongNo || 0} prefix={<BankOutlined />} valueStyle={{ color: '#cf1322' }} formatter={val => new Intl.NumberFormat('vi-VN').format(val) + ' đ'} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={14}>
          <Card title="Biểu đồ doanh thu ghi nhận (30 ngày)" variant="borderless" style={{ height: '100%' }}>
            <div style={{ height: 350 }}>
              {data?.bieu_do_30_ngay?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.bieu_do_30_ngay} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="ngay" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(value) => new Intl.NumberFormat('vi-VN', { notation: "compact", compactDisplay: "short" }).format(value)} />
                    <RechartsTooltip formatter={(value) => new Intl.NumberFormat('vi-VN').format(value) + ' đ'} />
                    <Legend />
                    <Line type="monotone" name="Doanh thu cước (VNĐ)" dataKey="doanhThu" stroke="#1677ff" strokeWidth={3} activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ textAlign: 'center', marginTop: 150, color: 'gray' }}>Chưa có dữ liệu 30 ngày qua</div>
              )}
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card title="Top 5 Khách hàng nợ đọng cao nhất" variant="borderless" style={{ height: '100%' }}>
            <Table 
              dataSource={data?.top5KhachNhieuNo || []} rowKey="khachHangId" pagination={false} size="middle"
              columns={[
                { title: 'Hạng', key: 'index', align: 'center', width: 60, render: (_, __, index) => {
                    const color = index === 0 ? '#cf1322' : index === 1 ? '#fa8c16' : index === 2 ? '#fadb14' : 'gray';
                    return <strong style={{ color }}>#{index + 1}</strong>;
                  } 
                },
                { title: 'Tên Khách Hàng', dataIndex: 'tenCongTy', render: val => <Text strong>{val}</Text> },
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
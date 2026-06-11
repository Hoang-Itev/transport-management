import React, { useState, useEffect } from 'react';
import { Card, Table, Space, Typography, Checkbox, Input, Button, Row, Col, Spin, Tag, message, Tabs, Statistic, Modal } from 'antd';
import { DownloadOutlined, ExclamationCircleOutlined, InfoCircleOutlined, MailOutlined } from '@ant-design/icons';
import { congNoService } from '../../services/congNoService';
import CurrencyText from '../../components/common/CurrencyText';
import { formatDate } from '../../utils/formatDate';
import { usePagination } from '../../hooks/usePagination';

const { Title, Text } = Typography;

const CongNoPage = () => {
  const { page, limit, total, setTotal, onChange } = usePagination(10);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [globalDebt, setGlobalDebt] = useState(0); // 🚀 FIX: Lưu tổng nợ toàn cục từ Backend
  
  const [search, setSearch] = useState('');
  const [chiQuaHan, setChiQuaHan] = useState(false);

  const [selectedKh, setSelectedKh] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [sendingMail, setSendingMail] = useState(false);

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await congNoService.getList({ page, limit, quaHan: chiQuaHan ? true : undefined, search });
      if (res.success) {
        setData(res.data);
        setTotal(res.pagination.total);
        setGlobalDebt(res.globalTotalDebt || 0); // 🚀 Cập nhật tổng nợ toàn hệ thống
      }
    } catch (error) { message.error('Lỗi tải danh sách công nợ'); } 
    finally { setLoading(false); }
  };

  useEffect(() => { 
    fetchList(); 
    setSelectedKh(null); setDetailData(null);
  }, [page, limit, chiQuaHan, search]); 

  const fetchDetail = async (khachHangId) => {
    setDetailLoading(true);
    try {
      const res = await congNoService.getDetail(khachHangId);
      if (res.success) setDetailData(res.data);
    } catch (error) { message.error('Lỗi tải chi tiết'); setDetailData(null); } 
    finally { setDetailLoading(false); }
  };

  const handleRowClick = (record) => {
    setSelectedKh(record); fetchDetail(record.khachHangId);
  };

  const handleExport = async () => {
    try {
      message.loading({ content: 'Đang tạo file Excel...', key: 'export' });
      await congNoService.exportExcel({ format: 'excel', search, quaHan: chiQuaHan });
      message.success({ content: 'Tải xuống thành công!', key: 'export' });
    } catch (error) { message.error({ content: 'Lỗi xuất báo cáo', key: 'export' }); }
  };

  const handleSendAllMails = () => {
    Modal.confirm({
      title: 'Xác nhận Nhắc Nợ Hàng Loạt',
      content: 'Hệ thống sẽ gửi Email nhắc nhở đến TẤT CẢ khách hàng B2B đang có tổng nợ > 0. Quá trình này sẽ chạy ngầm và mất vài phút. Bạn có muốn tiếp tục?',
      okText: 'Gửi Email',
      onOk: async () => {
        try {
          setSendingMail(true);
          const res = await congNoService.guiMailNhacNoToanBo();
          message.success(res.message || 'Đã kích hoạt robot gửi email hàng loạt!');
        } catch (error) {
          message.error('Lỗi gửi email hàng loạt');
        } finally {
          setSendingMail(false);
        }
      }
    });
  };

  const columns = [
    { title: 'Khách hàng', dataIndex: 'tenCongTy', fontWeight: 'bold' },
    { title: 'Hạn mức', dataIndex: 'hanMucCongNo', align: 'right', render: val => <CurrencyText value={val} /> },
    { title: 'Nợ hiện tại', dataIndex: 'congNoHienTai', align: 'right', render: val => <CurrencyText value={val} style={{ color: '#cf1322', fontWeight: 'bold' }}/> },
    { title: 'VĐ chưa thu', dataIndex: 'soVanDonChuaTT', align: 'center', render: val => <Tag color="blue">{val} đơn</Tag> },
    { title: 'Tình trạng', dataIndex: 'isQuaHan', align: 'center', render: (val) => val ? <Tag color="error" icon={<ExclamationCircleOutlined />}>Quá hạn</Tag> : <Tag color="success">An toàn</Tag> }
  ];

  return (
    <Card bordered={false}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, alignItems: 'center' }}>
        <Space size="large">
          <Title level={4} style={{ margin: 0 }}>Quản lý Công Nợ Doanh Nghiệp (B2B)</Title>
          <Tag color="cyan" style={{ fontSize: 14, padding: '4px 8px' }}>
            Tổng nợ toàn cục: <CurrencyText value={globalDebt} style={{ color: '#cf1322', fontWeight: 'bold' }} />
          </Tag>
        </Space>
        <Space>
          <Button type="primary" style={{ background: '#722ed1' }} icon={<MailOutlined />} loading={sendingMail} onClick={handleSendAllMails}>Nhắc Nợ Toàn Bộ</Button>
          <Button type="primary" icon={<DownloadOutlined />} onClick={handleExport}>Xuất Excel</Button>
        </Space>
      </div>

      <Row gutter={24}>
        <Col xs={24} lg={13}>
          <Space style={{ marginBottom: 16 }} wrap>
            <Input.Search placeholder="Tìm tên công ty..." enterButton="Tìm kiếm" style={{ width: 300 }} allowClear onSearch={setSearch} onChange={(e) => { if (!e.target.value) setSearch(''); }} />
            <Checkbox checked={chiQuaHan} onChange={(e) => setChiQuaHan(e.target.checked)}>
              <Text type="danger">Lọc Khách hàng nợ quá hạn</Text>
            </Checkbox>
          </Space>
          <Table columns={columns} dataSource={data} rowKey="khachHangId" loading={loading} pagination={{ current: page, pageSize: limit, total, onChange }} bordered rowClassName={(record) => record.khachHangId === selectedKh?.khachHangId ? 'ant-table-row-selected' : ''} onRow={(record) => ({ onClick: () => handleRowClick(record), style: { cursor: 'pointer' } })} />
        </Col>

        <Col xs={24} lg={11}>
          <Card title={selectedKh ? `Hồ sơ nợ: ${selectedKh.tenCongTy}` : 'Chi tiết công nợ'} style={{ height: '100%', minHeight: 500, backgroundColor: '#fdfdfd', border: '1px solid #e8e8e8' }} headStyle={{ backgroundColor: '#f0f2f5' }}>
            {!selectedKh ? (
              <div style={{ textAlign: 'center', color: '#bfbfbf', paddingTop: 120 }}>
                <InfoCircleOutlined style={{ fontSize: 40, marginBottom: 16 }} /><br />Click chọn 1 Khách hàng bên trái để xem hồ sơ
              </div>
            ) : detailLoading ? (
              <div style={{ textAlign: 'center', padding: 50 }}><Spin size="large" /></div>
            ) : detailData ? (
              <div>
                <Row gutter={16} style={{ marginBottom: 20 }}>
                  <Col span={8}><Statistic title="Hạn mức tối đa" value={detailData.hanMucCongNo} suffix="đ" valueStyle={{ fontSize: 16 }} /></Col>
                  <Col span={8}><Statistic title="Nợ hiện tại" value={detailData.congNoHienTai} suffix="đ" valueStyle={{ color: '#cf1322', fontWeight: 'bold', fontSize: 18 }} /></Col>
                  <Col span={8}><Statistic title="Dư địa còn lại" value={detailData.conLaiDuocPhepNo} suffix="đ" valueStyle={{ color: '#1890ff', fontSize: 16 }} /></Col>
                </Row>
                <Tabs defaultActiveKey="1" type="card">
                  <Tabs.TabPane tab={`Chưa thanh toán (${detailData.vanDonChuaTT?.length || 0})`} key="1">
                    <Table size="small" dataSource={detailData.vanDonChuaTT || []} rowKey="vanDonId" pagination={false} scroll={{ y: 350 }}
                      columns={[
                        { title: 'Mã VĐ', dataIndex: 'vanDonId', width: 120, render: val => <Text strong>{val}</Text> },
                        { title: 'Hạn TT', dataIndex: 'ngayHetHanThanhToan', width: 100, render: val => formatDate(val) },
                        { title: 'Còn nợ', dataIndex: 'conLai', align: 'right', width: 110, render: val => <CurrencyText value={val} style={{fontWeight: 500}} /> },
                        { title: 'Trạng thái', align: 'center', render: (_, r) => r.soNgayQuaHan > 0 ? <Tag color="error">{r.soNgayQuaHan} ngày</Tag> : <Text type="success" style={{fontSize: 12}}>Trong hạn</Text> }
                      ]} />
                  </Tabs.TabPane>
                  <Tabs.TabPane tab={`Lịch sử thu (${detailData.lichSuThanhToan?.length || 0})`} key="2">
                    <Table size="small" dataSource={detailData.lichSuThanhToan || []} rowKey={(r) => r.maPhieuThu + r.vanDonId} pagination={false} scroll={{ y: 350 }}
                      columns={[
                        { title: 'Mã Phiếu', dataIndex: 'maPhieuThu', render: val => `PT-${val}` },
                        { title: 'Ngày thu', dataIndex: 'ngayThu', render: val => formatDate(val) },
                        { title: 'Hình thức', dataIndex: 'hinhThuc', render: val => val === 'TIEN_MAT' ? 'Tiền mặt' : 'Chuyển khoản' },
                        { title: 'Số tiền', dataIndex: 'soTienPhanBo', align: 'right', render: val => <CurrencyText value={val} style={{ color: '#52c41a', fontWeight: 'bold' }} /> }
                      ]} />
                  </Tabs.TabPane>
                </Tabs>
              </div>
            ) : null}
          </Card>
        </Col>
      </Row>
    </Card>
  );
};
export default CongNoPage;
import React, { useState, useEffect } from 'react';
import { Card, Table, Space, Typography, Checkbox, Input, Button, Row, Col, Divider, Spin, Tag, message } from 'antd';
import { SearchOutlined, DownloadOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { congNoService } from '../../services/congNoService';
import CurrencyText from '../../components/common/CurrencyText';
import { formatDate } from '../../utils/formatDate';
import { usePagination } from '../../hooks/usePagination';

const { Title, Text } = Typography;

const CongNoPage = () => {
  const { page, limit, total, setTotal, onChange } = usePagination(10);
  
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  
  // Bộ lọc
  const [search, setSearch] = useState('');
  const [chiQuaHan, setChiQuaHan] = useState(false);

  // Panel chi tiết bên phải
  const [selectedKh, setSelectedKh] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // 1. Tải danh sách Tổng hợp
  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await congNoService.getList({ page, limit, quaHan: chiQuaHan ? true : undefined, search });
      if (res.success) {
        setData(res.data);
        setTotal(res.pagination.total);
      }
    } catch (error) {
      message.error('Lỗi tải danh sách công nợ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchList(); }, [page, limit, chiQuaHan, search]);

  // 2. Tải Chi tiết khi click vào Khách hàng
  const fetchDetail = async (khachHangId) => {
    setDetailLoading(true);
    try {
      const res = await congNoService.getDetail(khachHangId);
      if (res.success) {
        setDetailData(res.data);
      }
    } catch (error) {
      message.error('Lỗi tải chi tiết công nợ khách hàng');
      setDetailData(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleRowClick = (record) => {
    setSelectedKh(record);
    fetchDetail(record.khachHangId);
  };

  // 3. Xuất báo cáo
  const handleExport = async () => {
    try {
      message.loading({ content: 'Đang tạo file Excel...', key: 'export' });
      await congNoService.exportExcel({ format: 'excel' });
      message.success({ content: 'Tải xuống thành công!', key: 'export' });
    } catch (error) {
      message.error({ content: 'Lỗi xuất báo cáo', key: 'export' });
    }
  };

  // --- CẤU HÌNH CỘT CHO BẢNG TRÁI ---
  const columns = [
    { title: 'Khách hàng', dataIndex: 'tenCongTy', fontWeight: 'bold' },
    { title: 'Hạn mức', dataIndex: 'hanMucCongNo', align: 'right', render: val => <CurrencyText value={val} /> },
    { title: 'Công nợ hiện tại', dataIndex: 'congNoHienTai', align: 'right', render: val => <CurrencyText value={val} style={{ color: '#cf1322', fontWeight: 500 }}/> },
    { title: 'Còn lại phép', dataIndex: 'conLaiDuocPhepNo', align: 'right', render: val => <CurrencyText value={val} style={{ color: '#1890ff' }}/> },
    { title: 'VĐ chưa thanh toán', dataIndex: 'soVanDonChuaTT', align: 'center' },
    { 
      title: 'Trạng thái', 
      dataIndex: 'isQuaHan', 
      align: 'center',
      render: (isQuaHan) => isQuaHan 
        ? <Tag color="error" icon={<ExclamationCircleOutlined />}>Quá hạn</Tag> 
        : <Tag color="success">Trong hạn</Tag>
    }
  ];

  // Tính tổng nợ toàn màn hình (Dựa trên data đang hiển thị)
  const tongNoToanCuc = data.reduce((sum, item) => sum + Number(item.congNoHienTai || 0), 0);

  return (
    <Card bordered={false}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, alignItems: 'center' }}>
        <Space size="large">
          <Title level={4} style={{ margin: 0 }}>Công nợ khách hàng</Title>
          <Text style={{ fontSize: 16 }}>Tổng nợ: <CurrencyText value={tongNoToanCuc} style={{ color: '#cf1322', fontSize: 18, fontWeight: 'bold' }} /></Text>
        </Space>
        <Button type="primary" icon={<DownloadOutlined />} onClick={handleExport}>Xuất Báo Cáo Excel</Button>
      </div>

      <Row gutter={24}>
        {/* === CỘT TRÁI: DANH SÁCH KHÁCH HÀNG === */}
        <Col span={14}>
          <Space style={{ marginBottom: 16 }} wrap>
            <Input 
              placeholder="Tìm tên khách hàng..." 
              prefix={<SearchOutlined />} 
              style={{ width: 250 }} 
              allowClear 
              onPressEnter={e => setSearch(e.target.value)}
              onBlur={e => setSearch(e.target.value)}
            />
            <Checkbox checked={chiQuaHan} onChange={(e) => setChiQuaHan(e.target.checked)}>
              <Text type="danger">Chỉ hiển thị Khách đang có nợ quá hạn</Text>
            </Checkbox>
          </Space>

          <Table 
            columns={columns} 
            dataSource={data} 
            rowKey="khachHangId" 
            loading={loading} 
            pagination={{ current: page, pageSize: limit, total, onChange }} 
            bordered
            // Highlight dòng đang được chọn
            rowClassName={(record) => record.khachHangId === selectedKh?.khachHangId ? 'ant-table-row-selected' : ''}
            onRow={(record) => ({
              onClick: () => handleRowClick(record),
              style: { cursor: 'pointer' }
            })}
          />
        </Col>

        {/* === CỘT PHẢI: PANEL CHI TIẾT === */}
        <Col span={10}>
          <Card 
            title={selectedKh ? `Chi tiết công nợ: ${selectedKh.tenCongTy}` : 'Chi tiết công nợ'} 
            style={{ height: '100%', minHeight: 400, backgroundColor: '#fafafa' }}
          >
            {!selectedKh ? (
              <div style={{ textAlign: 'center', color: '#bfbfbf', paddingTop: 100 }}>
                Click vào 1 khách hàng bên trái để xem chi tiết
              </div>
            ) : detailLoading ? (
              <div style={{ textAlign: 'center', padding: 50 }}><Spin /></div>
            ) : detailData ? (
              <div>
                <Space direction="vertical" size="small" style={{ display: 'flex', marginBottom: 24 }}>
                  <Row><Col span={12}><Text type="secondary">Hạn mức tối đa:</Text></Col><Col span={12}><CurrencyText value={detailData.hanMucCongNo} /></Col></Row>
                  <Row><Col span={12}><Text type="secondary">Nợ hiện tại:</Text></Col><Col span={12}><CurrencyText value={detailData.congNoHienTai} style={{ color: '#cf1322', fontWeight: 'bold' }}/></Col></Row>
                  <Row><Col span={12}><Text type="secondary">Dư địa còn lại:</Text></Col><Col span={12}><CurrencyText value={detailData.conLaiDuocPhepNo} style={{ color: '#1890ff' }}/></Col></Row>
                </Space>

                <Divider orientation="left" style={{ margin: '12px 0' }}><Text style={{ fontSize: 13 }}>Vận đơn chưa thanh toán</Text></Divider>
                <Table 
                  size="small"
                  dataSource={[...(detailData.vanDonQuaHan || []), ...(detailData.vanDonChuaTT || [])]} 
                  rowKey="vanDonId"
                  pagination={{ pageSize: 5 }}
                  columns={[
                    { title: 'Mã VĐ', dataIndex: 'vanDonId', render: val => <Text strong>{val}</Text> },
                    { title: 'Hạn TT', dataIndex: 'ngayHetHanThanhToan', render: val => formatDate(val) },
                    { title: 'Còn nợ', dataIndex: 'conLai', align: 'right', render: val => <CurrencyText value={val} /> },
                    { 
                      title: 'Trạng thái', 
                      align: 'center',
                      render: (_, r) => r.soNgayQuaHan 
                        ? <Text type="danger">{r.soNgayQuaHan} ngày</Text> 
                        : <Text type="success">Trong hạn</Text> 
                    }
                  ]}
                />

                <Divider orientation="left" style={{ margin: '12px 0' }}><Text style={{ fontSize: 13 }}>Lịch sử thanh toán gần đây</Text></Divider>
                <Table 
                  size="small"
                  dataSource={detailData.lichSuThanhToan || []} 
                  rowKey={(r) => r.maPhieuThu + r.vanDonId} // Tránh trùng key
                  pagination={{ pageSize: 5 }}
                  columns={[
                    { title: 'Phiếu', dataIndex: 'maPhieuThu' },
                    { title: 'Ngày', dataIndex: 'ngayThu', render: val => formatDate(val) },
                    { title: 'Hình thức', dataIndex: 'hinhThuc' },
                    { title: 'Số tiền', dataIndex: 'soTienPhanBo', align: 'right', render: val => <CurrencyText value={val} style={{ color: '#52c41a' }} /> }
                  ]}
                />
              </div>
            ) : null}
          </Card>
        </Col>
      </Row>
    </Card>
  );
};

export default CongNoPage;
import React, { useState, useEffect } from 'react';
import { Card, Select, Button, Table, Space, Typography, DatePicker, message, Tooltip, Modal } from 'antd';
import { PlusOutlined, EyeOutlined, PrinterOutlined, MailOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

import { phieuThuService } from '../../services/phieuThuService';
import { khachHangService } from '../../services/khachHangService';
import { usePagination } from '../../hooks/usePagination';
import CurrencyText from '../../components/common/CurrencyText';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const PhieuThuPage = () => {
  const navigate = useNavigate();
  const { page, limit, total, setTotal, onChange } = usePagination(10);
  
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [khachHangList, setKhachHangList] = useState([]);

  const [khachHangId, setKhachHangId] = useState(null);
  const [hinhThuc, setHinhThuc] = useState(null);
  const [dateRange, setDateRange] = useState([]);

  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedPhieu, setSelectedPhieu] = useState(null);

  useEffect(() => { khachHangService.getList({ limit: 1000 }).then(res => setKhachHangList(res.data)); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const tuNgay = dateRange?.[0] ? dateRange[0].format('YYYY-MM-DD') : undefined;
      const denNgay = dateRange?.[1] ? dateRange[1].format('YYYY-MM-DD') : undefined;
      const res = await phieuThuService.getList({ page, limit, khachHangId, hinhThuc, tuNgay, denNgay });
      if (res.success) {
        setData(res.data);
        setTotal(res.pagination.total);
      }
    } catch (error) { message.error('Lỗi tải danh sách phiếu thu'); } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [page, limit, khachHangId, hinhThuc, dateRange]);

  const xemChiTiet = async (id) => {
    try {
      const res = await phieuThuService.getById(id);
      setSelectedPhieu(res.data);
      setDetailModalVisible(true);
    } catch (error) { message.error('Lỗi tải chi tiết phiếu thu'); }
  };

  const handleDownloadPdf = async (id) => {
    try {
      message.loading({ content: 'Đang tạo Phiếu thu PDF...', key: 'pdf_pt' });
      await phieuThuService.exportPdf(id);
      message.success({ content: 'Đã tải Phiếu thu PDF!', key: 'pdf_pt' });
    } catch (error) { message.error({ content: 'Lỗi khi xuất PDF', key: 'pdf_pt' }); }
  };

  const handleSendEmail = async (id) => {
    try {
      message.loading({ content: 'Đang gửi email...', key: 'email_pt' });
      await phieuThuService.sendEmail(id);
      message.success({ content: 'Đã gửi Email Phiếu thu thành công!', key: 'email_pt' });
    } catch (error) { message.error({ content: 'Lỗi gửi mail', key: 'email_pt' }); }
  };

  const columns = [
    { title: 'Mã PT', dataIndex: 'id', render: (val) => <Text strong>PT-{val}</Text> },
    { 
      title: 'Khách hàng', 
      render: (_, r) => r.ten_cong_ty || `ID: ${r.khach_hang_id}`,
      // Sắp xếp theo tên Khách hàng
      sorter: (a, b) => (a.ten_cong_ty || '').localeCompare(b.ten_cong_ty || '')
    },
    { 
      title: 'Ngày thu', 
      dataIndex: 'ngay_thu', 
      render: (val) => dayjs(val).format('DD/MM/YYYY'),
      // Sắp xếp theo Ngày
      sorter: (a, b) => new Date(a.ngay_thu) - new Date(b.ngay_thu) 
    },
    { title: 'Hình thức', dataIndex: 'hinh_thuc' },
    { 
      title: 'Tổng số tiền', 
      dataIndex: 'so_tien_nhan_duoc', 
      align: 'right', 
      render: (val) => <CurrencyText value={val} style={{ color: '#52c41a', fontWeight: 'bold' }} />,
      // Sắp xếp theo Tiền
      sorter: (a, b) => Number(a.so_tien_nhan_duoc) - Number(b.so_tien_nhan_duoc)
    },
    { title: 'Thao tác', align: 'center', render: (_, record) => (
        <Space>
          <Tooltip title="Xem chi tiết phân bổ"><Button type="text" icon={<EyeOutlined />} onClick={() => xemChiTiet(record.id)} /></Tooltip>
          <Tooltip title="Tải & In PDF"><Button type="text" style={{color: '#722ed1'}} icon={<PrinterOutlined />} onClick={() => handleDownloadPdf(record.id)} /></Tooltip>
          <Tooltip title="Gửi Mail Kèm Biên Nhận"><Button type="text" style={{color: '#faad14'}} icon={<MailOutlined />} onClick={() => handleSendEmail(record.id)} /></Tooltip>
        </Space>
      )
    }
  ];

  return (
    <Card bordered={false}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>Danh sách Phiếu Thu</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/phieu-thu/tao-moi')}>Tạo Phiếu Thu</Button>
      </div>

      {/* 🚀 ĐÃ KHÔI PHỤC: Khối Filter Tìm Kiếm, Lọc Khách Hàng */}
      <Space style={{ marginBottom: 16 }} wrap>
        <Select 
          showSearch 
          placeholder="Lọc theo Khách hàng..." 
          style={{ width: 250 }} 
          allowClear 
          onChange={setKhachHangId} 
          optionFilterProp="label" 
          filterOption={(input, option) => String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
          options={khachHangList.map(kh => ({ value: kh.id, label: kh.ten_cong_ty }))} 
        />
        <Select placeholder="Hình thức" style={{ width: 150 }} allowClear onChange={setHinhThuc}>
          <Option value="CHUYEN_KHOAN">Chuyển khoản</Option>
          <Option value="TIEN_MAT">Tiền mặt</Option>
        </Select>
        <RangePicker format="DD/MM/YYYY" onChange={setDateRange} style={{ width: 250 }} />
      </Space>

      <Table columns={columns} dataSource={data} rowKey="id" loading={loading} pagination={{ current: page, pageSize: limit, total, onChange }} bordered />

      {/* Modal Chi Tiết (Đã fix so_tien_nhan_duoc) */}
      <Modal title={`Chi tiết Phiếu thu PT-${selectedPhieu?.id}`} open={detailModalVisible} onCancel={() => setDetailModalVisible(false)} footer={<Button onClick={() => setDetailModalVisible(false)}>Đóng</Button>} width={600}>
        {selectedPhieu && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text type="secondary">Khách hàng:</Text> <Text strong>{selectedPhieu.ten_cong_ty}</Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text type="secondary">Tham chiếu:</Text> <Text>{selectedPhieu.so_tham_chieu || 'N/A'}</Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text type="secondary">Tổng tiền:</Text> 
              <CurrencyText value={selectedPhieu.so_tien_nhan_duoc} style={{ fontSize: 18, color: '#52c41a' }}/>
            </div>
            
            <Text strong>Chi tiết phân bổ vào vận đơn:</Text>
            <Table 
              size="small"
              dataSource={selectedPhieu.chiTiet || []}
              rowKey="van_don_id"
              pagination={false}
              style={{ marginTop: 8 }}
              columns={[
                { title: 'Mã Vận đơn', dataIndex: 'van_don_id', fontWeight: 'bold' },
                { title: 'Số tiền phân bổ', dataIndex: 'so_tien_phan_bo', align: 'right', render: val => <CurrencyText value={val} /> }
              ]}
            />
            <div style={{ marginTop: 16, color: 'gray', fontStyle: 'italic' }}>Ghi chú: {selectedPhieu.ghi_chu || 'Không có'}</div>
          </div>
        )}
      </Modal>
    </Card>
  );
};
export default PhieuThuPage;
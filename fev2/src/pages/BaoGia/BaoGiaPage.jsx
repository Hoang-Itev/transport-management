import React, { useState, useEffect } from 'react';
import { Card, Select, Button, Table, Space, Typography, DatePicker, Tag, Drawer, Divider, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, EyeOutlined, SendOutlined, CheckCircleOutlined, CloseCircleOutlined, CarOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

import { baoGiaService } from '../../services/baoGiaService';
import { usePagination } from '../../hooks/usePagination';
import CurrencyText from '../../components/common/CurrencyText';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const BaoGiaPage = () => {
  const navigate = useNavigate();
  const { page, limit, total, setTotal, onChange } = usePagination(10);
  
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  
  // Bộ lọc
  const [trangThai, setTrangThai] = useState(null);
  const [dateRange, setDateRange] = useState([]);

  // UX Drawer (Ngăn kéo trượt)
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [baoGiaDetail, setBaoGiaDetail] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 🚀 Không còn fetch 1000 khách hàng nữa, Backend V2 đã JOIN sẵn ten_cong_ty
      const params = { page, limit, trangThai };
      if (dateRange && dateRange.length === 2) {
        params.tuNgay = dateRange[0].format('YYYY-MM-DD');
        params.denNgay = dateRange[1].format('YYYY-MM-DD');
      }
      const res = await baoGiaService.getList(params);
      if (res.success) {
        setData(res.data?.data || res.data || []);
        setTotal(res.pagination?.total || 0);
      }
    } catch (error) { message.error('Lỗi tải danh sách báo giá'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [page, limit, trangThai, dateRange]);

  // Gọi API lấy chi tiết để hiển thị trên Drawer
  const openDrawer = async (id) => {
    setDrawerVisible(true);
    setDrawerLoading(true);
    try {
      const res = await baoGiaService.getById(id);
      if (res.success) setBaoGiaDetail(res.data);
    } catch (error) { message.error('Lỗi tải chi tiết'); setDrawerVisible(false); }
    finally { setDrawerLoading(false); }
  };

  // Nút hành động nhanh
  const handleAction = async (id, actionType) => {
  try {
      if (actionType === 'GUI') {
          await baoGiaService.guiBaoGia(id);
          message.success('Đã chuyển sang trạng thái ĐÃ GỬI (SENT)');
      } else if (actionType === 'ACCEPTED') {
          // FIX: Truyền đúng biến trangThai vào payload
          await baoGiaService.xacNhan(id, { trangThai: 'ACCEPTED' });
          message.success('Tuyệt vời! Khách đã chốt đơn.');
      } else if (actionType === 'REJECTED') {
          // FIX: Truyền đúng biến trangThai
          await baoGiaService.tuChoi(id, { trangThai: 'REJECTED', lyDo: 'Khách đổi ý' });
          message.info('Đã hủy báo giá này.');
      }
      setDrawerVisible(false);
      fetchData();
  } catch (e) { message.error('Lỗi thao tác'); }
};



  const getStatusTag = (status) => {
    const statusMap = {
      DRAFT: { color: 'default', text: 'NHÁP' },
      SENT: { color: 'blue', text: 'ĐÃ GỬI KHÁCH' },
      ACCEPTED: { color: 'success', text: 'ĐÃ CHỐT' },
      REJECTED: { color: 'error', text: 'TỪ CHỐI / HỦY' }
    };
    return <Tag color={statusMap[status]?.color}>{statusMap[status]?.text}</Tag>;
  };

  const columns = [
  { title: 'Mã Báo Giá', dataIndex: 'id', fontWeight: 'bold' },
  { title: 'Khách hàng', dataIndex: 'ten_cong_ty', render: text => <Text strong style={{ color: '#1890ff' }}>{text}</Text> },
  { title: 'Tổng Tiền', dataIndex: 'tong_tien_sau_thue', align: 'right', render: v => <CurrencyText value={v} style={{ fontWeight: 'bold', color: '#cf1322' }} /> },
  { title: 'Hiệu lực đến', dataIndex: 'ngay_het_han', render: val => dayjs(val).format('DD/MM/YYYY') },
  { title: 'Trạng thái', dataIndex: 'trang_thai', align: 'center', render: val => getStatusTag(val) },
  { title: 'Thao tác', align: 'center', render: (_, record) => (
      <Space>
        {/* FIX UX: Thêm hiển thị Check/X nhanh ngoài bảng cho đơn đang chờ */}
        {record.trang_thai === 'SENT' && (
          <>
            <Button type="text" icon={<CheckCircleOutlined style={{ color: '#52c41a' }}/>} onClick={() => handleAction(record.id, 'ACCEPTED')} title="Khách ĐỒNG Ý" />
            <Button type="text" icon={<CloseCircleOutlined style={{ color: '#ff4d4f' }}/>} onClick={() => handleAction(record.id, 'REJECTED')} title="Khách TỪ CHỐI" />
          </>
        )}
        <Button type="text" icon={<EyeOutlined style={{ color: '#13c2c2' }}/>} onClick={() => openDrawer(record.id)} title="Xem Nhanh" />
        <Button type="text" icon={<EditOutlined style={{ color: '#fa8c16' }}/>} onClick={() => navigate(`/bao-gia/${record.id}`)} title="Mở chi tiết" />
      </Space>
    )
  }
];

  return (
    <Card variant="borderless">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>Danh sách Báo giá</Title>
        <Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => navigate('/bao-gia/tao-moi')} style={{ background: '#722ed1' }}>
          TẠO BÁO GIÁ MỚI
        </Button>
      </div>

      <Space style={{ marginBottom: 16 }} wrap>
        <Select placeholder="Lọc theo trạng thái" style={{ width: 200 }} allowClear onChange={setTrangThai}>
          <Option value="DRAFT">Nháp (DRAFT)</Option>
          <Option value="SENT">Đang chờ khách (SENT)</Option>
          <Option value="ACCEPTED">Đã chốt (ACCEPTED)</Option>
          <Option value="REJECTED">Thất bại (REJECTED)</Option>
        </Select>
        <RangePicker format="DD/MM/YYYY" onChange={(dates) => setDateRange(dates)} style={{ width: 250 }} />
      </Space>

      <Table columns={columns} dataSource={data} rowKey="id" loading={loading} pagination={{ current: page, pageSize: limit, total, onChange, showSizeChanger: true }} bordered />

      {/* 🚀 UX MAGIC: SLIDE-OUT DRAWER */}
      <Drawer
        title={baoGiaDetail ? `Báo giá: ${baoGiaDetail.id}` : 'Chi tiết báo giá'}
        placement="right"
        size="large"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        loading={drawerLoading}
        extra={
            baoGiaDetail && (
                <Button type="primary" onClick={() => navigate(`/bao-gia/${baoGiaDetail.id}`)}>Sửa / Chi Tiết</Button>
            )
        }
      >
        {baoGiaDetail && (
          <div>
            <div style={{ background: '#f5f5f5', padding: 15, borderRadius: 8, marginBottom: 20 }}>
                <Text type="secondary">Khách hàng:</Text><br/>
                <Text strong style={{ fontSize: 18, color: '#0050b3' }}>{baoGiaDetail.ten_cong_ty}</Text>
                <div style={{ marginTop: 10 }}>{getStatusTag(baoGiaDetail.trang_thai)}</div>
            </div>

            <Title level={5}>Danh sách chuyến ({baoGiaDetail.bookings?.length || 0})</Title>
            {baoGiaDetail.bookings?.map((bk, i) => (
                <Card size="small" key={i} style={{ marginBottom: 10, background: '#fafafa', border: '1px solid #e8e8e8' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text strong>{bk.tinh_di || 'Lấy hàng'} ➔ {bk.tinh_den || 'Giao hàng'}</Text>
                        <Tag color={bk.hinhThuc === 'LTL' ? 'blue' : 'purple'}>{bk.hinhThuc}</Tag>
                    </div>
                    <div style={{ marginTop: 8, color: '#cf1322', fontWeight: 'bold', textAlign: 'right' }}>
                        Cước: {Number(bk.tong_cuoc_chinh).toLocaleString()} đ
                    </div>
                </Card>
            ))}

            <Divider />

            <div style={{ textAlign: 'right', fontSize: 16 }}>
                Tổng cộng thanh toán:<br/>
                <Text strong style={{ fontSize: 24, color: '#cf1322' }}>{Number(baoGiaDetail.tong_tien_sau_thue).toLocaleString()} VNĐ</Text>
            </div>

            <Divider />

            {/* BLOCK HÀNH ĐỘNG NHANH */}
            <Space direction="vertical" style={{ width: '100%' }}>
                {baoGiaDetail.trang_thai === 'DRAFT' && (
                    <Button block type="primary" size="large" icon={<SendOutlined />} onClick={() => handleAction(baoGiaDetail.id, 'GUI')}>Chuyển trạng thái: ĐÃ GỬI KHÁCH</Button>
                )}
                {baoGiaDetail.trang_thai === 'SENT' && (
                    <>
                        <Popconfirm title="Khách đã chốt giá?" onConfirm={() => handleAction(baoGiaDetail.id, 'ACCEPTED')}>
                            <Button block style={{ background: '#52c41a', color: '#fff' }} size="large" icon={<CheckCircleOutlined />}>Khách ĐỒNG Ý</Button>
                        </Popconfirm>
                        <Popconfirm title="Khách từ chối?" onConfirm={() => handleAction(baoGiaDetail.id, 'REJECTED')}>
                            <Button block danger size="large" icon={<CloseCircleOutlined />}>Khách TỪ CHỐI</Button>
                        </Popconfirm>
                    </>
                )}
                {baoGiaDetail.trang_thai === 'ACCEPTED' && (
                    <Button block type="dashed" size="large" icon={<CarOutlined />} onClick={() => navigate(`/bao-gia/${baoGiaDetail.id}`)}>Vào tạo Vận Đơn Thực Tế</Button>
                )}
            </Space>
          </div>
        )}
      </Drawer>
    </Card>
  );
};

export default BaoGiaPage;
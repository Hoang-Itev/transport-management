import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Typography, Modal, Form, InputNumber, Select, DatePicker, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { danhMucService } from '../../services/danhMucService';
import { usePagination } from '../../hooks/usePagination';
import StatusTag from '../../components/common/StatusTag';
import CurrencyText from '../../components/common/CurrencyText';
import { formatDate } from '../../utils/formatDate';

const { Title } = Typography;

const BangGiaPage = () => {
  const [form] = Form.useForm();
  const { page, limit, total, setTotal, onChange } = usePagination(10);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Data cho Dropdown
  const [tuyenList, setTuyenList] = useState([]);
  const [loaiList, setLoaiList] = useState([]);
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    // Load danh mục chung
    danhMucService.getTuyenDuongList({ limit: 1000 }).then(res => setTuyenList(res.data));
    danhMucService.getLoaiHangList({ limit: 1000 }).then(res => setLoaiList(res.data));
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await danhMucService.getBangGiaList({ page, limit });
      if (res.success) { setData(res.data); setTotal(res.pagination.total); }
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [page, limit]);

  const openModal = (record = null) => {
    setEditingId(record?.id || null);
    if (record) { 
      form.setFieldsValue({ 
        tuyenDuongId: record.tuyen_duong_id, 
        loaiHangId: record.loai_hang_id,
        kgTu: Number(record.kg_tu), kgDen: Number(record.kg_den), donGia: Number(record.don_gia),
        ngayApDung: dayjs(record.ngay_ap_dung),
        ngayHetHan: record.ngay_het_han ? dayjs(record.ngay_het_han) : null
      }); 
    } 
    else { form.resetFields(); }
    setIsModalVisible(true);
  };

  const handleSubmit = async (values) => {
    try {
      const payload = {
        ...values,
        ngayApDung: values.ngayApDung.format('YYYY-MM-DD'),
        ngayHetHan: values.ngayHetHan ? values.ngayHetHan.format('YYYY-MM-DD') : null
      };
      if (editingId) await danhMucService.updateBangGia(editingId, payload);
      else await danhMucService.createBangGia(payload);
      
      message.success('Lưu bảng giá thành công');
      setIsModalVisible(false); fetchData();
    } catch (error) { message.error(error?.error?.code === 'BANG_GIA_OVERLAP' ? 'Khoảng Kg hoặc Ngày áp dụng bị trùng lặp!' : 'Lỗi lưu dữ liệu'); }
  };

  const columns = [
   { 
  title: 'Tuyến', 
  render: (_, r) => {
    const t = tuyenList.find(x => x.id === r.tuyen_duong_id);
    return t ? `${t.tinh_di} ➔ ${t.tinh_den}` : `Tuyến ${r.tuyen_duong_id}`;
  }
},
    { title: 'Loại', render: (_, r) => loaiList.find(l => l.id === r.loai_hang_id)?.ten || `Loại ${r.loai_hang_id}` },
    { title: 'Từ (Kg)', dataIndex: 'kg_tu', align: 'right' },
    { title: 'Đến (Kg)', dataIndex: 'kg_den', align: 'right' },
    { title: 'Đơn giá', dataIndex: 'don_gia', align: 'right', render: v => <CurrencyText value={v} /> },
    { title: 'Hiệu lực', render: (_, r) => `${formatDate(r.ngay_ap_dung)} - ${r.ngay_het_han ? formatDate(r.ngay_het_han) : 'Vô thời hạn'}` },
    { title: 'Thao tác', align: 'center', render: (_, record) => (
        <Space>
          <Button type="text" icon={<EditOutlined style={{ color: '#fa8c16' }}/>} onClick={() => openModal(record)} />
          <Button type="text" danger icon={<DeleteOutlined />} onClick={() => danhMucService.deleteBangGia(record.id).then(fetchData)} />
        </Space>
      )
    }
  ];

  return (
    <Card bordered={false}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Quản lý Bảng giá cước</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>Thêm giá mới</Button>
      </div>
      <Table columns={columns} dataSource={data} rowKey="id" loading={loading} pagination={{ current: page, pageSize: limit, total, onChange }} bordered />
      
      <Modal width={600} title={editingId ? "Sửa bảng giá" : "Thêm bảng giá"} open={isModalVisible} onCancel={() => setIsModalVisible(false)} onOk={() => form.submit()} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Space size="large" style={{ display: 'flex' }}>
            <Form.Item name="tuyenDuongId" label="Tuyến đường" rules={[{ required: true }]} style={{ width: 250 }}>
              <Select showSearch options={tuyenList.map(t => ({ value: t.id, label: `${t.tinh_di} - ${t.tinh_den}` }))} />
            </Form.Item>
            <Form.Item name="loaiHangId" label="Loại hàng" rules={[{ required: true }]} style={{ width: 250 }}>
              <Select showSearch options={loaiList.map(l => ({ value: l.id, label: l.ten }))} />
            </Form.Item>
          </Space>
          <Space size="large" style={{ display: 'flex' }}>
            <Form.Item name="kgTu" label="Từ (Kg)" rules={[{ required: true }]}><InputNumber min={0} /></Form.Item>
            <Form.Item name="kgDen" label="Đến (Kg)" rules={[{ required: true }]}><InputNumber min={0} /></Form.Item>
            <Form.Item name="donGia" label="Đơn giá (VNĐ)" rules={[{ required: true }]}><InputNumber min={1} style={{ width: 150 }} /></Form.Item>
          </Space>
          <Space size="large" style={{ display: 'flex' }}>
            <Form.Item name="ngayApDung" label="Ngày áp dụng" rules={[{ required: true }]}><DatePicker format="DD/MM/YYYY" /></Form.Item>
            <Form.Item name="ngayHetHan" label="Ngày hết hạn (Tùy chọn)"><DatePicker format="DD/MM/YYYY" /></Form.Item>
          </Space>
        </Form>
      </Modal>
    </Card>
  );
};
export default BangGiaPage;
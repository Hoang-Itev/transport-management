import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Input, Space, Typography, Modal, Form, InputNumber, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { danhMucService } from '../../services/danhMucService';
import { usePagination } from '../../hooks/usePagination';
import StatusTag from '../../components/common/StatusTag';

const { Title } = Typography;

const TuyenDuongPage = () => {
  const [form] = Form.useForm();
  const { page, limit, total, setTotal, onChange } = usePagination(10);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await danhMucService.getTuyenDuongList({ page, limit, search });
      if (res.success) { setData(res.data); setTotal(res.pagination.total); }
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [page, limit, search]);

  const openModal = (record = null) => {
    setEditingId(record?.id || null);
    if (record) { form.setFieldsValue({ tinhDi: record.tinh_di, tinhDen: record.tinh_den, km: Number(record.km) }); } 
    else { form.resetFields(); }
    setIsModalVisible(true);
  };

  const handleSubmit = async (values) => {
    try {
      if (editingId) { await danhMucService.updateTuyenDuong(editingId, values); } 
      else { await danhMucService.createTuyenDuong(values); }
      message.success('Lưu tuyến đường thành công');
      setIsModalVisible(false); fetchData();
    } catch (error) { message.error(error?.error?.code === 'TUYEN_DUONG_DA_TON_TAI' ? 'Tuyến đường này đã tồn tại!' : 'Có lỗi xảy ra'); }
  };

  const handleDelete = (id) => {
    Modal.confirm({
      title: 'Xóa tuyến đường?', okType: 'danger',
      onOk: async () => {
        try { await danhMucService.deleteTuyenDuong(id); message.success('Đã xóa'); fetchData(); } 
        catch (error) { message.error('Dữ liệu đang được sử dụng!'); }
      }
    });
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: 'Tỉnh đi', dataIndex: 'tinh_di' },
    { title: 'Tỉnh đến', dataIndex: 'tinh_den' },
    { title: 'Khoảng cách (km)', dataIndex: 'km', align: 'right' },
    { title: 'Trạng thái', dataIndex: 'is_active', render: val => <StatusTag status={val} />, width: 150 },
    { title: 'Thao tác', align: 'center', render: (_, record) => (
        <Space>
          <Button type="text" icon={<EditOutlined style={{ color: '#fa8c16' }}/>} onClick={() => openModal(record)} />
          {record.is_active === 1 && <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} />}
        </Space>
      )
    }
  ];

  return (
    <Card bordered={false}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Quản lý Tuyến đường</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>Thêm mới</Button>
      </div>
      <Input placeholder="Tìm tỉnh đi/đến..." prefix={<SearchOutlined />} style={{ width: 300, marginBottom: 16 }} allowClear onBlur={e => setSearch(e.target.value)} onPressEnter={e => setSearch(e.target.value)} />
      <Table columns={columns} dataSource={data} rowKey="id" loading={loading} pagination={{ current: page, pageSize: limit, total, onChange }} bordered />
      
      <Modal title={editingId ? "Sửa tuyến đường" : "Thêm tuyến đường"} open={isModalVisible} onCancel={() => setIsModalVisible(false)} onOk={() => form.submit()} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="tinhDi" label="Tỉnh đi" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="tinhDen" label="Tỉnh đến" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="km" label="Khoảng cách (Km)" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={1} /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};
export default TuyenDuongPage;
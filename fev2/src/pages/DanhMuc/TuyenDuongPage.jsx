import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Input, Space, Typography, Modal, Form, InputNumber, message, Tag } from 'antd'; // Thêm Tag
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { danhMucService } from '../../services/danhMucService';
import { usePagination } from '../../hooks/usePagination';

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
      title: 'Xóa tuyến đường?', 
      content: 'Tuyến đường sẽ được chuyển sang trạng thái ngưng hoạt động.',
      okType: 'danger',
      onOk: async () => {
        try { await danhMucService.deleteTuyenDuong(id); message.success('Đã ngưng hoạt động'); fetchData(); } 
        catch (error) { message.error('Dữ liệu đang được sử dụng!'); }
      }
    });
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: 'Tỉnh đi', dataIndex: 'tinh_di' },
    { title: 'Tỉnh đến', dataIndex: 'tinh_den' },
    { title: 'Khoảng cách (km)', dataIndex: 'km', align: 'right' },
    { 
      title: 'Trạng thái', 
      dataIndex: 'is_active', 
      width: 150,
      align: 'center',
      // FIX: Hiển thị chữ "Ngưng hoạt động" chuẩn xác
      render: (val) => (val === 1 || val === true) 
        ? <Tag color="success">Đang hoạt động</Tag> 
        : <Tag color="default">Ngưng hoạt động</Tag>
    },
    { title: 'Thao tác', align: 'center', render: (_, record) => (
        <Space>
          <Button type="text" icon={<EditOutlined style={{ color: '#fa8c16' }}/>} onClick={() => openModal(record)} />
          {(record.is_active === 1 || record.is_active === true) && (
            <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} title="Ngưng hoạt động" />
          )}
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
      
      {/* FIX: Dùng Input.Search để tìm kiếm mượt hơn */}
      <Input.Search 
        placeholder="Tìm tỉnh đi/đến..." 
        enterButton={<SearchOutlined />} 
        style={{ width: 300, marginBottom: 16 }} 
        allowClear 
        onSearch={(value) => {
          setSearch(value);
          onChange(1, limit); // Ép về trang 1 khi tìm
        }}
        onChange={(e) => {
          if (!e.target.value) {
            setSearch('');
            onChange(1, limit);
          }
        }} 
      />
      
      <Table columns={columns} dataSource={data} rowKey="id" loading={loading} pagination={{ current: page, pageSize: limit, total, onChange }} bordered />
      
      <Modal title={editingId ? "Sửa tuyến đường" : "Thêm tuyến đường"} open={isModalVisible} onCancel={() => setIsModalVisible(false)} onOk={() => form.submit()} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="tinhDi" label="Tỉnh đi" rules={[{ required: true, message: 'Vui lòng nhập tỉnh đi' }]}><Input /></Form.Item>
          <Form.Item name="tinhDen" label="Tỉnh đến" rules={[{ required: true, message: 'Vui lòng nhập tỉnh đến' }]}><Input /></Form.Item>
          <Form.Item name="km" label="Khoảng cách (Km)" rules={[{ required: true, message: 'Vui lòng nhập khoảng cách' }]}><InputNumber style={{ width: '100%' }} min={1} /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};
export default TuyenDuongPage;
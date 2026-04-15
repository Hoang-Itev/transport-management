import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Input, Space, Typography, Modal, Form, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { danhMucService } from '../../services/danhMucService';
import { usePagination } from '../../hooks/usePagination';
import StatusTag from '../../components/common/StatusTag';

const { Title } = Typography;

const LoaiHangPage = () => {
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
      const res = await danhMucService.getLoaiHangList({ page, limit, search });
      if (res.success) {
        setData(res.data);
        setTotal(res.pagination.total);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [page, limit, search]);

  const openModal = (record = null) => {
    setEditingId(record?.id || null);
    if (record) {
      form.setFieldsValue({ ten: record.ten, moTa: record.mo_ta });
    } else {
      form.resetFields();
    }
    setIsModalVisible(true);
  };

  const handleSubmit = async (values) => {
    try {
      if (editingId) {
        await danhMucService.updateLoaiHang(editingId, values);
        message.success('Cập nhật thành công');
      } else {
        await danhMucService.createLoaiHang(values);
        message.success('Thêm mới thành công');
      }
      setIsModalVisible(false);
      fetchData();
    } catch (error) { message.error(error?.error?.message || 'Có lỗi xảy ra'); }
  };

  const handleDelete = (id) => {
    Modal.confirm({
      title: 'Xóa loại hàng?',
      content: 'Hành động này sẽ vô hiệu hóa loại hàng.',
      okType: 'danger',
      onOk: async () => {
        try {
          await danhMucService.deleteLoaiHang(id);
          message.success('Đã xóa');
          fetchData();
        } catch (error) { message.error('Không thể xóa do dữ liệu đang được sử dụng'); }
      }
    });
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: 'Tên loại hàng', dataIndex: 'ten', fontWeight: 'bold' },
    { title: 'Mô tả', dataIndex: 'mo_ta' },
    { title: 'Trạng thái', dataIndex: 'is_active', render: val => <StatusTag status={val} />, width: 150 },
    {
      title: 'Thao tác', width: 120, align: 'center',
      render: (_, record) => (
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
        <Title level={4} style={{ margin: 0 }}>Quản lý Loại hàng</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>Thêm mới</Button>
      </div>
      <Input placeholder="Tìm kiếm tên..." prefix={<SearchOutlined />} style={{ width: 300, marginBottom: 16 }} allowClear onBlur={e => setSearch(e.target.value)} onPressEnter={e => setSearch(e.target.value)} />
      <Table columns={columns} dataSource={data} rowKey="id" loading={loading} pagination={{ current: page, pageSize: limit, total, onChange }} bordered />
      
      <Modal title={editingId ? "Sửa loại hàng" : "Thêm loại hàng"} open={isModalVisible} onCancel={() => setIsModalVisible(false)} onOk={() => form.submit()} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="ten" label="Tên loại hàng" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="moTa" label="Mô tả"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};
export default LoaiHangPage;
import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Typography, Modal, Form, Input, InputNumber, message, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { danhMucService } from '../../services/danhMucService';

const { Title } = Typography;

const LoaiXePage = () => {
  const [form] = Form.useForm();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await danhMucService.getLoaiXeList();
      if (res.success) setData(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const openModal = (record = null) => {
    setEditingId(record?.id || null);
    if (record) {
      form.setFieldsValue({ id: record.id, tenHienThi: record.ten_hien_thi, taiTrongMaxKg: Number(record.tai_trong_max_kg) });
    } else {
      form.resetFields();
    }
    setIsModalVisible(true);
  };

  const handleSubmit = async (values) => {
    try {
      if (editingId) {
        await danhMucService.updateLoaiXe(editingId, values);
        message.success('Cập nhật loại xe thành công');
      } else {
        await danhMucService.createLoaiXe(values);
        message.success('Thêm loại xe thành công');
      }
      setIsModalVisible(false);
      fetchData();
    } catch (error) { message.error('Mã loại xe đã tồn tại hoặc có lỗi xảy ra'); }
  };

  const handleDelete = (id) => {
    Modal.confirm({
      title: 'Ngưng hoạt động loại xe này?',
      content: 'Loại xe này sẽ không hiển thị khi làm Báo giá FTL nữa.',
      okType: 'danger',
      onOk: async () => {
        try {
          await danhMucService.deleteLoaiXe(id);
          message.success('Đã ngưng hoạt động');
          fetchData();
        } catch (error) { message.error('Lỗi thao tác'); }
      }
    });
  };

  // Logic Lọc dữ liệu bằng Search (Client-side)
  const filteredData = data.filter(item => 
    item.ten_hien_thi.toLowerCase().includes(searchText.toLowerCase()) || 
    item.id.toLowerCase().includes(searchText.toLowerCase())
  );

  const columns = [
    { 
      title: 'Mã loại xe', 
      dataIndex: 'id', 
      fontWeight: 'bold',
      sorter: (a, b) => a.id.localeCompare(b.id)
    },
    { 
      title: 'Tên hiển thị', 
      dataIndex: 'ten_hien_thi',
      sorter: (a, b) => a.ten_hien_thi.localeCompare(b.ten_hien_thi) 
    },
    { 
      title: 'Tải trọng Max (Kg)', 
      dataIndex: 'tai_trong_max_kg', 
      align: 'right', 
      sorter: (a, b) => Number(a.tai_trong_max_kg) - Number(b.tai_trong_max_kg),
      render: val => Number(val).toLocaleString('vi-VN') 
    },
    { 
      title: 'Trạng thái', 
      dataIndex: 'is_active', 
      align: 'center', 
      sorter: (a, b) => a.is_active - b.is_active,
      render: val => (val === 1 || val === true) ? <Tag color="success">Hoạt động</Tag> : <Tag color="default">Ngưng</Tag> 
    },
    { 
      title: 'Thao tác', 
      align: 'center', 
      render: (_, record) => {
        const isActive = record.is_active === 1 || record.is_active === true;
        return (
          <Space>
            {isActive && (
              <>
                <Button type="text" icon={<EditOutlined style={{ color: '#fa8c16' }}/>} onClick={() => openModal(record)} />
                <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} />
              </>
            )}
          </Space>
        );
      }
    }
  ];

  return (
    <Card bordered={false}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Quản lý Loại xe (FTL)</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>Thêm Loại xe</Button>
      </div>

      <Input.Search 
        placeholder="Tìm kiếm theo mã xe hoặc tên xe..." 
        allowClear
        enterButton={<SearchOutlined />} 
        style={{ width: 350, marginBottom: 16 }} 
        onChange={(e) => setSearchText(e.target.value)} 
      />

      <Table 
        columns={columns} 
        dataSource={filteredData} 
        rowKey="id" 
        loading={loading} 
        pagination={{ pageSize: 10, showSizeChanger: true }} 
        bordered 
      />
      
      <Modal title={editingId ? "Sửa loại xe" : "Thêm loại xe"} open={isModalVisible} onCancel={() => setIsModalVisible(false)} onOk={() => form.submit()} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="id" label="Mã loại xe (VD: XE_1.25T)" rules={[{ required: true }]}>
            <Input disabled={!!editingId} placeholder="Viết liền, không dấu" />
          </Form.Item>
          <Form.Item name="tenHienThi" label="Tên hiển thị (VD: Xe tải 1.25 Tấn)" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="taiTrongMaxKg" label="Tải trọng tối đa (Kg)" rules={[{ required: true }]}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default LoaiXePage;
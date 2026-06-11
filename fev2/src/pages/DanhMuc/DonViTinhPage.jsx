import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Typography, Modal, Form, Input, message, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { danhMucService } from '../../services/danhMucService';

const { Title } = Typography;

const DonViTinhPage = () => {
  const [form] = Form.useForm();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await danhMucService.getDonViTinhList();
      if (res.success) setData(res.data?.data || res.data || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const openModal = (record = null) => {
    setEditingId(record?.id || null);
    if (record) {
      form.setFieldsValue({ ten_dvt: record.ten_dvt, is_active: record.is_active });
    } else { 
      form.resetFields(); 
      form.setFieldsValue({ is_active: true });
    }
    setIsModalVisible(true);
  };

  const handleSubmit = async (values) => {
    try {
      if (editingId) { await danhMucService.updateDonViTinh(editingId, values); } 
      else { await danhMucService.createDonViTinh(values); }
      message.success('Thao tác thành công');
      setIsModalVisible(false);
      fetchData();
    } catch (error) { message.error('Lỗi thao tác hoặc tên đơn vị đã tồn tại'); }
  };

  const handleDelete = (id) => {
    Modal.confirm({ 
        title: 'Xóa đơn vị tính này?', 
        content: 'Chỉ nên xóa khi chưa có dữ liệu nào sử dụng đơn vị này.',
        okType: 'danger', 
        onOk: async () => {
            try { 
                await danhMucService.deleteDonViTinh(id); 
                message.success('Đã xóa thành công'); 
                fetchData(); 
            } catch (error) { message.error('Không thể xóa vì dữ liệu đang được sử dụng ở Báo giá/Vận đơn'); }
        }
    });
  };

  const filteredData = data.filter(item => 
    item.ten_dvt.toLowerCase().includes(searchText.toLowerCase())
  );

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 80, sorter: (a, b) => a.id - b.id },
    { title: 'Tên Đơn vị tính', dataIndex: 'ten_dvt', fontWeight: 'bold', sorter: (a, b) => a.ten_dvt.localeCompare(b.ten_dvt) },
    { title: 'Trạng thái', dataIndex: 'is_active', align: 'center', sorter: (a, b) => a.is_active - b.is_active,
      render: val => (val === 1 || val === true) ? <Tag color="success">Hoạt động</Tag> : <Tag color="default">Ngưng</Tag> 
    },
    { title: 'Thao tác', align: 'center', width: 150, render: (_, record) => (
        <Space>
          <Button type="text" icon={<EditOutlined style={{ color: '#fa8c16' }}/>} onClick={() => openModal(record)} />
          <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} />
        </Space>
      )
    }
  ];

  return (
    <Card bordered={false}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Quản lý Đơn vị tính</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>Thêm mới</Button>
      </div>

      <Input.Search 
        placeholder="Tìm kiếm theo tên đơn vị..." 
        allowClear
        enterButton={<SearchOutlined />} 
        style={{ width: 350, marginBottom: 16 }} 
        onChange={(e) => setSearchText(e.target.value)} 
      />

      <Table columns={columns} dataSource={filteredData} rowKey="id" loading={loading} pagination={{ pageSize: 10, showSizeChanger: true }} bordered />
      
      <Modal title={editingId ? "Sửa đơn vị tính" : "Thêm đơn vị tính"} open={isModalVisible} onCancel={() => setIsModalVisible(false)} onOk={() => form.submit()} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="ten_dvt" label="Tên đơn vị tính (VD: Thùng, Cuộn, Pallet)" rules={[{ required: true, message: 'Vui lòng nhập tên' }]}><Input /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};
export default DonViTinhPage;
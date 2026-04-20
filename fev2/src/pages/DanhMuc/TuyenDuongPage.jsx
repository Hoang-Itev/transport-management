import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Input, Space, Typography, Modal, Form, InputNumber, message, Tag } from 'antd';
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
    // Trim khoảng trắng thừa để tránh lỗi (VD: "Hà Nội " và "Hà Nội")
    const payload = {
        ...values,
        tinhDi: values.tinhDi.trim(),
        tinhDen: values.tinhDen.trim()
    };

    try {
      if (editingId) { await danhMucService.updateTuyenDuong(editingId, payload); } 
      else { await danhMucService.createTuyenDuong(payload); }
      message.success('Lưu tuyến đường thành công');
      setIsModalVisible(false); fetchData();
    } catch (error) { 
      // FIX LỖI: Bắt thông báo trùng tuyến đường từ API 
      const errorMsg = error?.response?.data?.error?.message || error?.error?.message;
      if (error?.error?.code === 'TUYEN_DUONG_DA_TON_TAI' || errorMsg?.includes('tồn tại')) {
          message.error('LỖI: Tuyến đường này đã tồn tại trong hệ thống!');
      } else {
          message.error('Có lỗi xảy ra khi lưu dữ liệu');
      }
    }
  };

  const handleDelete = (id) => {
    Modal.confirm({
      title: 'Ngưng hoạt động tuyến đường?', 
      content: 'Tuyến đường này và các bảng giá liên quan sẽ bị ngưng hoạt động.',
      okType: 'danger',
      onOk: async () => {
        try { 
            await danhMucService.deleteTuyenDuong(id); 
            message.success('Đã ngưng hoạt động thành công'); 
            fetchData(); 
        } 
        catch (error) { message.error('Lỗi: Không thể thao tác!'); }
      }
    });
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 80, sorter: (a, b) => a.id - b.id },
    { title: 'Tỉnh đi', dataIndex: 'tinh_di', sorter: (a, b) => a.tinh_di.localeCompare(b.tinh_di) },
    { title: 'Tỉnh đến', dataIndex: 'tinh_den', sorter: (a, b) => a.tinh_den.localeCompare(b.tinh_den) },
    { title: 'Khoảng cách (km)', dataIndex: 'km', align: 'right', sorter: (a, b) => Number(a.km) - Number(b.km) },
    { 
      title: 'Trạng thái', 
      dataIndex: 'is_active', 
      width: 150,
      align: 'center',
      render: (val) => (Number(val) === 1 || val === true) 
        ? <Tag color="success">Đang hoạt động</Tag> 
        : <Tag color="default">Ngưng hoạt động</Tag>
    },
    { 
        title: 'Thao tác', 
        align: 'center', 
        render: (_, record) => {
            // FIX LỖI: Gom chung điều kiện, ẩn hoàn toàn cả nút Sửa và Xóa nếu Tuyến đã bị ngưng
            const isActive = Number(record.is_active) === 1 || record.is_active === true;
            return (
                <Space>
                    {isActive && (
                        <>
                            <Button type="text" icon={<EditOutlined style={{ color: '#fa8c16' }}/>} onClick={() => openModal(record)} title="Sửa tuyến đường"/>
                            <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} title="Ngưng hoạt động" />
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
        <Title level={4} style={{ margin: 0 }}>Quản lý Tuyến đường</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>Thêm mới</Button>
      </div>
      
      <Input.Search 
        placeholder="Tìm tỉnh đi/đến..." 
        enterButton={<SearchOutlined />} 
        style={{ width: 300, marginBottom: 16 }} 
        allowClear 
        onSearch={(value) => {
          setSearch(value);
          onChange(1, limit); 
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
          <Form.Item 
            name="tinhDi" 
            label="Tỉnh đi" 
            rules={[{ required: true, message: 'Vui lòng nhập tỉnh đi' }]}
          >
              <Input placeholder="VD: Hồ Chí Minh" />
          </Form.Item>
          
          <Form.Item 
            name="tinhDen" 
            label="Tỉnh đến" 
            dependencies={['tinhDi']}
            rules={[
                { required: true, message: 'Vui lòng nhập tỉnh đến' },
                // FIX LỖI: Logic chặn trùng Tỉnh đi và Tỉnh đến ngay trên form
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    const tinhDi = getFieldValue('tinhDi');
                    if (!value || !tinhDi) return Promise.resolve();
                    
                    if (value.trim().toLowerCase() === tinhDi.trim().toLowerCase()) {
                      return Promise.reject(new Error('Tỉnh đến không được trùng với Tỉnh đi!'));
                    }
                    return Promise.resolve();
                  },
                }),
            ]}
          >
              <Input placeholder="VD: Hà Nội" />
          </Form.Item>
          
          <Form.Item 
            name="km" 
            label="Khoảng cách (Km)" 
            rules={[{ required: true, message: 'Vui lòng nhập khoảng cách' }]}
          >
              <InputNumber style={{ width: '100%' }} min={1} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};
export default TuyenDuongPage;
import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Input, Space, Typography, Modal, Form, message, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { danhMucService } from '../../services/danhMucService';
import { usePagination } from '../../hooks/usePagination';

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
      title: 'Ngưng hoạt động loại hàng?',
      content: 'Loại hàng này và các bảng giá cước liên quan sẽ bị ngưng hoạt động.',
      okType: 'danger',
      onOk: async () => {
        try {
          await danhMucService.deleteLoaiHang(id);
          message.success('Đã ngưng hoạt động thành công');
          fetchData();
        } catch (error) { message.error('Không thể thao tác do dữ liệu đang bị ràng buộc'); }
      }
    });
  };

  const columns = [
    { 
      title: 'ID', 
      dataIndex: 'id', 
      width: 80,
      sorter: (a, b) => a.id - b.id // Thêm tính năng sắp xếp theo ID
    },
    { 
      title: 'Tên loại hàng', 
      dataIndex: 'ten', 
      fontWeight: 'bold',
      sorter: (a, b) => a.ten.localeCompare(b.ten) // Thêm tính năng sắp xếp chữ cái A-Z
    },
    { 
      title: 'Mô tả', 
      dataIndex: 'mo_ta' 
    },
    { 
      title: 'Trạng thái', 
      dataIndex: 'is_active', 
      align: 'center',
      width: 150,
      // Hiển thị chuẩn trạng thái
      render: (val) => (val === 1 || val === true) 
        ? <Tag color="success">Đang hoạt động</Tag> 
        : <Tag color="default">Ngưng hoạt động</Tag>
    },
    {
      title: 'Thao tác', 
      width: 120, 
      align: 'center',
      render: (_, record) => {
        // Kiểm tra biến trạng thái
        const isActive = record.is_active === 1 || record.is_active === true;
        return (
          <Space>
            {/* Chỉ hiển thị nút Sửa/Xóa khi Loại hàng đang hoạt động */}
            {isActive && (
              <>
                <Button type="text" icon={<EditOutlined style={{ color: '#fa8c16' }}/>} onClick={() => openModal(record)} title="Chỉnh sửa" />
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
        <Title level={4} style={{ margin: 0 }}>Quản lý Loại hàng</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>Thêm mới</Button>
      </div>

      {/* Dùng Input.Search chuẩn Ant Design */}
      <Input.Search 
        placeholder="Tìm kiếm tên loại hàng..." 
        enterButton={<SearchOutlined />} 
        style={{ width: 300, marginBottom: 16 }} 
        allowClear 
        onSearch={(value) => {
          setSearch(value);
          onChange(1, limit); // Nhảy về trang 1 để không lỗi hiển thị
        }} 
        onChange={(e) => {
          if (!e.target.value) {
            setSearch('');
            onChange(1, limit);
          }
        }}
      />

      <Table 
        columns={columns} 
        dataSource={data} 
        rowKey="id" 
        loading={loading} 
        pagination={{ current: page, pageSize: limit, total, onChange }} 
        bordered 
      />
      
      <Modal title={editingId ? "Sửa loại hàng" : "Thêm loại hàng"} open={isModalVisible} onCancel={() => setIsModalVisible(false)} onOk={() => form.submit()} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="ten" label="Tên loại hàng" rules={[{ required: true, message: 'Vui lòng nhập tên loại hàng' }]}><Input /></Form.Item>
          <Form.Item name="moTa" label="Mô tả"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};
export default LoaiHangPage;
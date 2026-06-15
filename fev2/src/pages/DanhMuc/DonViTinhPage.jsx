import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Typography, Modal, Form, Input, message, Tag, Select } from 'antd';
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
      // 🚀 FIX: Ép kiểu boolean cẩn thận cho 2 biến này
      form.setFieldsValue({ 
        ten_dvt: record.ten_dvt, 
        is_active: record.is_active === 1 || record.is_active === true,
        yeu_cau_kich_thuoc: record.yeu_cau_kich_thuoc === 1 || record.yeu_cau_kich_thuoc === true
      });
    } else { 
      form.resetFields(); 
      form.setFieldsValue({ is_active: true, yeu_cau_kich_thuoc: false }); // Mặc định thêm mới là false
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
    // 🚀 FIX: Thêm cột hiển thị Yêu cầu đo kích thước
    { 
      title: 'Đo kích thước (D/R/C)', 
      dataIndex: 'yeu_cau_kich_thuoc', 
      align: 'center',
      render: val => (val === 1 || val === true) ? <Tag color="blue">Bắt buộc đo</Tag> : <Tag>Chỉ cân Kg</Tag> 
    },
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
      
        <Modal title={editingId ? "Sửa đơn vị tính" : "Thêm đơn vị tính"} open={isModalVisible} onCancel={() => setIsModalVisible(false)} onOk={() => form.submit()} destroyOnHidden>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="ten_dvt" label="Tên đơn vị tính (VD: Thùng, Cuộn, Pallet)" rules={[{ required: true, message: 'Vui lòng nhập tên' }]}><Input /></Form.Item>
          
          {/* 🚀 FIX: Thêm ô chọn Yêu cầu Kích thước */}
          <Form.Item name="yeu_cau_kich_thuoc" label="Quy tắc tính thể tích" rules={[{ required: true }]}>
            <Select>
              <Select.Option value={true}>Bắt buộc đo Dài - Rộng - Cao (Chia 5000)</Select.Option>
              <Select.Option value={false}>Chỉ cân Kg thực tế (Không cần đo)</Select.Option>
            </Select>
          </Form.Item>

          {/* 🚀 FIX: Thêm ô Trạng thái để sửa lỗi Submit bị mất data is_active */}
          <Form.Item name="is_active" label="Trạng thái" rules={[{ required: true }]}>
            <Select>
              <Select.Option value={true}>Đang hoạt động</Select.Option>
              <Select.Option value={false}>Ngưng hoạt động</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};
export default DonViTinhPage;
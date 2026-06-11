import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Input, Space, Typography, Modal, Form, InputNumber, Select, message, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { danhMucService } from '../../services/danhMucService';
import { usePagination } from '../../hooks/usePagination';

const { Title } = Typography;
const { Option } = Select;

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
        setData(res.data?.data || res.data || []);
        setTotal(res.pagination?.total || 0);
      }
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [page, limit, search]);

  const openModal = (record = null) => {
    setEditingId(record?.id || null);
    if (record) {
      let parsedThuocTinh = [];
      try {
        if (record.cau_hinh_thuoc_tinh) {
          parsedThuocTinh = typeof record.cau_hinh_thuoc_tinh === 'string' ? JSON.parse(record.cau_hinh_thuoc_tinh) : record.cau_hinh_thuoc_tinh;
        }
      } catch (e) {}

      form.setFieldsValue({ 
        tenLoai: record.ten_loai, 
        heSoGia: Number(record.he_so_gia),
        cauHinhThuocTinh: parsedThuocTinh
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ heSoGia: 1.0, cauHinhThuocTinh: ['dai_cm', 'rong_cm', 'cao_cm'] }); 
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
    } catch (error) { message.error(error?.message || 'Có lỗi xảy ra'); }
  };

  const handleDelete = (id) => {
    Modal.confirm({
      title: 'Ngưng hoạt động loại hàng?',
      content: 'Loại hàng này sẽ không xuất hiện trong danh sách khi tạo báo giá nữa.',
      okType: 'danger',
      onOk: async () => {
        try {
          await danhMucService.deleteLoaiHang(id);
          message.success('Đã ngưng hoạt động thành công');
          fetchData();
        } catch (error) { message.error('Lỗi hệ thống khi thao tác'); }
      }
    });
  };

  const columns = [
    { 
      title: 'Tên loại hàng', 
      dataIndex: 'ten_loai', 
      fontWeight: 'bold',
      sorter: (a, b) => a.ten_loai.localeCompare(b.ten_loai) 
    },
    { 
      title: 'Hệ số cước (x)', 
      dataIndex: 'he_so_gia', 
      align: 'center', 
      sorter: (a, b) => Number(a.he_so_gia) - Number(b.he_so_gia),
      render: (val) => <Tag color="blue">{Number(val).toFixed(2)}</Tag> 
    },
    { 
      title: 'Thuộc tính form nhập liệu', 
      dataIndex: 'cau_hinh_thuoc_tinh', 
      render: (val) => {
        let arr = [];
        try { arr = typeof val === 'string' ? JSON.parse(val) : (val || []); } catch(e){}
        return arr.map(item => <Tag color="purple" key={item}>{item}</Tag>);
      }
    },
    { 
      title: 'Trạng thái', 
      dataIndex: 'is_active', 
      align: 'center', 
      sorter: (a, b) => a.is_active - b.is_active,
      render: (val) => (val === 1 || val === true) ? <Tag color="success">Hoạt động</Tag> : <Tag color="default">Ngưng</Tag> 
    },
    { 
      title: 'Thao tác', 
      width: 120, 
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
        <Title level={4} style={{ margin: 0 }}>Quản lý Loại hàng hóa</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>Thêm mới</Button>
      </div>

      <Input.Search 
        placeholder="Tìm kiếm tên loại hàng..." 
        enterButton={<SearchOutlined />} 
        style={{ width: 300, marginBottom: 16 }} 
        allowClear 
        onSearch={(value) => { setSearch(value); onChange(1, limit); }} 
        onChange={(e) => { if (!e.target.value) { setSearch(''); onChange(1, limit); } }} 
      />

      <Table 
        columns={columns} 
        dataSource={data} 
        rowKey="id" 
        loading={loading} 
        pagination={{ current: page, pageSize: limit, total, onChange, showSizeChanger: true }} 
        bordered 
      />
      
      <Modal title={editingId ? "Sửa loại hàng" : "Thêm loại hàng"} open={isModalVisible} onCancel={() => setIsModalVisible(false)} onOk={() => form.submit()} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="tenLoai" label="Tên loại hàng" rules={[{ required: true, message: 'Vui lòng nhập tên' }]}><Input /></Form.Item>
          <Form.Item name="heSoGia" label="Hệ số giá cước (Mặc định: 1.0 - Giá nền chuẩn)" rules={[{ required: true }]}>
            <InputNumber min={0.1} max={10} step={0.1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="cauHinhThuocTinh" label="Các trường thông tin cần Sales nhập (JSON)" rules={[{ required: true }]}>
            <Select mode="multiple" placeholder="Chọn thuộc tính...">
              <Option value="dai_cm">Chiều Dài (cm)</Option>
              <Option value="rong_cm">Chiều Rộng (cm)</Option>
              <Option value="cao_cm">Chiều Cao (cm)</Option>
              <Option value="nhiet_do_c">Nhiệt độ bảo quản (°C)</Option>
              <Option value="so_lit">Thể tích hóa chất (Lít)</Option>
              <Option value="loai_bon_chua">Loại bồn chứa</Option>
              <Option value="khong_xep_chong">Cảnh báo: Không xếp chồng</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default LoaiHangPage;
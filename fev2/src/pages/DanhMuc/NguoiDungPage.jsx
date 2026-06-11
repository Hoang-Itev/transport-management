import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Input, Space, Typography, Modal, Form, Select, message, Tag } from 'antd';
import { PlusOutlined, EditOutlined, LockOutlined, UnlockOutlined, SearchOutlined } from '@ant-design/icons';
import { danhMucService } from '../../services/danhMucService';
import { usePagination } from '../../hooks/usePagination';

const { Title } = Typography;
const { Option } = Select;

const NguoiDungPage = () => {
  const [form] = Form.useForm();
  const { page, limit, total, setTotal, onChange } = usePagination(10);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [search, setSearch] = useState('');
  const [vaiTro, setVaiTro] = useState(null);
  const [trangThai, setTrangThai] = useState(null);
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await danhMucService.getNguoiDungList({ page, limit, search, vaiTro, trangThai });
      if (res.success) {
        setData(res.data);
        setTotal(res.pagination.total);
      }
    } catch (error) { message.error('Lỗi tải danh sách người dùng'); } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [page, limit, search, vaiTro, trangThai]);

  const openModal = (record = null) => {
    setEditingId(record?.id || null);
    if (record) {
      form.setFieldsValue({
        tenDangNhap: record.ten_dang_nhap, hoTen: record.ho_ten, email: record.email, soDienThoai: record.so_dien_thoai, vaiTro: record.vai_tro,
      });
    } else { form.resetFields(); }
    setIsModalVisible(true);
  };

  const handleSubmit = async (values) => {
    try {
      if (editingId) {
        await danhMucService.updateNguoiDung(editingId, values);
        message.success('Cập nhật người dùng thành công');
      } else {
        await danhMucService.createNguoiDung(values);
        message.success('Tạo tài khoản thành công');
      }
      setIsModalVisible(false);
      fetchData();
    } catch (error) { message.error(error?.error?.message || 'Có lỗi xảy ra, có thể Tên đăng nhập đã tồn tại'); }
  };

  const handleToggleLock = (record) => {
    // BẢO VỆ TUYỆT ĐỐI TÀI KHOẢN ADMIN GỐC
    if (record.ten_dang_nhap === 'admin' || record.id === 1) {
       return message.error('Lỗi bảo mật: Không được phép khóa tài khoản Quản trị viên gốc!');
    }

    const isLocking = record.trang_thai === 'ACTIVE';
    Modal.confirm({
      title: isLocking ? 'Khóa tài khoản này?' : 'Mở khóa tài khoản này?',
      content: isLocking ? 'Người này sẽ bị văng ra và không thể đăng nhập vào hệ thống nữa.' : 'Họ sẽ có thể đăng nhập bình thường.',
      okType: isLocking ? 'danger' : 'primary',
      onOk: async () => {
        try {
          await danhMucService.khoaNguoiDung(record.id);
          message.success(`Đã ${isLocking ? 'khóa' : 'mở khóa'} tài khoản thành công`);
          fetchData();
        } catch (error) { message.error('Lỗi thao tác'); }
      }
    });
  };

  const columns = [
    { title: 'Tên đăng nhập', dataIndex: 'ten_dang_nhap', fontWeight: 'bold', sorter: (a, b) => a.ten_dang_nhap.localeCompare(b.ten_dang_nhap) },
    { title: 'Họ tên', dataIndex: 'ho_ten', sorter: (a, b) => a.ho_ten.localeCompare(b.ho_ten) },
    { title: 'Liên hệ', render: (_, r) => <div><div>{r.so_dien_thoai}</div><div style={{fontSize: 12, color: 'gray'}}>{r.email}</div></div> },
    { 
      title: 'Vai trò', dataIndex: 'vai_tro', sorter: (a, b) => a.vai_tro.localeCompare(b.vai_tro),
      render: (val) => {
        const colors = { MANAGER: 'magenta', SALE: 'blue', KE_TOAN: 'cyan' };
        return <Tag color={colors[val]}>{val}</Tag>;
      }
    },
    { 
      title: 'Trạng thái', dataIndex: 'trang_thai', sorter: (a, b) => a.trang_thai.localeCompare(b.trang_thai),
      render: (val) => <Tag color={val === 'ACTIVE' ? 'success' : 'error'}>{val}</Tag> 
    },
    {
      title: 'Thao tác', width: 120, align: 'center',
      render: (_, record) => {
        // Không cho phép hiện nút thao tác khóa đối với admin gốc
        const isRootAdmin = record.ten_dang_nhap === 'admin' || record.id === 1;
        
        return (
          <Space>
            <Button type="text" icon={<EditOutlined style={{ color: '#fa8c16' }}/>} onClick={() => openModal(record)} />
            {!isRootAdmin && (
                <Button 
                type="text" 
                danger={record.trang_thai === 'ACTIVE'} 
                style={{ color: record.trang_thai !== 'ACTIVE' ? '#52c41a' : undefined }}
                icon={record.trang_thai === 'ACTIVE' ? <LockOutlined /> : <UnlockOutlined />} 
                onClick={() => handleToggleLock(record)} 
                title={record.trang_thai === 'ACTIVE' ? "Khóa tài khoản" : "Mở khóa"}
                />
            )}
          </Space>
        );
      }
    }
  ];

  return (
    <Card bordered={false}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Quản lý Người dùng hệ thống</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>Cấp tài khoản mới</Button>
      </div>
      
      <Space style={{ marginBottom: 16 }} wrap>
        <Input placeholder="Tìm tên, username..." prefix={<SearchOutlined />} style={{ width: 220 }} allowClear onBlur={e => setSearch(e.target.value)} onPressEnter={e => setSearch(e.target.value)} />
        <Select placeholder="Vai trò" style={{ width: 150 }} allowClear onChange={setVaiTro}>
          <Option value="MANAGER">MANAGER</Option>
          <Option value="SALE">SALE</Option>
          <Option value="KE_TOAN">KẾ TOÁN</Option>
        </Select>
        <Select placeholder="Trạng thái" style={{ width: 150 }} allowClear onChange={setTrangThai}>
          <Option value="ACTIVE">Hoạt động</Option>
          <Option value="LOCKED">Bị khóa</Option>
        </Select>
      </Space>

      <Table columns={columns} dataSource={data} rowKey="id" loading={loading} pagination={{ current: page, pageSize: limit, total, onChange, showSizeChanger: true }} bordered />
      
      <Modal title={editingId ? "Sửa thông tin" : "Cấp tài khoản mới"} open={isModalVisible} onCancel={() => setIsModalVisible(false)} onOk={() => form.submit()} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Space size="large" style={{ display: 'flex' }}>
            <Form.Item name="tenDangNhap" label="Tên đăng nhập" rules={[{ required: true }]} style={{ width: 220 }}>
              <Input disabled={!!editingId} placeholder="Viết liền không dấu" />
            </Form.Item>
            <Form.Item name="matKhau" label={editingId ? "Mật khẩu mới (Để trống nếu giữ nguyên)" : "Mật khẩu"} rules={[{ required: !editingId, message: 'Bắt buộc nhập' }]} style={{ width: 220 }}>
              <Input.Password />
            </Form.Item>
          </Space>

          <Form.Item name="hoTen" label="Họ và tên" rules={[{ required: true }]}><Input /></Form.Item>
          
          <Space size="large" style={{ display: 'flex' }}>
            <Form.Item name="soDienThoai" label="Số điện thoại" style={{ width: 220 }}><Input /></Form.Item>
            <Form.Item name="email" label="Email" rules={[{ type: 'email' }]} style={{ width: 220 }}><Input /></Form.Item>
          </Space>

          <Form.Item name="vaiTro" label="Vai trò" rules={[{ required: true }]}>
            <Select>
              <Option value="MANAGER">Quản lý (Manager)</Option>
              <Option value="SALE">Kinh doanh (Sale)</Option>
              <Option value="KE_TOAN">Kế toán (Kế toán)</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};
export default NguoiDungPage;
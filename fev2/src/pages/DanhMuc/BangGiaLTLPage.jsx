import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Typography, Modal, Form, InputNumber, Input, message, Tag, Tabs } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { danhMucService } from '../../services/danhMucService';
import CurrencyText from '../../components/common/CurrencyText';

const { Title, Text } = Typography;

// =========================================================================
// TAB 1: COMPONENT QUẢN LÝ BẢNG GIÁ GỐC THEO KM
// =========================================================================
const TabBangGiaGoc = () => {
  const [form] = Form.useForm();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await danhMucService.getBangGiaLTL({});
      if (res.success) setData(res.data?.data || res.data || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const openModal = (record = null) => {
    setEditingId(record?.id || null);
    if (record) { 
      form.setFieldsValue({ 
  mocTuKm: Number(record.moc_tu_km), 
  mocDenKm: Number(record.moc_den_km), 
  donGiaGocKg: Number(record.don_gia_goc_kg),
  cuocToiThieu: Number(record.cuoc_toi_thieu) // Thêm dòng này
});
    } else { form.resetFields(); }
    setIsModalVisible(true);
  };

  const handleSubmit = async (values) => {
    try {
      if (editingId) await danhMucService.updateBangGiaLTL(editingId, values);
      else await danhMucService.createBangGiaLTL(values);
      message.success('Thành công');
      setIsModalVisible(false); fetchData();
    } catch (error) { message.error('Mốc Km có thể bị trùng lặp!'); }
  };

  const handleDelete = (id) => {
    Modal.confirm({ 
      title: 'Ngưng áp dụng dải Km này?', 
      content: 'Hệ thống sẽ Xóa mềm (Ngưng hoạt động). Các đơn hàng cũ không bị ảnh hưởng.',
      okType: 'danger', 
      onOk: async () => {
        try { await danhMucService.deleteBangGiaLTL(id); fetchData(); } catch (error) { message.error('Lỗi thao tác'); }
      }
    });
  };

  const handleClone = (record) => {
    setEditingId(null);
    form.setFieldsValue({ mocTuKm: Number(record.moc_den_km) + 0.1, mocDenKm: undefined, donGiaGocKg: Number(record.don_gia_goc_kg) });
    setIsModalVisible(true);
  };

  const filteredData = data.filter(item => 
    item.don_gia_goc_kg.toString().includes(searchText) || item.moc_tu_km.toString().includes(searchText)
  );

  const columns = [
    { title: 'Từ khoảng cách (Km)', dataIndex: 'moc_tu_km', align: 'right', sorter: (a, b) => Number(a.moc_tu_km) - Number(b.moc_tu_km) },
    { title: 'Đến khoảng cách (Km)', dataIndex: 'moc_den_km', align: 'right', sorter: (a, b) => Number(a.moc_den_km) - Number(b.moc_den_km) },
    { title: 'Cước tối thiểu (Min)', dataIndex: 'cuoc_toi_thieu', align: 'right', render: v => <CurrencyText value={v} /> },
    { title: 'Đơn Giá Gốc / 1 Kg', dataIndex: 'don_gia_goc_kg', align: 'right', render: v => <CurrencyText value={v} style={{color: '#1890ff', fontWeight: 'bold'}} /> },
    { title: 'Trạng thái', dataIndex: 'is_active', align: 'center', render: val => (val === 1 || val === true) ? <Tag color="success">Hoạt động</Tag> : <Tag color="default">Ngưng</Tag> },
    { title: 'Thao tác', align: 'center', render: (_, record) => {
        if (record.is_active !== 1 && record.is_active !== true) return null;
        return (
          <Space>
            <Button type="text" icon={<EditOutlined style={{ color: '#fa8c16' }}/>} onClick={() => openModal(record)} />
            <Button type="text" icon={<PlusOutlined style={{ color: '#52c41a' }}/>} onClick={() => handleClone(record)} title="Nhân bản nối tiếp" />
            <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} />
          </Space>
        );
      }
    }
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Input.Search placeholder="Tìm theo Đơn giá gốc hoặc Km..." allowClear enterButton={<SearchOutlined />} style={{ width: 350 }} onChange={(e) => setSearchText(e.target.value)} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>Thêm mốc Km mới</Button>
      </div>
      <Table columns={columns} dataSource={filteredData} rowKey="id" loading={loading} pagination={{ pageSize: 10, showSizeChanger: true }} bordered />
      
      <Modal title={editingId ? "Sửa Giá Gốc" : "Thêm Giá Gốc LTL"} open={isModalVisible} onCancel={() => setIsModalVisible(false)} onOk={() => form.submit()} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Space size="large" style={{ display: 'flex' }}>
            <Form.Item name="mocTuKm" label="Từ (Km)" rules={[{ required: true }]}><InputNumber min={0} style={{width: 200}} /></Form.Item>
            <Form.Item name="mocDenKm" label="Đến (Km)" dependencies={['mocTuKm']} rules={[{ required: true }, ({ getFieldValue }) => ({ validator(_, value) { if (!value || value > getFieldValue('mocTuKm')) return Promise.resolve(); return Promise.reject(new Error('Km Đến phải lớn hơn Km Từ!')); }, }),]}>
              <InputNumber min={1} style={{width: 200}} />
            </Form.Item>
          </Space>
          <Form.Item name="donGiaGocKg" label="Đơn giá gốc cho 1 Kg (VNĐ)" rules={[{ required: true }]}><InputNumber min={1} style={{ width: 200 }} /></Form.Item>
        </Form>
      </Modal>
    </>
  );
};

// =========================================================================
// TAB 2: COMPONENT QUẢN LÝ CHIẾT KHẤU SẢN LƯỢNG (KG)
// =========================================================================
const TabChietKhau = () => {
  const [form] = Form.useForm();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await danhMucService.getChietKhauLTL({});
      if (res.success) setData(res.data?.data || res.data || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const openModal = (record = null) => {
    setEditingId(record?.id || null);
    if (record) { 
      form.setFieldsValue({ 
        mocTuKg: Number(record.moc_tu_kg), mocDenKg: Number(record.moc_den_kg), heSoChietKhau: Number(record.he_so_chiet_khau)
      }); 
    } else { form.resetFields(); }
    setIsModalVisible(true);
  };

  const handleSubmit = async (values) => {
    try {
      if (editingId) await danhMucService.updateChietKhauLTL(editingId, values);
      else await danhMucService.createChietKhauLTL(values);
      message.success('Lưu chiết khấu thành công');
      setIsModalVisible(false); fetchData();
    } catch (error) { message.error('Mốc Kg này có thể bị trùng lặp!'); }
  };

  const handleDelete = (id) => {
    Modal.confirm({ 
      title: 'Xóa mốc chiết khấu này?', 
      content: 'Việc xóa cứng mốc này là AN TOÀN và không làm lỗi các Vận đơn cũ (Do tiền cước đã được hệ thống tính và lưu tĩnh vào đơn trước đó).',
      okType: 'danger', 
      onOk: async () => {
        try { await danhMucService.deleteChietKhauLTL(id); message.success('Xóa thành công'); fetchData(); } 
        catch (error) { message.error('Lỗi thao tác'); }
    }});
  };

  const handleClone = (record) => {
    setEditingId(null);
    form.setFieldsValue({ 
      mocTuKg: Number(record.moc_den_kg) + 0.1, 
      mocDenKg: undefined, 
      heSoChietKhau: Number(record.he_so_chiet_khau) 
    });
    setIsModalVisible(true);
  };

  const filteredData = data.filter(item => 
    item.he_so_chiet_khau.toString().includes(searchText) || item.moc_tu_kg.toString().includes(searchText)
  );

  const columns = [
    { title: 'Từ (Kg)', dataIndex: 'moc_tu_kg', align: 'right', sorter: (a, b) => Number(a.moc_tu_kg) - Number(b.moc_tu_kg) },
    { title: 'Đến (Kg)', dataIndex: 'moc_den_kg', align: 'right', sorter: (a, b) => Number(a.moc_den_kg) - Number(b.moc_den_kg) },
    { title: 'Hệ số Chiết Khấu', dataIndex: 'he_so_chiet_khau', align: 'center', sorter: (a, b) => Number(a.he_so_chiet_khau) - Number(b.he_so_chiet_khau), render: val => {
        const percent = Math.round((1 - Number(val)) * 100);
        return <Tag color={percent > 0 ? "orange" : "default"}>{val} (Giảm {percent}%)</Tag>;
    }},
    { title: 'Thao tác', align: 'center', render: (_, record) => (
        <Space>
          <Button type="text" icon={<EditOutlined style={{ color: '#fa8c16' }}/>} onClick={() => openModal(record)} />
          <Button type="text" icon={<PlusOutlined style={{ color: '#52c41a' }}/>} onClick={() => handleClone(record)} title="Nhân bản nối tiếp" />
          <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} />
        </Space>
      )
    }
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Input.Search placeholder="Tìm theo Hệ số hoặc Kg..." allowClear enterButton={<SearchOutlined />} style={{ width: 350 }} onChange={(e) => setSearchText(e.target.value)} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>Thêm mốc Chiết Khấu</Button>
      </div>
      <Table columns={columns} dataSource={filteredData} rowKey="id" loading={loading} pagination={{ pageSize: 10, showSizeChanger: true }} bordered />
      
      <Modal title={editingId ? "Sửa Chiết Khấu" : "Thêm Chiết Khấu LTL"} open={isModalVisible} onCancel={() => setIsModalVisible(false)} onOk={() => form.submit()} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Space size="large" style={{ display: 'flex' }}>
            <Form.Item name="mocTuKg" label="Từ (Kg)" rules={[{ required: true }]}><InputNumber min={0} style={{width: 200}} /></Form.Item>
            <Form.Item name="mocDenKg" label="Đến (Kg)" dependencies={['mocTuKg']} rules={[{ required: true }, ({ getFieldValue }) => ({ validator(_, value) { if (!value || value > getFieldValue('mocTuKg')) return Promise.resolve(); return Promise.reject(new Error('Kg Đến phải lớn hơn Kg Từ!')); }, }),]}>
              <InputNumber min={1} style={{width: 200}} />
            </Form.Item>
          </Space>
          <Form.Item name="heSoChietKhau" label="Hệ số nhân (VD: 0.8 là Giảm 20%, 1.0 là Không giảm)" rules={[{ required: true }]}>
            <InputNumber min={0.1} max={1.5} step={0.05} style={{ width: 200 }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

// =========================================================================
// MAIN PAGE: BỌC 2 TAB LẠI VỚI NHAU
// =========================================================================
const BangGiaLTLPage = () => {
  return (
    <Card bordered={false}>
      <Title level={4} style={{ margin: 0, marginBottom: 5 }}>Bảng Giá Hàng Ghép (LTL) & Chiết Khấu</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 20 }}>
        Công thức: [Đơn giá Gốc theo Km] × [Chargeable Weight] × [Hệ số Hàng] × [Hệ số Chiết khấu Kg]
      </Text>

      <Tabs defaultActiveKey="1" items={[
        { key: '1', label: '1. Cấu Hình Giá Nền (Theo Khoảng Cách Km)', children: <TabBangGiaGoc /> },
        { key: '2', label: '2. Cấu Hình Chiết Khấu (Theo Khối Lượng Kg)', children: <TabChietKhau /> }
      ]} />
    </Card>
  );
};

export default BangGiaLTLPage;
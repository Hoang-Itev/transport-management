import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Typography, Modal, Form, InputNumber, Select, message, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, FilterOutlined } from '@ant-design/icons';
import { danhMucService } from '../../services/danhMucService';
import CurrencyText from '../../components/common/CurrencyText';

const { Title, Text } = Typography;
const { Option } = Select;

const BangGiaFTLPage = () => {
  const [form] = Form.useForm();
  const [data, setData] = useState([]);
  const [xeList, setXeList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterXeId, setFilterXeId] = useState(null); // Lọc theo loại xe
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    danhMucService.getLoaiXeList().then(res => setXeList(res.data));
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await danhMucService.getBangGiaFTL({});
      if (res.success) setData(res.data?.data || res.data || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const openModal = (record = null) => {
    setEditingId(record?.id || null);
    if (record) { 
      form.setFieldsValue({ 
        loaiXeId: record.loai_xe_id,
        mocTuKm: Number(record.moc_tu_km), mocDenKm: Number(record.moc_den_km), 
        giaMoCua: Number(record.gia_mo_cua), donGiaKm: Number(record.don_gia_km)
      }); 
    } else { form.resetFields(); }
    setIsModalVisible(true);
  };

  const handleSubmit = async (values) => {
    try {
      if (editingId) await danhMucService.updateBangGiaFTL(editingId, values);
      else await danhMucService.createBangGiaFTL(values);
      message.success('Lưu cấu hình FTL thành công');
      setIsModalVisible(false); fetchData();
    } catch (error) { message.error('Mốc Km của xe này bị trùng lặp!'); }
  };

  const handleDelete = (id) => {
    Modal.confirm({ title: 'Ngưng áp dụng mốc giá này?', okType: 'danger', onOk: async () => {
        try { await danhMucService.deleteBangGiaFTL(id); fetchData(); } 
        catch (error) { message.error('Lỗi thao tác!'); }
    }});
  };

  const handleClone = (record) => {
  setEditingId(null);
  form.setFieldsValue({ 
    loaiXeId: record.loai_xe_id,
    mocTuKm: Number(record.moc_den_km) + 0.1, 
    mocDenKm: undefined, 
    giaMoCua: Number(record.gia_mo_cua),
    donGiaKm: Number(record.don_gia_km)
  });
  setIsModalVisible(true);
};

  // Logic lọc dữ liệu phía Client
  const filteredData = filterXeId ? data.filter(item => item.loai_xe_id === filterXeId) : data;

  const columns = [
    { title: 'Loại xe', dataIndex: 'loai_xe_id', render: (_, r) => <Text strong>{xeList.find(x => x.id === r.loai_xe_id)?.ten_hien_thi || r.loai_xe_id}</Text>, sorter: (a, b) => a.loai_xe_id.localeCompare(b.loai_xe_id) },
    { title: 'Từ (Km)', dataIndex: 'moc_tu_km', align: 'right', sorter: (a, b) => Number(a.moc_tu_km) - Number(b.moc_tu_km) },
    { title: 'Đến (Km)', dataIndex: 'moc_den_km', align: 'right', sorter: (a, b) => Number(a.moc_den_km) - Number(b.moc_den_km) },
    { title: 'Giá mở cửa (Fix)', dataIndex: 'gia_mo_cua', align: 'right', render: v => <CurrencyText value={v} /> },
    { title: 'Đơn giá / Km', dataIndex: 'don_gia_km', align: 'right', render: v => <CurrencyText value={v} /> },
    { title: 'Trạng thái', dataIndex: 'is_active', align: 'center', render: val => (val === 1 || val === true) ? <Tag color="success">Hoạt động</Tag> : <Tag color="default">Ngưng</Tag> },
    { title: 'Thao tác', align: 'center', width: 120, render: (_, record) => {
        if (record.is_active !== 1 && record.is_active !== true) return null;
        return (
  <Space>
    <Button type="text" icon={<EditOutlined style={{ color: '#fa8c16' }}/>} onClick={() => openModal(record)} />
    
    {/* CHÈN DÒNG NÀY VÀO */}
    <Button type="text" icon={<PlusOutlined style={{ color: '#52c41a' }}/>} onClick={() => handleClone(record)} title="Nhân bản nối tiếp" />

    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} />
  </Space>
);
      }
    }
  ];

  return (
    <Card bordered={false}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Cấu hình Cước Bao Xe (FTL Lũy Thoái)</Title>
          <Text type="secondary">Cước FTL = Giá mở cửa + (Số Km vượt * Đơn giá Km)</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>Thêm mốc Km mới</Button>
      </div>

      <Space style={{ marginBottom: 16 }}>
        <Select showSearch allowClear placeholder="Lọc theo Loại Xe tải" style={{ width: 250 }} suffixIcon={<FilterOutlined />} onChange={(val) => setFilterXeId(val)}>
          {xeList.filter(x => x.is_active === 1).map(x => <Option key={x.id} value={x.id}>{x.ten_hien_thi}</Option>)}
        </Select>
      </Space>

      <Table columns={columns} dataSource={filteredData} rowKey="id" loading={loading} pagination={{ pageSize: 10, showSizeChanger: true }} bordered />
      
      <Modal width={700} title={editingId ? "Sửa mốc giá FTL" : "Thêm mốc giá FTL"} open={isModalVisible} onCancel={() => setIsModalVisible(false)} onOk={() => form.submit()} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="loaiXeId" label="Loại Xe" rules={[{ required: true }]}>
            <Select showSearch>
              {xeList.filter(x => x.is_active === 1).map(x => <Option key={x.id} value={x.id}>{x.ten_hien_thi}</Option>)}
            </Select>
          </Form.Item>
          <Space size="large" style={{ display: 'flex' }}>
            <Form.Item name="mocTuKm" label="Từ khoảng cách (Km)" rules={[{ required: true }]}><InputNumber min={0} style={{width: 200}} /></Form.Item>
            <Form.Item name="mocDenKm" label="Đến khoảng cách (Km)" dependencies={['mocTuKm']} rules={[ { required: true }, ({ getFieldValue }) => ({ validator(_, value) { if (!value || value > getFieldValue('mocTuKm')) return Promise.resolve(); return Promise.reject(new Error('Km Đến phải lớn hơn Km Từ!')); }, }), ]}>
              <InputNumber min={1} style={{width: 200}} />
            </Form.Item>
          </Space>
          <Space size="large" style={{ display: 'flex' }}>
             <Form.Item name="giaMoCua" label="Giá mở cửa (Cho dải Km này)" rules={[{ required: true }]}><InputNumber style={{ width: 200 }} /></Form.Item>
             <Form.Item name="donGiaKm" label="Đơn giá / 1 Km vượt" rules={[{ required: true }]}><InputNumber style={{ width: 200 }} /></Form.Item>
          </Space>
        </Form>
      </Modal>
    </Card>
  );
};
export default BangGiaFTLPage;
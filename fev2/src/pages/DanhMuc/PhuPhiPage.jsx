import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Typography, Modal, Form, Input, Select, InputNumber, message, Tag, Tabs } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { danhMucService } from '../../services/danhMucService';
import CurrencyText from '../../components/common/CurrencyText';

const { Title, Text } = Typography;
const { Option } = Select;

// =========================================================================
// TAB 1: DANH SÁCH ĐỊNH NGHĨA PHỤ PHÍ
// =========================================================================
const TabDanhSachPhuPhi = ({ phuPhiList, fetchPhuPhiList, loading }) => {
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const openModal = (record = null) => {
    setEditingId(record?.id || null);
    if (record) form.setFieldsValue({ id: record.id, tenPhuPhi: record.ten_phu_phi, cachTinh: record.cach_tinh });
    else form.resetFields();
    setIsModalVisible(true);
  };

  const handleSubmit = async (values) => {
    try {
      if (editingId) await danhMucService.updatePhuPhi(editingId, values);
      else await danhMucService.createPhuPhi(values);
      message.success('Thao tác thành công');
      setIsModalVisible(false); fetchPhuPhiList();
    } catch (error) { message.error('Mã phụ phí đã tồn tại hoặc lỗi server'); }
  };

  const handleDelete = (id) => {
    Modal.confirm({ title: 'Ngưng sử dụng phụ phí này?', okType: 'danger', onOk: async () => {
        try { await danhMucService.deletePhuPhi(id); fetchPhuPhiList(); } catch (error) { message.error('Lỗi thao tác'); }
    }});
  };

  const filteredData = phuPhiList.filter(item => 
    item.ten_phu_phi.toLowerCase().includes(searchText.toLowerCase()) || item.id.toLowerCase().includes(searchText.toLowerCase())
  );

  const columns = [
    { title: 'Mã phụ phí', dataIndex: 'id', fontWeight: 'bold', sorter: (a, b) => a.id.localeCompare(b.id) },
    { title: 'Tên phụ phí', dataIndex: 'ten_phu_phi', sorter: (a, b) => a.ten_phu_phi.localeCompare(b.ten_phu_phi) },
    { title: 'Quy tắc tính tự động', dataIndex: 'cach_tinh', sorter: (a, b) => a.cach_tinh.localeCompare(b.cach_tinh), render: val => {
        if (val === 'THEO_LOAI_XE') return <Tag color="blue">Tính ma trận theo từng Loại xe</Tag>;
        if (val === 'THEO_KG') return <Tag color="orange">Nhân số tiền với Tổng Kg</Tag>;
        return <Tag color="default">Thu 1 khoản cố định</Tag>;
    }},
    { title: 'Thao tác', align: 'center', width: 120, render: (_, record) => (
        <Space>
          <Button type="text" icon={<EditOutlined style={{ color: '#fa8c16' }}/>} onClick={() => openModal(record)} />
          <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} />
        </Space>
      )
    }
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Input.Search placeholder="Tìm kiếm theo mã hoặc tên..." allowClear enterButton={<SearchOutlined />} style={{ width: 350 }} onChange={(e) => setSearchText(e.target.value)} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>Thêm Định Nghĩa Phụ phí</Button>
      </div>
      <Table columns={columns} dataSource={filteredData} rowKey="id" loading={loading} pagination={{ pageSize: 10, showSizeChanger: true }} bordered />
      
      <Modal title={editingId ? "Sửa phụ phí" : "Thêm phụ phí mới"} open={isModalVisible} onCancel={() => setIsModalVisible(false)} onOk={() => form.submit()} destroyOnHidden>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="id" label="Mã phụ phí (VD: PP_LAY)" rules={[{ required: true }]}><Input disabled={!!editingId} placeholder="Viết hoa, không dấu" /></Form.Item>
          <Form.Item name="tenPhuPhi" label="Tên phụ phí (VD: Phí lấy tận nơi)" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="cachTinh" label="Quy tắc tính toán" rules={[{ required: true }]}>
            <Select>
              <Option value="CO_DINH">Giá cố định 1 mức duy nhất</Option>
              <Option value="THEO_KG">Nhân đơn giá với Số Kg (VD: 200đ/kg)</Option>
              <Option value="THEO_LOAI_XE">Giá thay đổi theo Loại xe chạy đi lấy</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

// =========================================================================
// TAB 2: MA TRẬN GIÁ PHỤ PHÍ CỤ THỂ (BẢNG bang_gia_phu_phis)
// =========================================================================
const TabMaTranGia = ({ phuPhiList }) => {
  const [form] = Form.useForm();
  const [data, setData] = useState([]);
  const [xeList, setXeList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // 🚀 FIX: Dùng Form.useWatch để lấy giá trị realtime thay vì dùng State dễ sinh lỗi
  const currentPhuPhiId = Form.useWatch('phu_phi_id', form);
  
  // Suy ra quy tắc của phụ phí đang được chọn trong Form
  const selectedRule = phuPhiList.find(p => p.id === currentPhuPhiId)?.cach_tinh;

  useEffect(() => {
    danhMucService.getLoaiXeList().then(res => setXeList(res.data));
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await danhMucService.getBangGiaPhuPhi({});
      if (res.success) setData(res.data?.data || res.data || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const openModal = (record = null) => {
    setEditingId(record?.id || null);
    if (record) {
      form.setFieldsValue({ phu_phi_id: record.phu_phi_id, loai_xe_id: record.loai_xe_id, don_gia: Number(record.don_gia) });
    } else {
      form.resetFields();
    }
    setIsModalVisible(true);
  };

  const handlePhuPhiChange = () => {
    // Khi đổi Phụ phí, phải xóa Xe đi để tránh lưu rác vào DB
    form.setFieldsValue({ loai_xe_id: null }); 
  };

  const handleSubmit = async (values) => {
    try {
      const payload = {
        phu_phi_id: values.phu_phi_id,
        loai_xe_id: values.loai_xe_id || null, 
        don_gia: values.don_gia
      };

      if (editingId) await danhMucService.updateBangGiaPhuPhi(editingId, payload);
      else await danhMucService.createBangGiaPhuPhi(payload);
      
      message.success('Cập nhật giá phụ phí thành công');
      setIsModalVisible(false); fetchData();
    } catch (error) { message.error('Lỗi khi lưu bảng giá'); }
  };

  const handleDelete = (id) => {
    Modal.confirm({ title: 'Xóa mốc giá phụ phí này?', okType: 'danger', onOk: async () => {
        try { await danhMucService.deleteBangGiaPhuPhi(id); fetchData(); } catch (error) { message.error('Lỗi thao tác'); }
    }});
  };

  const handleClone = (record) => {
    setEditingId(null);
    form.setFieldsValue({
      phu_phi_id: record.phu_phi_id,
      loai_xe_id: null, 
      don_gia: Number(record.don_gia)
    });
    setIsModalVisible(true);
  };

  const filteredData = data.filter(item => {
    const matchPhuPhi = item.ten_phu_phi?.toLowerCase().includes(searchText.toLowerCase());
    const matchXe = item.ten_xe?.toLowerCase().includes(searchText.toLowerCase());
    return matchPhuPhi || matchXe;
  });

  const columns = [
    { title: 'Loại Phụ phí', dataIndex: 'ten_phu_phi', fontWeight: 'bold', sorter: (a, b) => a.ten_phu_phi.localeCompare(b.ten_phu_phi) },
    { title: 'Áp dụng cho Xe', dataIndex: 'ten_xe', sorter: (a, b) => (a.ten_xe || '').localeCompare(b.ten_xe || ''), render: (val) => val || <Text type="secondary">--- Không áp dụng ---</Text> },
    { title: 'Mức Giá (VNĐ)', dataIndex: 'don_gia', align: 'right', render: v => <CurrencyText value={v} style={{color: '#cf1322', fontWeight: 'bold'}}/>, sorter: (a, b) => Number(a.don_gia) - Number(b.don_gia) },
    { title: 'Thao tác', align: 'center', width: 150, render: (_, record) => (
        <Space>
          <Button type="text" icon={<EditOutlined style={{ color: '#fa8c16' }}/>} onClick={() => openModal(record)} />
          <Button type="text" icon={<PlusOutlined style={{ color: '#52c41a' }}/>} onClick={() => handleClone(record)} title="Nhân bản" />
          <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} />
        </Space>
      )
    }
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Input.Search placeholder="Tìm theo tên Phụ phí hoặc Loại xe..." allowClear enterButton={<SearchOutlined />} style={{ width: 350 }} onChange={(e) => setSearchText(e.target.value)} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>Thêm Giá Phụ Phí</Button>
      </div>
      <Table columns={columns} dataSource={filteredData} rowKey="id" loading={loading} pagination={{ pageSize: 10, showSizeChanger: true }} bordered />
      
      <Modal title={editingId ? "Sửa Giá Phụ Phí" : "Thiết lập Giá Phụ Phí"} open={isModalVisible} onCancel={() => setIsModalVisible(false)} onOk={() => form.submit()} destroyOnHidden>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="phu_phi_id" label="Chọn Phụ Phí" rules={[{ required: true }]}>
            <Select 
              showSearch 
              onChange={handlePhuPhiChange}
              /* 🚀 FIX 1: Dạy cho Ant Design cách tìm kiếm bằng tiếng Việt có dấu */
              filterOption={(input, option) => (option?.children ?? '').toString().toLowerCase().includes(input.toLowerCase())}
            >
              {/* 🚀 FIX 2: Bỏ luôn hàm filter is_active vì Backend đã lọc sẵn rồi, chống lỗi undefined */}
              {phuPhiList.map(p => <Option key={p.id} value={p.id}>{p.ten_phu_phi} ({p.cach_tinh})</Option>)}
            </Select>
          </Form.Item>
          
          {selectedRule === 'THEO_LOAI_XE' && (
             <Form.Item name="loai_xe_id" label="Áp dụng cho Loại xe đi chở" rules={[{ required: true, message: 'Bắt buộc chọn Xe do quy tắc phụ phí là THEO_LOAI_XE' }]}>
               <Select 
                 showSearch 
                 allowClear
                 /* 🚀 Dạy tìm kiếm cho ô Loại Xe luôn */
                 filterOption={(input, option) => (option?.children ?? '').toString().toLowerCase().includes(input.toLowerCase())}
               >
                 {/* Bỏ luôn filter ở đây cho an toàn */}
                 {xeList.map(x => <Option key={x.id} value={x.id}>{x.ten_hien_thi}</Option>)}
               </Select>
             </Form.Item>
          )}

          <Form.Item name="don_gia" label="Mức Giá (VNĐ)" rules={[{ required: true }]}>
             <InputNumber min={0} style={{ width: 250 }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

// =========================================================================
// MAIN COMPONENT
// =========================================================================
const PhuPhiPage = () => {
  const [phuPhiList, setPhuPhiList] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchPhuPhiList = async () => {
    setLoading(true);
    try {
      const res = await danhMucService.getPhuPhiList();
      if (res.success) setPhuPhiList(res.data?.data || res.data || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchPhuPhiList(); }, []);

  return (
    <Card variant="borderless">
      <Title level={4} style={{ margin: 0, marginBottom: 5 }}>Quản lý Bảng giá Phụ phí (Surcharges)</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 20 }}>
        Cấu hình quy tắc và biểu giá tự động cho các khoản phí phát sinh (Lấy tận nơi, Bốc xếp...)
      </Text>

      <Tabs defaultActiveKey="1" items={[
        { key: '1', label: '1. Định nghĩa Danh sách Phụ phí', children: <TabDanhSachPhuPhi phuPhiList={phuPhiList} fetchPhuPhiList={fetchPhuPhiList} loading={loading} /> },
        { key: '2', label: '2. Cấu hình Ma Trận Giá (Bảng giá)', children: <TabMaTranGia phuPhiList={phuPhiList} /> }
      ]} />
    </Card>
  );
};

export default PhuPhiPage;
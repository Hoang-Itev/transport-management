import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Typography, Modal, Form, Input, message } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { danhMucService } from '../../services/danhMucService';

const { Title } = Typography;

const ThamSoHeThongPage = () => {
  const [form] = Form.useForm();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await danhMucService.getThamSoList();
      if (res.success) setData(res.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const openModal = (record) => {
    setEditingRecord(record);
    form.setFieldsValue({ giaTri: record.gia_tri });
    setIsModalVisible(true);
  };

  const handleSubmit = async (values) => {
    try {
      await danhMucService.updateThamSo(editingRecord.ma_tham_so, { giaTri: values.giaTri });
      message.success('Cập nhật luật hệ thống thành công');
      setIsModalVisible(false);
      fetchData();
    } catch (error) { message.error('Lỗi khi cập nhật'); }
  };

  const columns = [
    { title: 'Mã cấu hình', dataIndex: 'ma_tham_so', fontWeight: 'bold' },
    { title: 'Diễn giải nghiệp vụ', dataIndex: 'mo_ta_nghiep_vu' },
    { title: 'Giá trị hiện tại', dataIndex: 'gia_tri', align: 'center', render: val => <strong style={{ color: '#d9363e', fontSize: 16 }}>{val}</strong> },
    { title: 'Thao tác', align: 'center', render: (_, record) => (
        <Button type="text" icon={<EditOutlined style={{ color: '#1890ff' }}/>} onClick={() => openModal(record)}>Thay đổi</Button>
      )
    }
  ];

  return (
    <Card bordered={false}>
      <Title level={4} style={{ marginBottom: 20 }}>Cấu hình Tham số (Luật Hệ thống)</Title>
      <Table columns={columns} dataSource={data} rowKey="ma_tham_so" loading={loading} pagination={false} bordered />
      
      <Modal title={`Thay đổi: ${editingRecord?.ma_tham_so}`} open={isModalVisible} onCancel={() => setIsModalVisible(false)} onOk={() => form.submit()} destroyOnClose>
        <div style={{ marginBottom: 15, padding: 10, background: '#f5f5f5', borderRadius: 4 }}>
          <strong>Quy tắc:</strong> {editingRecord?.mo_ta_nghiep_vu}
        </div>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="giaTri" label="Giá trị mới" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};
export default ThamSoHeThongPage;
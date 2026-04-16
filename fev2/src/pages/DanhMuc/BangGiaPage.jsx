import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Typography, Modal, Form, InputNumber, Select, DatePicker, message, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { danhMucService } from '../../services/danhMucService';
import { usePagination } from '../../hooks/usePagination';
import CurrencyText from '../../components/common/CurrencyText';
import { formatDate } from '../../utils/formatDate';

const { Title } = Typography;
const { Option } = Select;

const BangGiaPage = () => {
  const [form] = Form.useForm();
  const { page, limit, total, setTotal, onChange } = usePagination(10);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Data cho Dropdown form và Bộ lọc
  const [tuyenList, setTuyenList] = useState([]);
  const [loaiList, setLoaiList] = useState([]);
  
  // State cho Bộ lọc Tìm kiếm
  const [filterTuyen, setFilterTuyen] = useState(null);
  const [filterLoai, setFilterLoai] = useState(null);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    danhMucService.getTuyenDuongList({ limit: 1000 }).then(res => setTuyenList(res.data));
    danhMucService.getLoaiHangList({ limit: 1000 }).then(res => setLoaiList(res.data));
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Đẩy bộ lọc xuống Backend
      const res = await danhMucService.getBangGiaList({ 
        page, 
        limit,
        tuyenDuongId: filterTuyen,
        loaiHangId: filterLoai
      });
      if (res.success) { setData(res.data); setTotal(res.pagination.total); }
    } finally { setLoading(false); }
  };

  // Nạp lại data khi đổi trang, đổi giới hạn, hoặc đổi bộ lọc
  useEffect(() => { fetchData(); }, [page, limit, filterTuyen, filterLoai]);

  const openModal = (record = null) => {
    setEditingId(record?.id || null);
    if (record) { 
      form.setFieldsValue({ 
        tuyenDuongId: record.tuyen_duong_id, 
        loaiHangId: record.loai_hang_id,
        kgTu: Number(record.kg_tu), kgDen: Number(record.kg_den), donGia: Number(record.don_gia),
        ngayApDung: dayjs(record.ngay_ap_dung),
        ngayHetHan: record.ngay_het_han ? dayjs(record.ngay_het_han) : null
      }); 
    } 
    else { form.resetFields(); }
    setIsModalVisible(true);
  };

  const handleSubmit = async (values) => {
    try {
      const payload = {
        ...values,
        ngayApDung: values.ngayApDung.format('YYYY-MM-DD'),
        ngayHetHan: values.ngayHetHan ? values.ngayHetHan.format('YYYY-MM-DD') : null
      };
      
      let res;
      if (editingId) {
        res = await danhMucService.updateBangGia(editingId, payload);
      } else {
        res = await danhMucService.createBangGia(payload);
      }
      
      if (res && res.success === false) {
         message.error(res.message || res.error?.message || 'Khoảng Kg này đã bị trùng lặp!');
         return; 
      }
      
      message.success('Lưu bảng giá thành công');
      setIsModalVisible(false); 
      fetchData();

    } catch (error) { 
      const errorCode = error?.response?.data?.error?.code || error?.error?.code;
      const errorMsg = error?.response?.data?.error?.message || error?.error?.message || 'Có lỗi xảy ra khi lưu';
      
      if (errorCode === 'BANG_GIA_OVERLAP' || errorMsg.toLowerCase().includes('trùng')) {
        message.error('LỖI TỪ SERVER: Khoảng Kg này đã bị trùng với một bảng giá khác!');
      } else {
        message.error(errorMsg);
      }
    }
  };

  const handleDelete = (id) => {
    Modal.confirm({
      title: 'Ngưng áp dụng mức giá này?',
      content: 'Mức giá này sẽ không còn được tự động tra cứu khi tạo Báo giá.',
      okType: 'danger',
      onOk: async () => {
        try {
          await danhMucService.deleteBangGia(id);
          message.success('Đã ngưng hoạt động bảng giá!');
          fetchData();
        } catch (error) {
          message.error('Lỗi: Không thể xóa dữ liệu này!');
        }
      }
    });
  };

  const columns = [
    { 
      title: 'Tuyến', 
      render: (_, r) => {
        const t = tuyenList.find(x => x.id === r.tuyen_duong_id);
        return t ? `${t.tinh_di} ➔ ${t.tinh_den}` : `Tuyến ${r.tuyen_duong_id}`;
      }
    },
    { 
      title: 'Loại', 
      render: (_, r) => loaiList.find(l => l.id === r.loai_hang_id)?.ten || `Loại ${r.loai_hang_id}` 
    },
    { 
      title: 'Từ (Kg)', 
      dataIndex: 'kg_tu', 
      align: 'right',
      sorter: (a, b) => Number(a.kg_tu) - Number(b.kg_tu) // THÊM SẮP XẾP
    },
    { 
      title: 'Đến (Kg)', 
      dataIndex: 'kg_den', 
      align: 'right',
      sorter: (a, b) => Number(a.kg_den) - Number(b.kg_den) // THÊM SẮP XẾP
    },
    { 
      title: 'Đơn giá', 
      dataIndex: 'don_gia', 
      align: 'right', 
      render: v => <CurrencyText value={v} />,
      sorter: (a, b) => Number(a.don_gia) - Number(b.don_gia) // THÊM SẮP XẾP
    },
    { 
      title: 'Hiệu lực', 
      render: (_, r) => `${formatDate(r.ngay_ap_dung)} - ${r.ngay_het_han ? formatDate(r.ngay_het_han) : 'Vô thời hạn'}` 
    },
    { 
      title: 'Trạng thái', 
      dataIndex: 'is_active',
      align: 'center', 
      render: (val) => (Number(val) === 1 || val === true) ? <Tag color="success">Đang hoạt động</Tag> : <Tag color="default">Ngưng</Tag> 
    },
    { 
      title: 'Thao tác', 
      align: 'center', 
      render: (_, record) => {
        const isActive = Number(record.is_active) === 1 || record.is_active === true;
        return (
          <Space>
            {isActive && (
              <>
                <Button type="text" icon={<EditOutlined style={{ color: '#fa8c16' }}/>} onClick={() => openModal(record)} title="Sửa" />
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
        <Title level={4} style={{ margin: 0 }}>Quản lý Bảng giá cước</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>Thêm giá mới</Button>
      </div>

      {/* --- THÊM KHU VỰC BỘ LỌC TÌM KIẾM --- */}
      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          showSearch
          allowClear
          placeholder="Lọc theo Tuyến đường"
          style={{ width: 280 }}
          optionFilterProp="children"
          filterOption={(input, option) => String(option.children).toLowerCase().includes(input.toLowerCase())}
          onChange={(val) => { setFilterTuyen(val); onChange(1, limit); }}
        >
          {tuyenList.map(t => (
            <Option key={t.id} value={t.id}>{`${t.tinh_di} - ${t.tinh_den}`}</Option>
          ))}
        </Select>

        <Select
          showSearch
          allowClear
          placeholder="Lọc theo Loại hàng"
          style={{ width: 220 }}
          optionFilterProp="children"
          filterOption={(input, option) => String(option.children).toLowerCase().includes(input.toLowerCase())}
          onChange={(val) => { setFilterLoai(val); onChange(1, limit); }}
        >
          {loaiList.map(l => (
            <Option key={l.id} value={l.id}>{l.ten}</Option>
          ))}
        </Select>
      </Space>

      <Table columns={columns} dataSource={data} rowKey="id" loading={loading} pagination={{ current: page, pageSize: limit, total, onChange }} bordered />
      
      <Modal width={600} title={editingId ? "Sửa bảng giá" : "Thêm bảng giá"} open={isModalVisible} onCancel={() => setIsModalVisible(false)} onOk={() => form.submit()} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Space size="large" style={{ display: 'flex' }}>
            <Form.Item name="tuyenDuongId" label="Tuyến đường" rules={[{ required: true }]} style={{ width: 250 }}>
              <Select 
                showSearch 
                optionFilterProp="children"
                filterOption={(input, option) => String(option.children).toLowerCase().includes(input.toLowerCase())}
              >
                {tuyenList
                  .filter(t => Number(t.is_active) === 1 || t.is_active === true)
                  .map(t => (
                    <Option key={t.id} value={t.id}>{`${t.tinh_di} - ${t.tinh_den}`}</Option>
                  ))}
              </Select>
            </Form.Item>
            
            <Form.Item name="loaiHangId" label="Loại hàng" rules={[{ required: true }]} style={{ width: 250 }}>
              <Select 
                showSearch 
                optionFilterProp="children"
                filterOption={(input, option) => String(option.children).toLowerCase().includes(input.toLowerCase())}
              >
                {loaiList
                  .filter(l => Number(l.is_active) === 1 || l.is_active === true)
                  .map(l => (
                    <Option key={l.id} value={l.id}>{l.ten}</Option>
                  ))}
              </Select>
            </Form.Item>
          </Space>
          
          <Space size="large" style={{ display: 'flex' }}>
            <Form.Item name="kgTu" label="Từ (Kg)" rules={[{ required: true }]}><InputNumber min={0} /></Form.Item>
            <Form.Item 
              name="kgDen" 
              label="Đến (Kg)" 
              dependencies={['kgTu']}
              rules={[
                { required: true },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    const kgTu = getFieldValue('kgTu');
                    if (!value || value > kgTu) { return Promise.resolve(); }
                    return Promise.reject(new Error('Kg Đến phải lớn hơn Kg Từ!'));
                  },
                }),
              ]}
            >
              <InputNumber min={1} />
            </Form.Item>
            <Form.Item name="donGia" label="Đơn giá (VNĐ)" rules={[{ required: true }]}><InputNumber min={1} style={{ width: 150 }} /></Form.Item>
          </Space>
          
          <Space size="large" style={{ display: 'flex' }}>
            <Form.Item name="ngayApDung" label="Ngày áp dụng" rules={[{ required: true }]}><DatePicker format="DD/MM/YYYY" /></Form.Item>
            <Form.Item name="ngayHetHan" label="Ngày hết hạn (Tùy chọn)">
              <DatePicker 
                format="DD/MM/YYYY" 
                disabledDate={(current) => {
                  const ngayApDung = form.getFieldValue('ngayApDung');
                  return ngayApDung && current && current < ngayApDung.startOf('day');
                }}
              />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </Card>
  );
};
export default BangGiaPage;
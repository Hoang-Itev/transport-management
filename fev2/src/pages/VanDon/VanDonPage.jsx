import React, { useState, useEffect } from 'react';
import { Card, Select, Button, Table, Space, Typography, DatePicker, Checkbox, message, Tooltip, Modal, Form, InputNumber, Input, Tag } from 'antd';
import { EyeOutlined, EditOutlined, CloseOutlined, PlusOutlined, FileDoneOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

import { vanDonService } from '../../services/vanDonService';
import { khachHangService } from '../../services/khachHangService';
import { usePagination } from '../../hooks/usePagination';
import StatusTag from '../../components/common/StatusTag';
import CurrencyText from '../../components/common/CurrencyText';
import { formatDate } from '../../utils/formatDate';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const VanDonPage = () => {
  const navigate = useNavigate();
  const { page, limit, total, setTotal, onChange } = usePagination(10);
  
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [khachHangList, setKhachHangList] = useState([]);

  // Bộ lọc
  const [trangThai, setTrangThai] = useState(null);
  const [trangThaiThanhToan, setTrangThaiThanhToan] = useState(null);
  const [khachHangId, setKhachHangId] = useState(null);
  const [dateRange, setDateRange] = useState([]);
  const [quaHan, setQuaHan] = useState(false);

  // Modal cập nhật trọng lượng
  const [tlModalVisible, setTlModalVisible] = useState(false);
  const [currentVd, setCurrentVd] = useState(null);
  const [formTL] = Form.useForm();

  // Modal Chọn Báo Giá Chờ
  const [pendingModalVisible, setPendingModalVisible] = useState(false);
  const [pendingList, setPendingList] = useState([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [pendingSearch, setPendingSearch] = useState(''); // FIX: Thêm state lưu từ khóa tìm kiếm khách hàng

  // Modal Tạo Vận Đơn
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [createForm] = Form.useForm();

  useEffect(() => {
    khachHangService.getList({ limit: 1000 }).then(res => setKhachHangList(res.data));
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const tuNgay = dateRange?.[0] ? dateRange[0].format('YYYY-MM-DD') : undefined;
      const denNgay = dateRange?.[1] ? dateRange[1].format('YYYY-MM-DD') : undefined;
      
      const res = await vanDonService.getList({ 
        page, limit, trangThai, trangThaiThanhToan, khachHangId, tuNgay, denNgay, quaHan: quaHan ? true : undefined 
      });
      if (res.success) {
        setData(res.data);
        setTotal(res.pagination.total);
      }
    } catch (error) { message.error('Lỗi tải danh sách vận đơn'); } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [page, limit, trangThai, trangThaiThanhToan, khachHangId, dateRange, quaHan]);

  // --- ACTIONS VẬN ĐƠN HIỆN TẠI ---
  const openEditWeight = (record) => {
    setCurrentVd(record);
    formTL.setFieldsValue({ trongLuongThucTe: record.trong_luong_thuc_te || record.trong_luong_du_kien });
    setTlModalVisible(true);
  };

  const handleUpdateWeight = async (values) => {
    try {
      await vanDonService.updateTrongLuong(currentVd.id, values.trongLuongThucTe);
      message.success('Cập nhật trọng lượng thành công!');
      setTlModalVisible(false);
      fetchData();
    } catch (error) { message.error(error?.error?.message || 'Không thể cập nhật trọng lượng'); }
  };

  const handleCancelVd = (id) => {
    Modal.confirm({
      title: 'Hủy vận đơn này?',
      content: 'Hãy nhập lý do hủy:',
      okType: 'danger',
      onOk: async () => {
        try {
          await vanDonService.huyVanDon(id, 'Hủy theo yêu cầu quản lý'); 
          message.success('Đã hủy vận đơn');
          fetchData();
        } catch (error) { message.error(error?.error?.message || 'Không thể hủy vận đơn này'); }
      }
    });
  };

  // --- ACTIONS TẠO VẬN ĐƠN MỚI TỪ DANH SÁCH CHỜ ---
  const openPendingList = async () => {
    setPendingModalVisible(true);
    setLoadingPending(true);
    setPendingSearch(''); // Reset tìm kiếm mỗi khi mở lại modal
    try {
      const res = await vanDonService.getPendingList(); 
      setPendingList(res.data);
    } catch (error) {
      message.error('Không thể tải danh sách chờ');
    } finally {
      setLoadingPending(false);
    }
  };

  const startCreateVanDon = (trip) => {
    setSelectedTrip(trip);
    setPendingModalVisible(false); 
    setCreateModalVisible(true);   
  };

  const submitCreateVanDon = async (values) => {
    try {
      const payload = {
        baoGiaChiTietId: selectedTrip ? selectedTrip.bao_gia_chi_tiet_id : selectedChiTietId,
        nguoiLienHeLay: values.nguoiLienHeLay,
        nguoiLienHeGiao: values.nguoiLienHeGiao,
        ngayVanChuyen: values.ngayVanChuyen.format('YYYY-MM-DD'),
        // THÊM DÒNG NÀY:
        ngayHetHanThanhToan: values.ngayHetHanThanhToan.format('YYYY-MM-DD') 
      };
      await vanDonService.create(payload);
      message.success('Tạo Vận đơn thành công!');
      setCreateModalVisible(false);
      createForm.resetFields();
      fetchData(); 
    } catch (error) {
      message.error(error?.error?.message || 'Lỗi khi tạo vận đơn');
    }
  };

  const columns = [
    { title: 'Mã VĐ', dataIndex: 'id', render: (val) => <span style={{fontWeight: 500}}>{val}</span> },
    { title: 'Khách', dataIndex: 'ten_cong_ty' }, 
    // THAY BẰNG DÒNG NÀY:
    { 
      title: 'Hạn TT', 
      dataIndex: 'ngay_het_han_thanh_toan', 
      render: (val, record) => {
        // Nếu chưa thanh toán xong và ngày hiện tại đã lố ngày hạn -> Tô đỏ
        const isOverdue = record.trang_thai_thanh_toan !== 'PAID' && dayjs().startOf('day').isAfter(dayjs(val), 'day');
        return <Text type={isOverdue ? 'danger' : ''} strong={isOverdue}>{formatDate(val)}</Text>;
      }
    },
    { title: 'Giá trị', dataIndex: 'gia_tri', align: 'right', render: (val) => <CurrencyText value={val} /> },
    { 
      title: 'TT TT', 
      dataIndex: 'trang_thai_thanh_toan', 
      align: 'center', 
      render: (val, record) => (
        <Space direction="vertical" size={0}>
          <StatusTag status={val} />
          {record.trang_thai === 'CANCELLED' && <StatusTag status="CANCELLED" />}
        </Space>
      )
    },
    {
      title: 'Thao tác', align: 'center', render: (_, record) => {
        const canEdit = record.trang_thai === 'CONFIRMED' && record.trang_thai_thanh_toan === 'UNPAID';
        return (
          <Space size="small">
            <Tooltip title="Xem chi tiết"><Button type="text" icon={<EyeOutlined />} onClick={() => navigate(`/van-don/${record.id}`)} /></Tooltip>
            {canEdit && (
              <>
                <Tooltip title="Cập nhật TL"><Button type="text" style={{ color: '#fa8c16' }} icon={<EditOutlined />} onClick={() => openEditWeight(record)} /></Tooltip>
                <Tooltip title="Hủy Vận đơn"><Button type="text" danger icon={<CloseOutlined />} onClick={() => handleCancelVd(record.id)} /></Tooltip>
              </>
            )}
          </Space>
        );
      }
    }
  ];

  return (
    <Card bordered={false}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>Danh sách Vận đơn</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openPendingList}>Tạo Vận đơn mới</Button>
      </div>

      <Space style={{ marginBottom: 16 }} wrap>
        <Select placeholder="Trạng thái" style={{ width: 140 }} allowClear onChange={setTrangThai}>
          <Option value="CONFIRMED">CONFIRMED</Option>
          <Option value="CANCELLED">CANCELLED</Option>
        </Select>
        <Select placeholder="Thanh toán" style={{ width: 140 }} allowClear onChange={setTrangThaiThanhToan}>
          <Option value="UNPAID">UNPAID</Option>
          <Option value="PARTIAL">PARTIAL</Option>
          <Option value="PAID">PAID</Option>
        </Select>
        <Select showSearch placeholder="Khách hàng" style={{ width: 200 }} allowClear onChange={setKhachHangId} optionFilterProp="children" options={khachHangList.map(kh => ({ value: kh.id, label: kh.ten_cong_ty }))} />
        <RangePicker format="DD/MM/YYYY" onChange={setDateRange} style={{ width: 250 }} />
        <Checkbox checked={quaHan} onChange={(e) => setQuaHan(e.target.checked)}>Quá hạn TT</Checkbox>
      </Space>

      <Table columns={columns} dataSource={data} rowKey="id" loading={loading} pagination={{ current: page, pageSize: limit, total: total, onChange: onChange }} bordered />

      {/* --- CÁC MODAL --- */}

      <Modal title={`Cập nhật trọng lượng - ${currentVd?.id}`} open={tlModalVisible} onCancel={() => setTlModalVisible(false)} onOk={() => formTL.submit()} destroyOnClose>
        <Form form={formTL} layout="vertical" onFinish={handleUpdateWeight}>
          <Form.Item name="trongLuongThucTe" label="Trọng lượng thực tế (kg)" rules={[{ required: true, message: 'Vui lòng nhập' }]}>
            <InputNumber style={{ width: '100%' }} min={1} />
          </Form.Item>
          <div style={{ color: '#8c8c8c' }}>* Hệ thống sẽ tự động tính lại giá trị Vận đơn dựa trên bảng giá.</div>
        </Form>
      </Modal>

      {/* 1. Modal Danh sách chờ tạo VĐ */}
      <Modal title="Chọn Chuyến hàng để tạo Vận Đơn" open={pendingModalVisible} onCancel={() => setPendingModalVisible(false)} footer={null} width={900} destroyOnClose>
        
        {/* FIX: Thêm thanh tìm kiếm khách hàng */}
        <Input
          placeholder="Gõ tên khách hàng để tìm nhanh..."
          prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
          style={{ width: 300, marginBottom: 16 }}
          allowClear
          onChange={(e) => setPendingSearch(e.target.value)}
        />

        <Table 
          // FIX: Filter dữ liệu ngay tại Frontend dựa trên từ khóa tìm kiếm
          dataSource={pendingList.filter(item => 
            item.ten_cong_ty?.toLowerCase().includes(pendingSearch.toLowerCase())
          )} 
          rowKey="bao_gia_chi_tiet_id" 
          loading={loadingPending}
          pagination={{ pageSize: 5 }}
          columns={[
            { title: 'Báo giá', dataIndex: 'bao_gia_id', render: val => <Text strong>BG-{val}</Text> },
            { title: 'Khách hàng', dataIndex: 'ten_cong_ty' },
            { title: 'Tuyến đường', render: (_, r) => `${r.tinh_di} ➔ ${r.tinh_den}` },
            { title: 'Loại hàng', dataIndex: 'ten_loai_hang', render: val => <Tag color="blue">{val}</Tag> },
            { title: 'Giá trị', dataIndex: 'thanh_tien', align: 'right', render: val => <CurrencyText value={val} /> },
            { title: 'Thao tác', align: 'center', render: (_, record) => (
                <Button type="primary" size="small" icon={<FileDoneOutlined />} onClick={() => startCreateVanDon(record)}>
                  Tạo VĐ
                </Button>
              )
            }
          ]}
        />
      </Modal>

      {/* 2. Modal Nhập thông tin VĐ */}
      <Modal title="Khởi tạo Vận đơn thực tế" open={createModalVisible} onCancel={() => setCreateModalVisible(false)} onOk={() => createForm.submit()} destroyOnClose>
        {selectedTrip && (
          <div style={{ padding: 12, backgroundColor: '#e6f7ff', borderRadius: 6, marginBottom: 16, borderLeft: '4px solid #1890ff' }}>
            Đang tạo Vận đơn cho Báo giá <Text strong>BG-{selectedTrip.bao_gia_id}</Text> ({selectedTrip.ten_cong_ty}) <br/>
            Tuyến: <Text strong>{selectedTrip.tinh_di} ➔ {selectedTrip.tinh_den}</Text>
          </div>
        )}
        <Form form={createForm} layout="vertical" onFinish={submitCreateVanDon}>
          <Form.Item name="ngayVanChuyen" label="Ngày vận chuyển (Dự kiến đi)" rules={[{ required: true, message: 'Vui lòng chọn ngày đi' }]}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          
          <Form.Item name="nguoiLienHeLay" label="Thông tin người lấy hàng" rules={[{ required: true, message: 'Vui lòng nhập người lấy' }]}>
            <Input placeholder="Tên và SĐT người ở kho bốc..." />
          </Form.Item>
          
          {/* ĐÂY LÀ Ô ĐÃ BỊ THIẾU NÈ BẠN: */}
          <Form.Item name="nguoiLienHeGiao" label="Thông tin người nhận hàng" rules={[{ required: true, message: 'Vui lòng nhập người nhận' }]}>
            <Input placeholder="Tên và SĐT người nhận hàng..." />
          </Form.Item>
          
          <Form.Item name="ngayHetHanThanhToan" label="Hạn chót thanh toán" rules={[{ required: true, message: 'Vui lòng chọn hạn thanh toán' }]}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
        </Form>
      </Modal>

    </Card>
  );
};

export default VanDonPage;
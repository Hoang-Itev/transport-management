import React, { useState, useEffect } from 'react';
import { Card, Select, Button, Table, Space, Typography, DatePicker, message, Tooltip, Modal, Input, Tag } from 'antd';
import { EyeOutlined, PlusOutlined, FileDoneOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

import { vanDonService } from '../../services/vanDonService';
import { khachHangService } from '../../services/khachHangService';
import { usePagination } from '../../hooks/usePagination';
import StatusTag from '../../components/common/StatusTag';
import CurrencyText from '../../components/common/CurrencyText';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const VanDonPage = () => {
  const navigate = useNavigate();
  const { page, limit, total, setTotal, onChange } = usePagination(10);
  
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [khachHangList, setKhachHangList] = useState([]);
  
  const [search, setSearch] = useState('');
  const [trangThai, setTrangThai] = useState(null);
  const [trangThaiThanhToan, setTrangThaiThanhToan] = useState(null);
  const [khachHangId, setKhachHangId] = useState(null);
  const [dateRange, setDateRange] = useState([]);

  const [pendingModalVisible, setPendingModalVisible] = useState(false);
  const [pendingList, setPendingList] = useState([]);

  useEffect(() => {
    khachHangService.getList({ limit: 1000 }).then(res => setKhachHangList(res.data?.data || res.data || []));
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const tuNgay = dateRange?.[0] ? dateRange[0].format('YYYY-MM-DD') : undefined;
      const denNgay = dateRange?.[1] ? dateRange[1].format('YYYY-MM-DD') : undefined;
      
      const res = await vanDonService.getList({ page, limit, search, trangThai, trangThaiTT: trangThaiThanhToan, khachHangId, tuNgay, denNgay });
      if (res.success) {
        setData(res.data?.data || res.data || []);
        setTotal(res.pagination?.total || 0);
      }
    } catch (error) { message.error('Lỗi lấy danh sách Vận đơn'); } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [page, limit, search, trangThai, trangThaiThanhToan, khachHangId, dateRange]);

  const openPendingList = async () => {
    setPendingModalVisible(true);
    try {
      const res = await vanDonService.getPendingList(); 
      setPendingList(res.data || []);
    } catch (e) { message.error('Lỗi lấy danh sách chờ'); }
  };

  // 🚀 UX MAGIC: TẠO 1 CHẠM, BỎ QUA MODAL NHẬP TRUNG GIAN
  const handleOneClickCreate = async (booking) => {
    try {
      message.loading({ content: 'Đang khởi tạo Vận đơn...', key: 'create_vd' });
      
      // 🚀 CHỈ THÊM 2 DÒNG NÀY ĐỂ TÌM LOẠI KHÁCH:
      const khach = khachHangList.find(k => k.id === booking.khach_hang_id);
      const isB2C = booking.loai_khach === 'B2C_VANG_LAI' || khach?.loai_khach === 'B2C_VANG_LAI';

      const payload = {
        bookingId: booking.id || booking.booking_id,
        nguoiGuiTen: booking.nguoi_gui_ten,
        nguoiGuiSdt: booking.nguoi_gui_sdt,
        nguoiNhanTen: booking.nguoi_nhan_ten,
        nguoiNhanSdt: booking.nguoi_nhan_sdt,
        hinhThucThanhToan: isB2C ? 'TRA_TRUOC' : 'GHI_NO', // 👈 Sửa lại dòng này
        tienCodThuHo: 0
      };
      
      const res = await vanDonService.createFromQuotation(payload);
      message.success({ content: 'Tạo thành công! Đang chuyển hướng...', key: 'create_vd' });
      setPendingModalVisible(false);
      navigate(`/van-don/${res.data.ma_van_don || res.data.id}`);
    } catch (error) { 
      message.error({ content: error?.error?.message || error?.message || 'Lỗi khởi tạo', key: 'create_vd' }); 
    }
  };

  const columns = [
    { title: 'Mã VĐ', dataIndex: 'ma_van_don', render: (val) => <Text strong style={{color: '#1890ff'}}>{val}</Text> },
    { title: 'Khách hàng', dataIndex: 'ten_cong_ty', render: (val, r) => <><Text strong>{val}</Text><br/><Text type="secondary" style={{fontSize: 11}}>Tạo bởi: ID {r.nguoi_tao_id}</Text></> }, 
    { title: 'Giá trị chốt', dataIndex: 'so_tien_chot_cuoi', align: 'right', render: (val) => <CurrencyText value={val} style={{color: '#cf1322', fontWeight: 'bold'}} /> },
    { title: 'Trạng thái VC', dataIndex: 'trang_thai_van_chuyen', align: 'center', render: (val) => <StatusTag status={val} /> },
    { 
  title: 'Thanh toán', 
  align: 'center', 
  render: (_, record) => {
    // 1. Dịch Hình thức thanh toán
    const methodMap = {
      'TRA_TRUOC': 'Trả Trước',
      'COD_THU_HO': 'Thu hộ (COD)',
      'GHI_NO': 'Công Nợ'
    };
    
    // 2. Dịch Trạng thái thu tiền
    const statusMap = {
      'UNPAID': { text: 'Chưa thu', color: 'default' },
      'PARTIAL': { text: 'Thu 1 phần', color: 'orange' },
      'PAID': { text: 'Đã thu đủ', color: 'green' }
    };

    const methodText = methodMap[record.hinh_thuc_thanh_toan] || record.hinh_thuc_thanh_toan;
    const statusObj = statusMap[record.trang_thai_thanh_toan] || { text: record.trang_thai_thanh_toan, color: 'default' };

    return (
      <div>
        <div style={{ fontSize: 12, color: '#555', marginBottom: 4, fontWeight: 500 }}>
          {methodText}
        </div>
        <Tag color={statusObj.color} style={{ margin: 0 }}>
          {statusObj.text}
        </Tag>
      </div>
    );
  } 
},
    { title: 'Thao tác', align: 'center', render: (_, record) => (
        <Tooltip title="Vào Bảng Điều Khiển"><Button type="primary" shape="circle" icon={<EyeOutlined />} onClick={() => navigate(`/van-don/${record.ma_van_don}`)} /></Tooltip>
      )
    }
  ];

  return (
    <Card bordered={false}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>Quản lý Vận đơn (Waybills)</Title>
        <Button type="primary" style={{ background: '#52c41a' }} icon={<PlusOutlined />} onClick={openPendingList}>Kéo đơn từ Báo Giá</Button>
      </div>

      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search placeholder="Tìm mã VĐ hoặc tên khách..." allowClear onSearch={setSearch} style={{ width: 250 }} />
        <Select placeholder="Trạng thái Vận chuyển" style={{ width: 180 }} allowClear onChange={setTrangThai}>
          <Option value="CHO_LAY">Chờ lấy hàng</Option>
          <Option value="DANG_CHAY">Đang chạy tuyến</Option>
          <Option value="DA_GIAO">Đã giao</Option>
          <Option value="CANCELLED">Đã hủy</Option>
        </Select>
        <Select placeholder="Thanh toán" style={{ width: 140 }} allowClear onChange={setTrangThaiThanhToan}>
          <Option value="UNPAID">Chưa thanh toán</Option>
          <Option value="PAID">Đã thanh toán</Option>
        </Select>
        <Select showSearch placeholder="Khách hàng" style={{ width: 200 }} allowClear onChange={setKhachHangId} filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())} options={khachHangList.map(kh => ({ value: kh.id, label: kh.ten_cong_ty }))} />
        <RangePicker format="DD/MM/YYYY" onChange={setDateRange} style={{ width: 250 }} />
      </Space>

      <Table columns={columns} dataSource={data} rowKey="ma_van_don" loading={loading} pagination={{ current: page, pageSize: limit, total: total, onChange: onChange }} bordered />

      <Modal title="Chọn Chuyến hàng (Booking) đã được duyệt" open={pendingModalVisible} onCancel={() => setPendingModalVisible(false)} footer={null} width={900}>
        <Table 
          dataSource={pendingList} rowKey={(r) => r.id || r.booking_id} pagination={{ pageSize: 5 }}
          columns={[
            { title: 'Mã Booking', dataIndex: 'id', render: val => <Text strong>{val}</Text> },
            { title: 'Khách', dataIndex: 'ten_cong_ty' },
            { title: 'Tuyến', render: (_, r) => `${r.diem_lay_chi_tiet} ➔ ${r.diem_giao_chi_tiet}` },
            { title: 'Thao tác', align: 'center', render: (_, record) => <Button type="primary" size="small" icon={<FileDoneOutlined />} onClick={() => handleOneClickCreate(record)}>Tạo Vận Đơn</Button> }
          ]}
        />
      </Modal>
    </Card>
  );
};
export default VanDonPage;
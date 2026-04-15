import React, { useState, useEffect } from 'react';
import { Card, Select, Button, Table, Space, Typography, message, Modal, DatePicker, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, SendOutlined, CheckCircleOutlined, CloseCircleOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

import { baoGiaService } from '../../services/baoGiaService';
import { khachHangService } from '../../services/khachHangService'; // Dùng để lấy tên KH
import { usePagination } from '../../hooks/usePagination';
import CurrencyText from '../../components/common/CurrencyText';
import StatusTag from '../../components/common/StatusTag';
import { formatDate } from '../../utils/formatDate';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const BaoGiaPage = () => {
  const navigate = useNavigate();
  const { page, limit, total, setTotal, onChange } = usePagination(10);
  
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [khachHangList, setKhachHangList] = useState([]); // Chứa danh sách KH để map tên
  
  const [trangThai, setTrangThai] = useState(null);
  const [dateRange, setDateRange] = useState([]);

  // Tải danh sách khách hàng 1 lần duy nhất khi mở trang để lấy Tên map vào ID
  useEffect(() => {
    const fetchKhachHang = async () => {
      try {
        const res = await khachHangService.getList({ limit: 1000 });
        if (res.success) setKhachHangList(res.data);
      } catch (error) {
        console.error('Không tải được danh sách khách hàng');
      }
    };
    fetchKhachHang();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const tuNgay = dateRange?.[0] ? dateRange[0].format('YYYY-MM-DD') : undefined;
      const denNgay = dateRange?.[1] ? dateRange[1].format('YYYY-MM-DD') : undefined;
      
      const res = await baoGiaService.getList({ page, limit, trangThai, tuNgay, denNgay });
      if (res.success) {
        setData(res.data);
        setTotal(res.pagination.total);
      }
    } catch (error) {
      message.error('Lỗi tải danh sách báo giá');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [page, limit, trangThai, dateRange]);

  // Hành động: Gửi cho khách
  const handleGui = (id) => {
    Modal.confirm({
      title: 'Xác nhận gửi báo giá',
      content: 'Báo giá sẽ chuyển sang trạng thái SENT. Bạn không thể sửa chi tiết được nữa.',
      onOk: async () => {
        try {
          await baoGiaService.guiBaoGia(id);
          message.success('Đã gửi báo giá thành công!');
          fetchData();
        } catch (error) { message.error(error?.error?.message || 'Lỗi khi gửi'); }
      }
    });
  };

  // Hành động: Xác nhận / Từ chối (Dành cho SENT)
  const handleXacNhan = (id, trangThaiMoi) => {
    const isChopNhan = trangThaiMoi === 'ACCEPTED';
    Modal.confirm({
      title: isChopNhan ? 'Chốt báo giá?' : 'Khách từ chối báo giá?',
      okText: 'Xác nhận',
      okType: isChopNhan ? 'primary' : 'danger',
      onOk: async () => {
        try {
          await baoGiaService.xacNhan(id, { trangThai: trangThaiMoi, lyDo: isChopNhan ? '' : 'Khách không đồng ý giá' });
          message.success(`Đã ${isChopNhan ? 'chốt' : 'hủy'} báo giá!`);
          fetchData();
        } catch (error) { message.error(error?.error?.message || 'Lỗi thao tác'); }
      }
    });
  };

  const columns = [
    { 
      title: 'Mã', 
      dataIndex: 'id', 
      render: (id) => <Text strong>BG-{id}</Text> 
    },
    { 
      title: 'Khách hàng', 
      dataIndex: 'khach_hang_id', 
      render: (val) => {
        // Dò tìm ID trong danh sách để lấy ra tên công ty
        const kh = khachHangList.find(k => k.id === val);
        return kh ? <Text strong style={{ color: '#1890ff' }}>{kh.ten_cong_ty}</Text> : `KH ID: ${val}`;
      } 
    },
    { 
      title: 'Ngày tạo', 
      dataIndex: 'ngay_tao', 
      render: (val) => formatDate(val) 
    },
    { 
      title: 'Hết hạn', 
      dataIndex: 'ngay_het_han', 
      render: (val) => formatDate(val) 
    },
    { 
      title: 'Tổng GT', 
      dataIndex: 'tong_gia_tri', 
      align: 'right', 
      render: (val) => <CurrencyText value={val} /> 
    },
    { 
      title: 'Trạng thái', 
      dataIndex: 'trang_thai', 
      align: 'center', 
      render: (val) => <StatusTag status={val} /> 
    },
    {
      title: 'Thao tác',
      align: 'center',
      render: (_, record) => {
        const { id, trang_thai } = record;
        return (
          <Space size="small">
            <Tooltip title="Xem chi tiết">
              <Button type="text" icon={<EyeOutlined />} onClick={() => navigate(`/bao-gia/${id}`)} />
            </Tooltip>
            
            {trang_thai === 'DRAFT' && (
              <>
                <Tooltip title="Sửa báo giá">
                  <Button type="text" style={{ color: '#fa8c16' }} icon={<EditOutlined />} onClick={() => navigate(`/bao-gia/${id}`)} />
                </Tooltip>
                <Tooltip title="Gửi khách hàng">
                  <Button type="text" style={{ color: '#1890ff' }} icon={<SendOutlined />} onClick={() => handleGui(id)} />
                </Tooltip>
              </>
            )}

            {trang_thai === 'SENT' && (
              <>
                <Tooltip title="Khách đồng ý">
                  <Button type="text" style={{ color: '#52c41a' }} icon={<CheckCircleOutlined />} onClick={() => handleXacNhan(id, 'ACCEPTED')} />
                </Tooltip>
                <Tooltip title="Khách từ chối">
                  <Button type="text" danger icon={<CloseCircleOutlined />} onClick={() => handleXacNhan(id, 'REJECTED')} />
                </Tooltip>
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
        <Title level={4} style={{ margin: 0 }}>Danh sách Báo giá</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/bao-gia/tao-moi')}>Tạo báo giá</Button>
      </div>

      <Space style={{ marginBottom: 16 }} wrap>
        <Select placeholder="Trạng thái" style={{ width: 150 }} allowClear onChange={setTrangThai}>
          <Option value="DRAFT">DRAFT</Option>
          <Option value="SENT">SENT</Option>
          <Option value="ACCEPTED">ACCEPTED</Option>
          <Option value="REJECTED">REJECTED</Option>
        </Select>
        <RangePicker format="DD/MM/YYYY" onChange={setDateRange} style={{ width: 250 }} />
      </Space>

      <Table 
        columns={columns} 
        dataSource={data} 
        rowKey="id" 
        loading={loading} 
        pagination={{ current: page, pageSize: limit, total: total, onChange: onChange }} 
        bordered 
      />
    </Card>
  );
};

export default BaoGiaPage;
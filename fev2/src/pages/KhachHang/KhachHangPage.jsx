import React, { useState, useEffect } from 'react';
import { Card, Input, Select, Button, Table, Space, Typography, message, Modal } from 'antd';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { khachHangService } from '../../services/khachHangService';
import { usePagination } from '../../hooks/usePagination';
import CurrencyText from '../../components/common/CurrencyText';
import StatusTag from '../../components/common/StatusTag';
import { useAuth } from '../../hooks/useAuth';

const { Title } = Typography;
const { Option } = Select;

const KhachHangPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { page, limit, total, setTotal, onChange } = usePagination(10);
  
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [search, setSearch] = useState('');
  const [isActive, setIsActive] = useState(null); // null = All

  const isManagerOrSale = ['MANAGER', 'SALE'].includes(user?.vaiTro);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await khachHangService.getList({ page, limit, search, isActive });
      if (res.success) {
        setData(res.data);
        setTotal(res.meta.total);
      }
    } catch (error) {
      message.error('Không thể tải danh sách khách hàng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, limit, search, isActive]);

  const handleDelete = (id) => {
    Modal.confirm({
      title: 'Xác nhận vô hiệu hóa',
      content: 'Khách hàng này sẽ bị chuyển sang trạng thái ngừng hợp tác. Bạn có chắc chắn?',
      okText: 'Đồng ý',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await khachHangService.delete(id);
          message.success('Đã vô hiệu hóa khách hàng');
          fetchData();
        } catch (error) {
          if (error?.error?.code === 'KHACH_HANG_CO_DU_LIEU') {
            message.error('Không thể xóa! Khách hàng này vẫn còn vận đơn chưa thanh toán.');
          } else {
            message.error('Có lỗi xảy ra khi xóa khách hàng');
          }
        }
      }
    });
  };

  const columns = [
    {
      title: 'STT',
      key: 'stt',
      width: 60,
      render: (_, __, index) => (page - 1) * limit + index + 1,
    },
    {
      title: 'Tên công ty',
      dataIndex: 'ten_cong_ty',
      key: 'tenCongTy',
      render: (text) => <span style={{ fontWeight: 500 }}>{text}</span>
    },
    {
      title: 'MST',
      dataIndex: 'ma_so_thue',
      key: 'maSoThue',
    },
    {
      title: 'Liên hệ',
      key: 'lienHe',
      render: (_, record) => (
        <div>
          <div>{record.so_dien_thoai}</div>
          <div style={{ fontSize: '12px', color: '#8c8c8c' }}>{record.nguoi_lien_he}</div>
        </div>
      )
    },
    {
      title: 'Hạn mức nợ',
      dataIndex: 'han_muc_cong_no',
      key: 'hanMuc',
      align: 'right',
      render: (val) => <CurrencyText value={val} />
    },
    {
      title: 'Trạng thái',
      dataIndex: 'is_active',
      key: 'isActive',
      align: 'center',
      render: (val) => <StatusTag active={val} />
    },
    {
      title: 'Thao tác',
      key: 'action',
      align: 'center',
      render: (_, record) => (
        <Space size="middle">
          <Button 
            type="text" 
            icon={<EditOutlined style={{ color: '#fa8c16' }} />} 
            onClick={() => navigate(`/khach-hang/${record.id}/sua`)}
            title="Sửa / Xem chi tiết"
          />
          {user?.vaiTro === 'MANAGER' && record.is_active === 1 && (
            <Button 
              type="text" 
              danger 
              icon={<DeleteOutlined />} 
              onClick={() => handleDelete(record.id)}
              title="Vô hiệu hóa"
            />
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card bordered={false}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>Danh sách Khách hàng</Title>
        {isManagerOrSale && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/khach-hang/tao-moi')}>
            Thêm mới
          </Button>
        )}
      </div>

      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          placeholder="Tìm kiếm tên, MST..."
          prefix={<SearchOutlined />}
          onPressEnter={(e) => setSearch(e.target.value)}
          onBlur={(e) => setSearch(e.target.value)}
          style={{ width: 250 }}
          allowClear
        />
        <Select
          placeholder="Lọc trạng thái"
          style={{ width: 180 }}
          allowClear
          onChange={(val) => setIsActive(val)}
        >
          <Option value={true}>Đang hợp tác</Option>
          <Option value={false}>Ngừng hợp tác</Option>
        </Select>
      </Space>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize: limit,
          total: total,
          showSizeChanger: true,
          onChange: onChange,
        }}
        bordered
      />
    </Card>
  );
};

export default KhachHangPage;
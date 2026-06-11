import React, { useState, useEffect } from 'react';
import { Card, Input, Select, Button, Table, Space, Typography, message, Modal, Tag, Tooltip } from 'antd';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, ShopOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { khachHangService } from '../../services/khachHangService';
import { usePagination } from '../../hooks/usePagination';
import CurrencyText from '../../components/common/CurrencyText';
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
  const [isActive, setIsActive] = useState(null);
  const [loaiKhach, setLoaiKhach] = useState(null); // Bộ lọc mới

  const role = user?.vai_tro || user?.vaiTro;
  const isManagerOrSale = ['MANAGER', 'SALE'].includes(role);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await khachHangService.getList({ page, limit, search, isActive, loaiKhach });
      if (res.success) {
        setData(res.data?.data || res.data || []);
        setTotal(res.pagination?.total || res.meta?.total || 0);
      }
    } catch (error) {
      message.error('Không thể tải danh sách khách hàng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [page, limit, search, isActive, loaiKhach]);

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
        } catch (error) { message.error('Có lỗi xảy ra khi vô hiệu hóa'); }
      }
    });
  };

  const columns = [
    { title: 'Tên công ty / Khách', dataIndex: 'ten_cong_ty', sorter: (a, b) => a.ten_cong_ty.localeCompare(b.ten_cong_ty), render: (text, record) => (
        <Space>
          {record.loai_khach === 'B2B_DOANH_NGHIEP' ? <ShopOutlined style={{ color: '#1890ff' }}/> : <UserOutlined style={{ color: '#52c41a' }}/>}
          <strong style={{ fontSize: 14 }}>{text}</strong>
        </Space>
      )
    },
    { 
      title: 'MST', 
      dataIndex: 'ma_so_thue',
      render: (val, record) => val 
        ? <Typography.Text copyable>{val}</Typography.Text> // Có MST thì cho phép bấm copy nhanh
        : <Typography.Text type="secondary" italic>Khách cá nhân</Typography.Text> // Không có thì báo Khách cá nhân
    },
    { title: 'Liên hệ', render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.so_dien_thoai}</div>
          <div style={{ fontSize: '12px', color: '#8c8c8c' }}>{record.nguoi_lien_he}</div>
        </div>
      )
    },
    { title: 'Hạn mức cấp', dataIndex: 'han_muc_no_toi_da', align: 'right', sorter: (a, b) => Number(a.han_muc_no_toi_da) - Number(b.han_muc_no_toi_da), render: (val) => <CurrencyText value={val} style={{ color: '#595959' }} /> },
    { title: 'Dư nợ hiện tại', dataIndex: 'tong_no_hien_tai', align: 'right', sorter: (a, b) => Number(a.tong_no_hien_tai) - Number(b.tong_no_hien_tai), render: (val) => <CurrencyText value={val} style={{ color: Number(val) > 0 ? '#cf1322' : '#52c41a', fontWeight: 'bold' }} /> },
    { title: 'Trạng thái', dataIndex: 'is_active', align: 'center', render: (val) => (val === 1 || val === true) ? <Tag color="success">Hợp tác</Tag> : <Tag color="default">Ngừng</Tag> },
    { title: 'Thao tác', align: 'center', render: (_, record) => {
        const hasDebt = Number(record.tong_no_hien_tai) > 0;
        const isActive = record.is_active === 1 || record.is_active === true;
        
        return (
          <Space size="middle">
            <Button type="text" icon={<EditOutlined style={{ color: '#fa8c16' }} />} onClick={() => navigate(`/khach-hang/${record.id}/sua`)} title="Sửa / Xem chi tiết" />
            
            {/* Logic Xóa Mềm: Chỉ Manager thấy. Nếu có nợ -> Disable nút & Hiện Tooltip */}
            {role === 'MANAGER' && isActive && (
              <Tooltip title={hasDebt ? "Không thể vô hiệu hóa khách hàng đang có dư nợ!" : "Vô hiệu hóa"}>
                <Button type="text" danger icon={<DeleteOutlined />} disabled={hasDebt} onClick={() => handleDelete(record.id)} />
              </Tooltip>
            )}
          </Space>
        )
      },
    },
  ];

  return (
    <Card bordered={false}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>Danh mục Khách hàng & Đối tác</Title>
        {isManagerOrSale && <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/khach-hang/tao-moi')}>Thêm mới</Button>}
      </div>

      <Space style={{ marginBottom: 16 }} wrap>
        <Input placeholder="Tìm kiếm tên, MST..." prefix={<SearchOutlined />} onBlur={(e) => {setSearch(e.target.value); onChange(1, limit);}} onPressEnter={(e) => {setSearch(e.target.value); onChange(1, limit);}} style={{ width: 250 }} allowClear />
        <Select placeholder="Phân loại" style={{ width: 180 }} allowClear onChange={(val) => {setLoaiKhach(val); onChange(1, limit);}}>
          <Option value="B2B_DOANH_NGHIEP">Doanh nghiệp (B2B)</Option>
          <Option value="B2C_VANG_LAI">Khách lẻ (B2C)</Option>
        </Select>
        <Select placeholder="Trạng thái" style={{ width: 150 }} allowClear onChange={(val) => {setIsActive(val); onChange(1, limit);}}>
          <Option value={true}>Đang hợp tác</Option>
          <Option value={false}>Ngừng hợp tác</Option>
        </Select>
      </Space>

      <Table columns={columns} dataSource={data} rowKey="id" loading={loading} pagination={{ current: page, pageSize: limit, total: total, showSizeChanger: true, onChange: onChange }} bordered />
    </Card>
  );
};
export default KhachHangPage;
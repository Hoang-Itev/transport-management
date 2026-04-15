import React, { useState, useEffect } from 'react';
import { Card, Button, Row, Col, Space, Typography, message, Modal, Form, Input, InputNumber, Divider, Spin, Table } from 'antd';
import { ArrowLeftOutlined, EditOutlined, CloseOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';

import { vanDonService } from '../../services/vanDonService';
import StatusTag from '../../components/common/StatusTag';
import CurrencyText from '../../components/common/CurrencyText';
import { formatDate } from '../../utils/formatDate';

const { Title, Text } = Typography;

const VanDonDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  // Modal State
  const [isWeightModalVisible, setIsWeightModalVisible] = useState(false);
  const [isCancelModalVisible, setIsCancelModalVisible] = useState(false);
  const [weightForm] = Form.useForm();
  const [cancelForm] = Form.useForm();

  const loadDetail = async () => {
    try {
      const res = await vanDonService.getById(id);
      if (res.success) {
        setData(res.data);
      }
    } catch (error) {
      message.error('Không tải được thông tin vận đơn');
      navigate('/van-don');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDetail(); }, [id]);

  // --- ACTIONS ---
  const handleUpdateWeight = async (values) => {
    try {
      await vanDonService.updateTrongLuong(id, values.trongLuongThucTe);
      message.success('Cập nhật trọng lượng thành công');
      setIsWeightModalVisible(false);
      loadDetail(); // Reload data
    } catch (error) { message.error(error?.error?.message || 'Lỗi cập nhật'); }
  };

  const handleCancel = async (values) => {
    try {
      await vanDonService.huyVanDon(id, values.lyDoHuy);
      message.success('Đã hủy vận đơn');
      setIsCancelModalVisible(false);
      loadDetail();
    } catch (error) { message.error(error?.error?.message || 'Không thể hủy vận đơn này'); }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 50 }}><Spin size="large" /></div>;
  if (!data) return null;

  // Quyền thao tác: Chỉ cho sửa/hủy khi chưa thanh toán và chưa bị hủy trước đó
  const canModify = data.trang_thai === 'CONFIRMED' && data.trang_thai_thanh_toan === 'UNPAID';

  // FIX: Quét mọi trường hợp tên mảng lịch sử phiếu thu mà Backend có thể trả về
  const ptList = data.phieu_thus || data.phieuThuList || data.chiTietPhieuThu || data.lich_su_thu || [];
  
  // FIX: Tính toán chính xác số tiền đã thu dựa trên mảng vừa quét được (quét cả so_tien_phan_bo hoặc so_tien)
  const calculatedDaThu = data.da_thu ?? ptList.reduce((sum, pt) => sum + Number(pt.so_tien_phan_bo || pt.so_tien || 0), 0);
  const conLai = Number(data.gia_tri) - calculatedDaThu;

  return (
    <Card bordered={false}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Space>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/van-don')} />
          <Title level={4} style={{ margin: 0 }}>Vận đơn {data.id}</Title>
          <StatusTag status={data.trang_thai} />
        </Space>
        
        {canModify && (
          <Space>
            <Button icon={<EditOutlined />} onClick={() => {
              weightForm.setFieldsValue({ trongLuongThucTe: data.trong_luong_thuc_te || data.trong_luong_du_kien });
              setIsWeightModalVisible(true);
            }}>
              Cập nhật TL thực tế
            </Button>
            <Button danger icon={<CloseOutlined />} onClick={() => setIsCancelModalVisible(true)}>
              Hủy đơn
            </Button>
          </Space>
        )}
      </div>

      <Row gutter={48}>
        {/* CỘT TRÁI: THÔNG TIN VẬN ĐƠN */}
        <Col span={12}>
          <Divider orientation="left">Thông tin vận đơn</Divider>
          <div style={{ lineHeight: '2.5' }}>
            <Row><Col span={8}><Text type="secondary">Khách hàng</Text></Col><Col span={16}><Text strong>{data.ten_cong_ty || `ID: ${data.khach_hang_id}`}</Text></Col></Row>
            <Row><Col span={8}><Text type="secondary">Ngày VC</Text></Col><Col span={16}><Text strong>{formatDate(data.ngay_van_chuyen)}</Text></Col></Row>
            <Row><Col span={8}><Text type="secondary">Liên hệ lấy</Text></Col><Col span={16}>{data.nguoi_lien_he_lay}</Col></Row>
            <Row><Col span={8}><Text type="secondary">Liên hệ giao</Text></Col><Col span={16}>{data.nguoi_lien_he_giao}</Col></Row>
          </div>

          <div style={{ marginTop: 16, padding: 16, backgroundColor: '#fafafa', borderRadius: 8 }}>
            <Row style={{ marginBottom: 8 }}>
              <Col span={8}><Text type="secondary">TL dự kiến</Text></Col>
              <Col span={16}><Text strong>{data.trong_luong_du_kien} kg</Text> ➔ <CurrencyText value={data.gia_tri_du_kien}/></Col>
            </Row>
            <Row>
              <Col span={8}><Text type="secondary">TL thực tế</Text></Col>
              <Col span={16}>
                {data.trong_luong_thuc_te ? (
                  <><Text strong style={{ color: '#1890ff' }}>{data.trong_luong_thuc_te} kg</Text> ➔ <CurrencyText value={data.gia_tri_thuc_te} style={{ color: '#cf1322' }}/></>
                ) : <Text italic type="secondary">Chưa cập nhật</Text>}
              </Col>
            </Row>
          </div>
        </Col>

        {/* CỘT PHẢI: THANH TOÁN */}
        <Col span={12}>
          <Divider orientation="left">Thanh toán</Divider>
          <div style={{ lineHeight: '2.5' }}>
            <Row><Col span={8}><Text type="secondary">Giá trị cuối</Text></Col><Col span={16}><CurrencyText value={data.gia_tri} style={{ fontSize: 18, color: '#cf1322' }}/></Col></Row>
            <Row><Col span={8}><Text type="secondary">Đã thu</Text></Col><Col span={16}><CurrencyText value={calculatedDaThu} style={{ color: '#52c41a', fontWeight: 'bold' }}/></Col></Row>
            <Row><Col span={8}><Text type="secondary">Còn lại</Text></Col><Col span={16}><CurrencyText value={conLai > 0 ? conLai : 0} style={{ color: conLai > 0 ? '#fa8c16' : '#52c41a' }}/></Col></Row>
            <Row><Col span={8}><Text type="secondary">Hạn TT</Text></Col><Col span={16}><Text strong>{formatDate(data.ngay_het_han_thanh_toan)}</Text></Col></Row>
            <Row><Col span={8}><Text type="secondary">Trạng thái TT</Text></Col><Col span={16}><StatusTag status={data.trang_thai_thanh_toan} /></Col></Row>
            {data.trang_thai === 'CANCELLED' && (
              <Row><Col span={8}><Text type="secondary">Lý do hủy</Text></Col><Col span={16}><Text type="danger">{data.ly_do_huy}</Text></Col></Row>
            )}
          </div>
        </Col>
      </Row>

      {/* LỊCH SỬ PHIẾU THU */}
      <Divider orientation="left">Lịch sử phiếu thu</Divider>
      <Table 
        dataSource={ptList} 
        rowKey={(record) => record.id || record.phieu_thu_id || Math.random()} 
        pagination={false}
        locale={{ emptyText: 'Chưa có giao dịch thanh toán nào' }}
        columns={[
          { title: 'Ngày', render: (_, r) => formatDate(r.ngay_thu || r.created_at) },
          { title: 'Số tiền', align: 'right', render: (_, r) => <CurrencyText value={r.so_tien_phan_bo || r.so_tien} style={{ color: '#52c41a', fontWeight: 500 }}/> },
          { title: 'Hình thức', dataIndex: 'hinh_thuc' },
          { title: 'Tham chiếu', render: (_, r) => r.so_tham_chieu || r.tham_chieu || '--' }
        ]}
      />

      {/* --- MODALS --- */}
      <Modal title="Cập nhật Trọng lượng thực tế" open={isWeightModalVisible} onCancel={() => setIsWeightModalVisible(false)} onOk={() => weightForm.submit()} destroyOnClose>
        <Form form={weightForm} layout="vertical" onFinish={handleUpdateWeight}>
          <Form.Item name="trongLuongThucTe" label="Số Kg thực tế sau khi cân" rules={[{ required: true, message: 'Bắt buộc nhập' }]}>
            <InputNumber style={{ width: '100%' }} min={0.1} />
          </Form.Item>
          <Text type="secondary" italic>Hệ thống sẽ tự động đối chiếu Bảng giá cước và tính lại "Giá trị" của Vận đơn này.</Text>
        </Form>
      </Modal>

      <Modal title="Xác nhận Hủy Vận đơn" open={isCancelModalVisible} onCancel={() => setIsCancelModalVisible(false)} onOk={() => cancelForm.submit()} destroyOnClose okType="danger" okText="Xác nhận Hủy">
        <Form form={cancelForm} layout="vertical" onFinish={handleCancel}>
          <Form.Item name="lyDoHuy" label="Lý do hủy" rules={[{ required: true, message: 'Vui lòng nhập lý do' }]}>
            <Input.TextArea rows={3} placeholder="Ví dụ: Khách báo hoãn chuyến..." />
          </Form.Item>
        </Form>
      </Modal>

    </Card>
  );
};

export default VanDonDetail;
import React, { useState, useEffect } from 'react';
import { Card, Form, Input, InputNumber, Button, Row, Col, message, Spin, Typography, Radio, Alert, Statistic } from 'antd';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { khachHangService } from '../../services/khachHangService';

const { Title } = Typography;
const { TextArea } = Input;

const KhachHangForm = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  
  // Dùng state để chứa thông tin nợ khi Edit
  const [tongNoHienTai, setTongNoHienTai] = useState(0);

  // Theo dõi sự thay đổi của Loại khách để Disable/Enable ô Hạn mức
  const loaiKhachValue = Form.useWatch('loaiKhach', form);

  useEffect(() => {
    // Logic động: Nếu chọn Khách lẻ (B2C), ép Hạn mức về 0 và không cho sửa
    if (loaiKhachValue === 'B2C_VANG_LAI') {
      form.setFieldsValue({ hanMucNoToiDa: 0 });
    }
  }, [loaiKhachValue, form]);

  useEffect(() => { if (isEdit) loadDetail(); }, [id]);

  const loadDetail = async () => {
    try {
      const res = await khachHangService.getById(id);
      if (res.success) {
        const d = res.data;
        setTongNoHienTai(Number(d.tong_no_hien_tai));
        form.setFieldsValue({
          loaiKhach: d.loai_khach,
          tenCongTy: d.ten_cong_ty,
          maSoThue: d.ma_so_thue,
          nguoiLienHe: d.nguoi_lien_he,
          soDienThoai: d.so_dien_thoai,
          email: d.email,
          diaChi: d.dia_chi,
          hanMucNoToiDa: Number(d.han_muc_no_toi_da), // Map đúng tên cột
          ghiChu: d.ghi_chu
        });
      }
    } catch (error) {
      message.error('Không tải được thông tin');
      navigate('/khach-hang');
    } finally { setFetching(false); }
  };

  const onFinish = async (values) => {
    setLoading(true);
    // Map ngược lại cho đúng Key API
    const payload = {
      loaiKhach: values.loaiKhach,
      tenCongTy: values.tenCongTy,
      maSoThue: values.maSoThue || null,
      nguoiLienHe: values.nguoiLienHe,
      soDienThoai: values.soDienThoai,
      email: values.email,
      diaChi: values.diaChi,
      hanMucNoToiDa: values.loaiKhach === 'B2C_VANG_LAI' ? 0 : values.hanMucNoToiDa,
      ghiChu: values.ghiChu
    };

    try {
      if (isEdit) {
        await khachHangService.update(id, payload);
        message.success('Cập nhật khách hàng thành công!');
      } else {
        await khachHangService.create(payload);
        message.success('Thêm mới khách hàng thành công!');
      }
      navigate('/khach-hang');
    } catch (error) {
      if (error?.error?.message?.includes('Duplicate') || error?.error?.code === 'ER_DUP_ENTRY') {
        message.error('LỖI: Mã số thuế này đã tồn tại trong hệ thống!');
      } else { message.error('Có lỗi xảy ra khi lưu dữ liệu'); }
    } finally { setLoading(false); }
  };

  if (fetching) return <div style={{ textAlign: 'center', padding: '50px' }}><Spin size="large" /></div>;

  return (
    <Card bordered={false}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/khach-hang')} style={{ marginRight: 16 }} />
          <Title level={4} style={{ margin: 0 }}>{isEdit ? 'Hồ sơ Khách hàng' : 'Thêm mới Khách hàng'}</Title>
        </div>
      </div>

      {isEdit && (
        <Alert 
          message="Thông tin Dư nợ hiện tại" 
          description={
            <div style={{ marginTop: 10 }}>
              <Statistic title="Khách đang nợ công ty:" value={tongNoHienTai} suffix="VNĐ" valueStyle={{ color: tongNoHienTai > 0 ? '#cf1322' : '#52c41a' }} />
            </div>
          } 
          type={tongNoHienTai > 0 ? "error" : "success"} 
          showIcon 
          style={{ marginBottom: 24 }} 
        />
      )}

      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ loaiKhach: 'B2B_DOANH_NGHIEP', hanMucNoToiDa: 50000000 }}>
        
        <Form.Item label="Phân loại Khách hàng" name="loaiKhach" rules={[{ required: true }]}>
          <Radio.Group buttonStyle="solid" disabled={isEdit}>
            <Radio.Button value="B2B_DOANH_NGHIEP">Khách Doanh nghiệp (B2B)</Radio.Button>
            <Radio.Button value="B2C_VANG_LAI">Khách Lẻ / Vãng lai (B2C)</Radio.Button>
          </Radio.Group>
        </Form.Item>

        <Row gutter={24}>
          <Col span={12}>
            <Form.Item label="Tên công ty / Tên khách" name="tenCongTy" rules={[{ required: true, message: 'Bắt buộc nhập' }]}>
              <Input placeholder="VD: Công ty TNHH Vận Tải ABC" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Mã số thuế" name="maSoThue" rules={[{ required: loaiKhachValue === 'B2B_DOANH_NGHIEP', message: 'Doanh nghiệp bắt buộc phải có MST' }]}>
              <Input placeholder="VD: 0123456789" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={24}>
          <Col span={8}>
            <Form.Item label="Người liên hệ" name="nguoiLienHe" rules={[{ required: true, message: 'Bắt buộc nhập' }]}>
              <Input placeholder="VD: Nguyễn Văn A" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Số điện thoại" name="soDienThoai" rules={[{ required: true, message: 'Bắt buộc nhập' }]}>
              <Input placeholder="VD: 0901234567" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Email" name="email">
              <Input placeholder="VD: ketoan@abc.com (Dùng để gửi mail nhắc nợ)" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="Địa chỉ" name="diaChi">
          <Input placeholder="VD: 123 Đường Láng, Hà Nội" />
        </Form.Item>

        <Row gutter={24}>
          <Col span={12}>
            <Form.Item 
              label="Hạn mức ghi nợ tối đa (VNĐ)" 
              name="hanMucNoToiDa"
              extra={loaiKhachValue === 'B2C_VANG_LAI' ? "Khách lẻ (B2C) bắt buộc thanh toán ngay, hạn mức luôn là 0." : "Nhập 0 nếu yêu cầu thanh toán trước khi giao hàng."}
              rules={[{ required: true, message: 'Không được để trống' }]}
            >
              <InputNumber 
                style={{ width: '100%', fontWeight: 'bold', color: '#1890ff' }} 
                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => value.replace(/\$\s?|(,*)/g, '')}
                min={0} 
                disabled={loaiKhachValue === 'B2C_VANG_LAI'} // Khóa ô nhập nếu là B2C
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="Ghi chú nội bộ" name="ghiChu">
          <TextArea rows={3} placeholder="Đặc điểm giao hàng, giờ giấc lấy hàng..." />
        </Form.Item>

        <div style={{ textAlign: 'right', marginTop: 24, paddingBottom: 50 }}>
          <Button onClick={() => navigate('/khach-hang')} style={{ marginRight: 12 }}>Hủy bỏ</Button>
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
            {isEdit ? 'Lưu thay đổi' : 'Tạo khách hàng'}
          </Button>
        </div>
      </Form>
    </Card>
  );
};
export default KhachHangForm;
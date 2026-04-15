import React, { useState, useEffect } from 'react';
import { Card, Form, Input, InputNumber, Button, Row, Col, message, Spin, Typography } from 'antd';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { khachHangService } from '../../services/khachHangService';

const { Title } = Typography;
const { TextArea } = Input;

const KhachHangForm = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id } = useParams(); // Lấy ID từ URL
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);

  useEffect(() => {
    if (isEdit) {
      loadDetail();
    }
  }, [id]);

  const loadDetail = async () => {
    try {
      const res = await khachHangService.getById(id);
      if (res.success) {
        const d = res.data;
        // Map dữ liệu snake_case từ BE sang camelCase cho Form
        form.setFieldsValue({
          tenCongTy: d.ten_cong_ty,
          maSoThue: d.ma_so_thue,
          nguoiLienHe: d.nguoi_lien_he,
          soDienThoai: d.so_dien_thoai,
          email: d.email,
          diaChi: d.dia_chi,
          hanMucCongNo: Number(d.han_muc_cong_no),
          kyHanThanhToan: d.ky_han_thanh_toan,
          ghiChu: d.ghi_chu
        });
      }
    } catch (error) {
      message.error('Không tải được thông tin khách hàng');
      navigate('/khach-hang');
    } finally {
      setFetching(false);
    }
  };

  const onFinish = async (values) => {
    setLoading(true);
    try {
      if (isEdit) {
        await khachHangService.update(id, values);
        message.success('Cập nhật khách hàng thành công!');
      } else {
        await khachHangService.create(values);
        message.success('Thêm mới khách hàng thành công!');
      }
      navigate('/khach-hang');
    } catch (error) {
      // Bắt lỗi trùng MST từ Database
      if (error?.error?.message?.includes('Duplicate') || error?.error?.code === 'ER_DUP_ENTRY') {
        message.error('Mã số thuế này đã tồn tại trong hệ thống!');
      } else {
        message.error(error?.error?.message || 'Có lỗi xảy ra khi lưu dữ liệu');
      }
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <div style={{ textAlign: 'center', padding: '50px' }}><Spin size="large" /></div>;
  }

  return (
    <Card bordered={false}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/khach-hang')} style={{ marginRight: 16 }} />
        <Title level={4} style={{ margin: 0 }}>{isEdit ? 'Cập nhật Khách hàng' : 'Thêm mới Khách hàng'}</Title>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{ hanMucCongNo: 0, kyHanThanhToan: 30 }}
      >
        <Row gutter={24}>
          <Col span={12}>
            <Form.Item label="Tên công ty" name="tenCongTy" rules={[{ required: true, message: 'Vui lòng nhập tên công ty' }]}>
              <Input placeholder="VD: Công ty TNHH Vận Tải ABC" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Mã số thuế" name="maSoThue" rules={[{ required: true, message: 'Vui lòng nhập mã số thuế' }]}>
              <Input placeholder="VD: 0123456789" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={24}>
          <Col span={8}>
            <Form.Item label="Người liên hệ" name="nguoiLienHe" rules={[{ required: true, message: 'Vui lòng nhập người liên hệ' }]}>
              <Input placeholder="VD: Nguyễn Văn A" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Số điện thoại" name="soDienThoai" rules={[{ required: true, message: 'Vui lòng nhập số điện thoại' }]}>
              <Input placeholder="VD: 0901234567" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Email" name="email" rules={[{ required: true, type: 'email', message: 'Vui lòng nhập email hợp lệ' }]}>
              <Input placeholder="VD: abc@gmail.com" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="Địa chỉ" name="diaChi">
          <Input placeholder="VD: 123 Đường Láng, Hà Nội" />
        </Form.Item>

        <Row gutter={24}>
          <Col span={12}>
            <Form.Item label="Hạn mức công nợ (VNĐ)" name="hanMucCongNo">
              <InputNumber 
                style={{ width: '100%' }} 
                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => value.replace(/\$\s?|(,*)/g, '')}
                min={0}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Kỳ hạn thanh toán (Ngày)" name="kyHanThanhToan">
              <InputNumber style={{ width: '100%' }} min={1} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="Ghi chú" name="ghiChu">
          <TextArea rows={3} placeholder="Nhập ghi chú (nếu có)..." />
        </Form.Item>

        <div style={{ textAlign: 'right', marginTop: 24 }}>
          <Button onClick={() => navigate('/khach-hang')} style={{ marginRight: 12 }}>Hủy bỏ</Button>
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
            {isEdit ? 'Lưu thay đổi' : 'Tạo mới'}
          </Button>
        </div>
      </Form>
    </Card>
  );
};

export default KhachHangForm;
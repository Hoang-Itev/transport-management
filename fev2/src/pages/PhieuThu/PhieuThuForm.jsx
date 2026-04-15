import React, { useState, useEffect } from 'react';
import { Card, Form, Input, InputNumber, Button, Select, DatePicker, message, Divider, Typography, Row, Col, Checkbox } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, CheckCircleFilled } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

import { phieuThuService } from '../../services/phieuThuService';
import { khachHangService } from '../../services/khachHangService';
import { vanDonService } from '../../services/vanDonService';
import CurrencyText from '../../components/common/CurrencyText';

const { Title, Text } = Typography;
const { Option } = Select;

const PhieuThuForm = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [khachHangList, setKhachHangList] = useState([]);
  const [vanDonList, setVanDonList] = useState([]); // Chứa danh sách VĐ chưa thanh toán xong

  // State tính toán phân bổ
  const [tongTienPhieu, setTongTienPhieu] = useState(0);
  const [allocations, setAllocations] = useState({}); // { [vanDonId]: amount }

  // HÀM MỚI: Tự động sinh mã giao dịch
  const generateRefCode = (hinhThuc) => {
    const prefix = hinhThuc === 'TIEN_MAT' ? 'TM' : 'CK';
    const randomStr = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}${dayjs().format('YYYYMMDD')}${randomStr}`;
  };

  useEffect(() => {
    khachHangService.getList({ limit: 1000 }).then(res => setKhachHangList(res.data));
  }, []);

  // Khi chọn khách hàng -> Load các Vận đơn của khách đó (Chỉ lấy CONFIRMED và chưa PAID)
  const handleKhachHangChange = async (khachHangId) => {
    setAllocations({});
    setVanDonList([]);
    if (!khachHangId) return;

    try {
      const res = await vanDonService.getList({ khachHangId, trangThai: 'CONFIRMED', limit: 1000 });
      if (res.success) {
        // Lọc bỏ những VĐ đã PAID hoặc CANCELLED
        const unpaids = res.data.filter(vd => vd.trang_thai_thanh_toan !== 'PAID');
        
        // Tính toán số tiền CÒN LẠI cần thu của từng Vận đơn (Lưu thêm daThu để hiển thị)
        const processed = unpaids.map(vd => {
          const daThu = Number(vd.da_thu || 0);
          return {
            ...vd,
            daThu: daThu,
            conLai: Number(vd.gia_tri) - daThu
          };
        });
        setVanDonList(processed);
      }
    } catch (error) { message.error('Lỗi tải danh sách vận đơn'); }
  };

  // --- LOGIC TICK CHỌN VÀ NHẬP TIỀN PHÂN BỔ ---
  const tongPhanBo = Object.values(allocations).reduce((sum, val) => sum + (val || 0), 0);
  const chenhLech = tongTienPhieu - tongPhanBo;

  const handleTickVanDon = (vdId, checked, conLai) => {
    const newAlloc = { ...allocations };
    if (checked) {
      // Nếu tick chọn: Gán số tiền tối đa có thể (Không vượt quá Còn lại của VĐ, và không vượt quá số Tiền phiếu còn dư)
      const soTienDu = tongTienPhieu - tongPhanBo;
      const tienCanDien = Math.min(conLai, soTienDu > 0 ? soTienDu : 0);
      newAlloc[vdId] = tienCanDien;
    } else {
      delete newAlloc[vdId];
    }
    setAllocations(newAlloc);
  };

  const handleAmountChange = (vdId, val, conLai) => {
    const newAlloc = { ...allocations };
    // Không cho phép nhập lố số tiền Còn lại của Vận đơn
    newAlloc[vdId] = val > conLai ? conLai : val;
    setAllocations(newAlloc);
  };

  const onFinish = async (values) => {
    if (tongTienPhieu <= 0) return message.warning('Vui lòng nhập Tổng số tiền > 0');
    if (chenhLech !== 0) return message.error('Số tiền phân bổ chưa khớp với Tổng tiền phiếu!');
    if (Object.keys(allocations).length === 0) return message.error('Vui lòng chọn ít nhất 1 vận đơn để phân bổ!');

    const phanBo = Object.entries(allocations).map(([vdId, amount]) => ({
      vanDonId: vdId,
      soTienPhanBo: amount
    })).filter(item => item.soTienPhanBo > 0);

    setLoading(true);
    try {
      const payload = {
        ...values,
        ngayThu: values.ngayThu.format('YYYY-MM-DD'),
        phanBo
      };
      
      await phieuThuService.create(payload);
      message.success('Tạo phiếu thu thành công!');
      navigate('/phieu-thu');
    } catch (error) {
      message.error(error?.error?.message || 'Lỗi khi tạo phiếu thu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card bordered={false}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/phieu-thu')} style={{ marginRight: 16 }}/>
        <Title level={4} style={{ margin: 0 }}>Tạo Phiếu Thu Mới</Title>
      </div>

      {/* CẬP NHẬT: initialValues để tự động điền Mã tham chiếu ngay khi mở trang */}
      <Form 
        form={form} 
        layout="vertical" 
        onFinish={onFinish} 
        initialValues={{ 
          ngayThu: dayjs(),
          hinhThuc: 'CHUYEN_KHOAN',
          soThamChieu: generateRefCode('CHUYEN_KHOAN')
        }}
      >
        <Divider orientation="left">Thông tin phiếu thu</Divider>
        <Row gutter={24}>
          <Col span={8}>
            <Form.Item label="Khách hàng" name="khachHangId" rules={[{ required: true }]}>
              <Select showSearch placeholder="Chọn khách hàng để load nợ..." 
                optionFilterProp="children" onChange={handleKhachHangChange}
                options={khachHangList.map(kh => ({ value: kh.id, label: kh.ten_cong_ty }))}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Ngày thu" name="ngayThu" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Hình thức thanh toán" name="hinhThuc" rules={[{ required: true }]}>
              {/* CẬP NHẬT: Khi đổi hình thức, tự động sinh lại mã tham chiếu cho phù hợp */}
              <Select placeholder="Chọn hình thức" onChange={(val) => form.setFieldsValue({ soThamChieu: generateRefCode(val) })}>
                <Option value="CHUYEN_KHOAN">Chuyển khoản</Option>
                <Option value="TIEN_MAT">Tiền mặt</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={24}>
          <Col span={8}>
            <Form.Item label="Số tham chiếu (Mã GD Ngân hàng)" name="soThamChieu">
              <Input placeholder="VD: CK2026..." />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="TỔNG SỐ TIỀN THU (VNĐ)" name="tongSoTien" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} min={1} size="large" onChange={setTongTienPhieu} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Ghi chú" name="ghiChu">
              <Input placeholder="Lý do thu..." />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">Phân bổ vào vận đơn</Divider>
        {vanDonList.length === 0 ? (
          <div style={{ color: 'gray', padding: 16, backgroundColor: '#fafafa', textAlign: 'center' }}>
            Vui lòng chọn Khách hàng (có phát sinh nợ) để tải danh sách vận đơn.
          </div>
        ) : (
          <div style={{ backgroundColor: '#fafafa', padding: 16, borderRadius: 8, border: '1px solid #f0f0f0' }}>
            {vanDonList.map(vd => (
              <Row key={vd.id} style={{ marginBottom: 16, alignItems: 'center' }}>
                <Col span={8}>
                  <Checkbox 
                    checked={allocations[vd.id] !== undefined}
                    onChange={(e) => handleTickVanDon(vd.id, e.target.checked, vd.conLai)}
                  >
                    <Text strong>{vd.id}</Text>
                  </Checkbox>
                </Col>
                {/* CẬP NHẬT: Hiển thị thêm dòng "Đã thu" */}
                <Col span={8}>
                  <div style={{ marginBottom: 4 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Đã thu: </Text>
                    <CurrencyText value={vd.daThu} style={{ fontSize: 12, color: '#52c41a' }} />
                  </div>
                  <div>
                    <Text type="secondary">Cần thu: </Text>
                    <CurrencyText value={vd.conLai} style={{ color: '#cf1322', fontWeight: 500 }} />
                  </div>
                </Col>
                <Col span={8}>
                  <InputNumber 
                    style={{ width: '100%' }} 
                    placeholder="Số tiền phân bổ..."
                    min={0}
                    max={vd.conLai}
                    value={allocations[vd.id]}
                    onChange={(val) => handleAmountChange(vd.id, val, vd.conLai)}
                    disabled={allocations[vd.id] === undefined}
                  />
                </Col>
              </Row>
            ))}

            <Divider style={{ margin: '16px 0' }}/>
            
            {/* TỔNG KẾT BẢNG TÍNH */}
            <div style={{ fontSize: 16, lineHeight: '2' }}>
              <Row>
                <Col span={16} style={{ textAlign: 'right', paddingRight: 16 }}><Text type="secondary">Tổng tiền trên Phiếu:</Text></Col>
                <Col span={8}><CurrencyText value={tongTienPhieu} /></Col>
              </Row>
              <Row>
                <Col span={16} style={{ textAlign: 'right', paddingRight: 16 }}><Text type="secondary">Đã phân bổ vào VĐ:</Text></Col>
                <Col span={8}><CurrencyText value={tongPhanBo} style={{ color: '#1890ff' }}/></Col>
              </Row>
              <Row>
                <Col span={16} style={{ textAlign: 'right', paddingRight: 16 }}><Text strong>Chênh lệch:</Text></Col>
                <Col span={8}>
                  {chenhLech === 0 ? (
                    <Text type="success"><CheckCircleFilled /> Khớp (0 VNĐ)</Text>
                  ) : (
                    <Text type="danger"><CurrencyText value={chenhLech} /> (Phải = 0 mới được lưu)</Text>
                  )}
                </Col>
              </Row>
            </div>
          </div>
        )}

        <div style={{ textAlign: 'right', marginTop: 24 }}>
          <Button onClick={() => navigate('/phieu-thu')} style={{ marginRight: 12 }}>Hủy</Button>
          <Button type="primary" htmlType="submit" size="large" icon={<SaveOutlined />} loading={loading} disabled={chenhLech !== 0 || tongTienPhieu <= 0}>
            Lưu phiếu thu
          </Button>
        </div>
      </Form>
    </Card>
  );
};

export default PhieuThuForm;
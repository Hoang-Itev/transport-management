import React, { useState, useEffect } from 'react';
// import { Card, Form, Input, InputNumber, Button, Select, DatePicker, message, Divider, Typography, Row, Col, Checkbox } from 'antd';
// import { ArrowLeftOutlined, SaveOutlined, CheckCircleFilled } from '@ant-design/icons';

// Thay thế 2 dòng import cũ bằng 2 dòng này:
import { Card, Form, Input, InputNumber, Button, Select, DatePicker, message, Divider, Typography, Row, Col, Checkbox, Upload } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, CheckCircleFilled, ScanOutlined } from '@ant-design/icons';

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
  
  // 🚀 THÊM ĐOẠN CODE AI NÀY VÀO DƯỚI STATE LOADING
  const [scanning, setScanning] = useState(false);

  const handleScanBill = async ({ file, onSuccess, onError }) => {
    setScanning(true);
    try {
      const formData = new FormData();
      formData.append('billImage', file);
      
      const res = await phieuThuService.scanBill(formData);
      
      if (res.success && res.data.tongSoTien > 0) {
        // Tự động điền số tiền AI đọc được vào Form
        form.setFieldsValue({ tongSoTien: res.data.tongSoTien });
        setTongTienPhieu(res.data.tongSoTien);
        message.success('🤖 AI đã nhận diện thành công số tiền!');
        onSuccess("ok");
      } else {
        message.warning(res.message || 'AI không tìm thấy số tiền hợp lệ, vui lòng nhập tay.');
        onError("AI failed to read amount");
      }
    } catch (error) {
      message.error('Lỗi khi quét bill. Backend chưa sẵn sàng hoặc file quá lớn.');
      onError(error);
    } finally {
      setScanning(false);
    }
  };
  // ---------------------------------------------

  const [khachHangList, setKhachHangList] = useState([]);
  const [vanDonList, setVanDonList] = useState([]); 

  const [tongTienPhieu, setTongTienPhieu] = useState(0);
  const [allocations, setAllocations] = useState({}); 

  const generateRefCode = (hinhThuc) => {
    const prefix = hinhThuc === 'TIEN_MAT' ? 'TM' : 'CK';
    const randomStr = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}${dayjs().format('YYYYMMDD')}${randomStr}`;
  };

  useEffect(() => {
    khachHangService.getList({ limit: 1000 }).then(res => setKhachHangList(res.data));
  }, []);

  const handleKhachHangChange = async (khachHangId) => {
    setAllocations({});
    setVanDonList([]);
    if (!khachHangId) return;

    try {
      const res = await vanDonService.getList({ khachHangId, trangThai: 'CONFIRMED', limit: 1000 });
      if (res.success) {
        const unpaids = res.data.filter(vd => vd.trang_thai_thanh_toan !== 'PAID');
        
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

  // 🚀 THUẬT TOÁN "RÓT NƯỚC": Tự động phân bổ lại khi người dùng sửa số Tổng Tiền Phiếu
  useEffect(() => {
    const checkedIds = Object.keys(allocations);
    if (checkedIds.length === 0) return; // Chưa tick cái nào thì bỏ qua

    let remaining = tongTienPhieu || 0;
    const newAlloc = {};

    // Duyệt qua các Vận đơn ĐANG ĐƯỢC TICK để rót tiền vào
    checkedIds.forEach(vdId => {
      const vd = vanDonList.find(v => v.id === vdId);
      if (vd) {
        // Lấy min giữa "Số tiền còn nợ của đơn này" và "Số tiền phiếu còn dư"
        const amount = Math.min(vd.conLai, remaining > 0 ? remaining : 0);
        newAlloc[vdId] = amount;
        remaining -= amount; // Trừ dần số tiền phiếu
      }
    });

    setAllocations(newAlloc);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tongTienPhieu]); // Kích hoạt mỗi khi gõ lại ô TỔNG SỐ TIỀN

  const handleTickVanDon = (vdId, checked, conLai) => {
    const newAlloc = { ...allocations };
    if (checked) {
      const tongPhanBoHienTai = Object.values(newAlloc).reduce((sum, val) => sum + (val || 0), 0);
      const soTienDu = tongTienPhieu - tongPhanBoHienTai;
      newAlloc[vdId] = Math.min(conLai, soTienDu > 0 ? soTienDu : 0);
    } else {
      delete newAlloc[vdId];
    }
    setAllocations(newAlloc);
  };

  const handleAmountChange = (vdId, val, conLai) => {
    const newAlloc = { ...allocations };
    newAlloc[vdId] = val > conLai ? conLai : val;
    setAllocations(newAlloc);
  };

  const tongPhanBo = Object.values(allocations).reduce((sum, val) => sum + (val || 0), 0);
  const chenhLech = tongTienPhieu - tongPhanBo;

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
              <Select 
                showSearch 
                placeholder="Chọn khách hàng để load nợ..." 
                // 🚀 FIX LỖI TÌM KIẾM TẠI ĐÂY
                optionFilterProp="label" 
                filterOption={(input, option) => String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                onChange={handleKhachHangChange}
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
          {/* TÌM CỘT TỔNG SỐ TIỀN NÀY VÀ THAY BẰNG ĐOẠN MỚI NÀY */}
          <Col span={8}>
            <Form.Item label="TỔNG SỐ TIỀN THU (VNĐ)" required>
              <div style={{ display: 'flex', gap: '8px' }}>
                
                {/* 🚀 Bọc noStyle để chỉ điểm cho Ant Design biết chỗ nhận dữ liệu */}
                <Form.Item name="tongSoTien" noStyle rules={[{ required: true, message: 'Nhập số tiền' }]}>
                  <InputNumber 
                    style={{ width: '100%' }} 
                    min={1} 
                    size="large" 
                    onChange={(val) => setTongTienPhieu(val || 0)} 
                  />
                </Form.Item>
                
                <Upload 
                  customRequest={handleScanBill} 
                  showUploadList={false} 
                  accept="image/*"
                >
                  <Button size="large" type="dashed" icon={<ScanOutlined />} loading={scanning} style={{ borderColor: '#52c41a', color: '#52c41a' }}>
                    Quét AI
                  </Button>
                </Upload>

              </div>
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
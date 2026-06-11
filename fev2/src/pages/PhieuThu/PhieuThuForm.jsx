import React, { useState, useEffect } from 'react';
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
  const [scanning, setScanning] = useState(false);

  const [khachHangList, setKhachHangList] = useState([]);
  const [vanDonList, setVanDonList] = useState([]); 
  const [tongTienPhieu, setTongTienPhieu] = useState(0);
  const [allocations, setAllocations] = useState({}); 

  // Lưu trữ mã vận đơn AI quét được để auto-tick
  const [aiDetectedVanDons, setAiDetectedVanDons] = useState([]);

  const generateRefCode = (hinhThuc) => {
    const prefix = hinhThuc === 'TIEN_MAT' ? 'TM' : 'CK';
    const randomStr = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}${dayjs().format('YYYYMMDD')}${randomStr}`;
  };

  useEffect(() => {
    khachHangService.getList({ limit: 1000 }).then(res => setKhachHangList(res.data));
  }, []);

  // 🚀 FIX: Thêm tham số aiAmount để truyền số tiền AI vừa quét vào thẳng thuật toán rót nước
  const handleKhachHangChange = async (khachHangId, autoTickCodes = [], aiAmount = null) => {
    setAllocations({});
    setVanDonList([]);
    if (!khachHangId) return;

    try {
      const res = await vanDonService.getList({ khachHangId, limit: 1000 });
      
      if (res.success) {
        const rawData = res.data?.data || res.data || [];
        const unpaids = rawData.filter(vd => vd.trang_thai_thanh_toan !== 'PAID' && vd.trang_thai_van_chuyen !== 'CANCELLED');

        const processed = unpaids.map(vd => {
          const daThu = Number(vd.da_thu || 0);
          return {
            ...vd,
            ma_van_don: vd.ma_van_don, 
            daThu: daThu,
            conLai: Number(vd.so_tien_chot_cuoi) - daThu 
          };
        });
        
        setVanDonList(processed);

        const codesToTick = autoTickCodes.length > 0 ? autoTickCodes : aiDetectedVanDons;

        if (codesToTick.length > 0) {
          const newAlloc = {};
          const normalizeString = (str) => String(str).replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
          const aiNormalizedList = codesToTick.map(code => normalizeString(code));

          // 🚀 THUẬT TOÁN RÓT NƯỚC (WATERFALL): Dội tiền từ trên xuống dưới
          let remainingMoney = aiAmount !== null ? Number(aiAmount) : Number(tongTienPhieu || 0);

          processed.forEach(vd => {
            const dbNormalizedCode = normalizeString(vd.ma_van_don);
            if (aiNormalizedList.includes(dbNormalizedCode)) {
              // Lấy mức tối thiểu giữa "Tiền còn nợ của đơn" và "Tiền phiếu thu còn dư"
              const amountToAllocate = Math.min(vd.conLai, remainingMoney > 0 ? remainingMoney : 0);
              newAlloc[vd.ma_van_don] = amountToAllocate;
              
              // Trừ đi số tiền vừa phân bổ để rót cho đơn tiếp theo
              remainingMoney -= amountToAllocate; 
            }
          });
          
          if (Object.keys(newAlloc).length > 0) {
            setAllocations(newAlloc);
            message.info('✨ Đã tự động phân bổ tiền vào các Vận đơn khớp với ảnh Bill!');
          }
        }
      }
    } catch (error) { message.error('Lỗi tải danh sách vận đơn'); }
  };

  const removeAccents = (str) => {
    if (!str) return '';
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  };

  const handleScanBill = async ({ file, onSuccess, onError }) => {
    setScanning(true);
    try {
      const formData = new FormData();
      formData.append('billImage', file);
      
      const res = await phieuThuService.scanBill(formData);
      
      if (res.success && res.data.tongSoTien > 0) {
        form.setFieldsValue({ tongSoTien: res.data.tongSoTien });
        setTongTienPhieu(res.data.tongSoTien);

        const aiName = removeAccents(res.data.tenNguoiChuyen || '');
        const detectedCodes = res.data.maVanDonList || [];

        if (detectedCodes.length > 0) {
          setAiDetectedVanDons(detectedCodes);
        }

        if (aiName) {
          const matchedKhach = khachHangList.find(kh => {
            const dbName = removeAccents(kh.ten_cong_ty);
            return dbName.includes(aiName) || aiName.includes(dbName);
          });
          
          if (matchedKhach) {
            form.setFieldsValue({ khachHangId: matchedKhach.id });
            // 🚀 FIX: Truyền thêm số tiền AI quét được vào tham số thứ 3 để phục vụ Thuật toán Rót nước
            handleKhachHangChange(matchedKhach.id, detectedCodes, res.data.tongSoTien); 
            message.info(`Đã tự động chọn khách: ${matchedKhach.ten_cong_ty}`);
          }
        }
        
        message.success(`🤖 AI nhận diện số tiền: ${res.data.tongSoTien.toLocaleString()}đ!`);
        onSuccess("ok");
      } else {
        message.warning(res.message || 'AI không tìm thấy số tiền hợp lệ, vui lòng nhập tay.');
        onError("AI failed to read amount");
      }
    } catch (error) {
      message.error('Lỗi khi quét bill bằng AI.');
      onError(error);
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    const checkedIds = Object.keys(allocations);
    if (checkedIds.length === 0) return; 

    let remaining = tongTienPhieu || 0;
    const newAlloc = {};

    checkedIds.forEach(vdId => {
      const vd = vanDonList.find(v => v.ma_van_don === vdId);
      if (vd) {
        const amount = Math.min(vd.conLai, remaining > 0 ? remaining : 0);
        newAlloc[vdId] = amount;
        remaining -= amount; 
      }
    });

    setAllocations(newAlloc);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tongTienPhieu]); 

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

      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ ngayThu: dayjs(), hinhThuc: 'CHUYEN_KHOAN', soThamChieu: generateRefCode('CHUYEN_KHOAN') }}>
        <Divider orientation="left">Thông tin hóa đơn (Quét AI trước để auto-tick)</Divider>
        <Row gutter={24}>
          <Col span={8}>
            <Form.Item label="TỔNG SỐ TIỀN THU (VNĐ)" required>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Form.Item name="tongSoTien" noStyle rules={[{ required: true, message: 'Nhập số tiền' }]}>
                  <InputNumber style={{ width: '100%' }} min={1} size="large" onChange={(val) => setTongTienPhieu(val || 0)} />
                </Form.Item>
                <Upload customRequest={handleScanBill} showUploadList={false} accept="image/*">
                  <Button size="large" type="dashed" icon={<ScanOutlined />} loading={scanning} style={{ borderColor: '#722ed1', color: '#722ed1' }}>
                    Quét Bill AI
                  </Button>
                </Upload>
              </div>
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
          <Col span={8}>
            <Form.Item label="Số tham chiếu (Mã GD Ngân hàng)" name="soThamChieu">
              <Input placeholder="VD: CK2026..." />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={24}>
          <Col span={8}>
            <Form.Item label="Khách hàng (Nguồn tiền)" name="khachHangId" rules={[{ required: true }]}>
              <Select 
                showSearch placeholder="Chọn khách hàng để load nợ..." 
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
            <Form.Item label="Ghi chú (Nội dung)" name="ghiChu">
              <Input placeholder="Lý do thu..." />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">Danh sách Vận đơn cần thu</Divider>
        {vanDonList.length === 0 ? (
          <div style={{ color: 'gray', padding: 16, backgroundColor: '#fafafa', textAlign: 'center' }}>
            Vui lòng chọn Khách hàng (có phát sinh nợ) để tải danh sách vận đơn.
          </div>
        ) : (
          <div style={{ backgroundColor: '#fafafa', padding: 16, borderRadius: 8, border: '1px solid #f0f0f0' }}>
            {vanDonList.map(vd => (
              <Row key={vd.ma_van_don} style={{ marginBottom: 16, alignItems: 'center' }}>
                <Col span={8}>
                  {/* 🚀 FIX: Map đúng vd.ma_van_don để checkbox hoạt động */}
                  <Checkbox 
                    checked={allocations[vd.ma_van_don] !== undefined}
                    onChange={(e) => handleTickVanDon(vd.ma_van_don, e.target.checked, vd.conLai)}
                  >
                    <Text strong>{vd.ma_van_don}</Text>
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
                    value={allocations[vd.ma_van_don]}
                    onChange={(val) => handleAmountChange(vd.ma_van_don, val, vd.conLai)}
                    disabled={allocations[vd.ma_van_don] === undefined}
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
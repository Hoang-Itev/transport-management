import React, { useState, useEffect } from 'react';
import { Card, Form, Select, Button, Row, Col, Space, Typography, message, Modal, InputNumber, Input, Divider, Spin, Table, Tag, Alert, AutoComplete } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, CloseOutlined, PrinterOutlined, EnvironmentOutlined, MailOutlined, MessageOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

import { vanDonService } from '../../services/vanDonService';
import StatusTag from '../../components/common/StatusTag';
import CurrencyText from '../../components/common/CurrencyText';
import { formatDate } from '../../utils/formatDate';
import GoongMapRoute from '../../components/common/GoongMapRoute';

import { danhMucService } from '../../services/danhMucService';

const { Title, Text } = Typography;
const { Option } = Select;
const REST_KEY = import.meta.env.VITE_GOONG_REST_KEY;

const VanDonDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [savingActuals, setSavingActuals] = useState(false);
  const [data, setData] = useState(null);
  const [donViTinhs, setDonViTinhs] = useState([]);

  const [routeStatus, setRouteStatus] = useState('');
  const [actualsForm] = Form.useForm();

  // 🚀 State quản lý Địa chỉ & Khoảng cách động
  const [diemLay, setDiemLay] = useState('');
  const [diemGiao, setDiemGiao] = useState('');
  const [khoangCach, setKhoangCach] = useState(0);

  // 🚀 State gợi ý Autocomplete
  const [optionsLay, setOptionsLay] = useState([]);
  const [optionsGiao, setOptionsGiao] = useState([]);

  const loadDetail = async () => {
    setLoading(true);
    try {
      const res = await vanDonService.getById(id);
      if (res.success && res.data) {
        const d = res.data;
        setData(d);
        setRouteStatus(d.trang_thai_van_chuyen);
        setDiemLay(d.diem_lay_chi_tiet);
        setDiemGiao(d.diem_giao_chi_tiet);
        setKhoangCach(d.so_km_api);

        const savedActuals = d.kich_thuoc_chot ? (typeof d.kich_thuoc_chot === 'string' ? JSON.parse(d.kich_thuoc_chot) : d.kich_thuoc_chot) : null;
        const itemActualsMap = {};
        (d.items || []).forEach(item => {
          const saved = Array.isArray(savedActuals) ? savedActuals.find(s => String(s.booking_item_id) === String(item.id)) : null;
          itemActualsMap[item.id] = {
            so_luong: saved?.so_luong ?? item.so_luong, // 🚀 FIX 1: Lấy số lượng từ Báo giá hoặc data đã chốt
            trong_luong_thuc_te: saved?.trong_luong_thuc_te ?? item.trong_luong_thuc_te,
            dai_cm: saved?.dai_cm ?? item.thuoc_tinh_chi_tiet?.dai_cm ?? null,
            rong_cm: saved?.rong_cm ?? item.thuoc_tinh_chi_tiet?.rong_cm ?? null,
            cao_cm: saved?.cao_cm ?? item.thuoc_tinh_chi_tiet?.cao_cm ?? null,
            nhiet_do_c: saved?.nhiet_do_c ?? item.thuoc_tinh_chi_tiet?.nhiet_do_c ?? null,
          };
        });

        setTimeout(() => {
          actualsForm.setFieldsValue({
            nguoi_gui_ten: d.nguoi_gui_ten_thuc_te, nguoi_gui_sdt: d.nguoi_gui_sdt_thuc_te,
            nguoi_nhan_ten: d.nguoi_nhan_ten_thuc_te, nguoi_nhan_sdt: d.nguoi_nhan_sdt_thuc_te,
            diem_lay_chi_tiet: d.diem_lay_chi_tiet, diem_giao_chi_tiet: d.diem_giao_chi_tiet,
            hinh_thuc_thanh_toan: d.hinh_thuc_thanh_toan || (d.loai_khach === 'B2C_VANG_LAI' ? 'TRA_TRUOC' : 'GHI_NO'), tien_cod_thu_ho: d.tien_cod_thu_ho,
            item_actuals: itemActualsMap
          });
        }, 0);
      }
    } catch {
      message.error('Không tải được thông tin');
      navigate('/van-don');
    } finally { setLoading(false); }
  };

  // 🚀 FIX 2: Load Đơn vị tính để biết cái nào cần đo kích thước
  useEffect(() => {
    danhMucService.getDonViTinhList().then(res => setDonViTinhs(res.data?.data || res.data || []));
    loadDetail();
  }, [id]);

  // 🚀 Hàm tìm kiếm địa chỉ Goong Autocomplete
  const handleSearchAddress = async (value, type) => {
    if (!value) return;
    try {
      const res = await axios.get(`https://rsapi.goong.io/Place/AutoComplete?api_key=${REST_KEY}&input=${encodeURIComponent(value)}`);
      if (res.data.predictions) {
        const opts = res.data.predictions.map(p => ({ value: p.description }));
        if (type === 'origin') setOptionsLay(opts);
        else setOptionsGiao(opts);
      }
    } catch (error) { console.error("Lỗi Goong Autocomplete", error); }
  };

  const handleUpdateStatus = async () => {
    try {
      // 🚀 FIX 3: Truyền dạng Object { trang_thai_van_chuyen: ... } thay vì chuỗi trơn
      await vanDonService.updateStatus(id, { trang_thai_van_chuyen: routeStatus });
      message.success('Cập nhật lộ trình thành công');
      loadDetail();
    } catch { message.error('Lỗi cập nhật trạng thái'); }
  };

  const handleUpdateActuals = async () => {
    try {
      const vals = await actualsForm.validateFields();
      setSavingActuals(true);
      const itemActuals = Object.entries(vals.item_actuals || {}).map(([itemId, v]) => ({ booking_item_id: Number(itemId), ...v }));
      const tongTrongLuong = itemActuals.reduce((s, i) => s + (Number(i.trong_luong_thuc_te) || 0), 0);

      // Gửi CẢ ĐỊA CHỈ & KHOẢNG CÁCH MỚI xuống Backend
      await vanDonService.chotSoLieu(id, {
        trongLuongChot: tongTrongLuong, kichThuocChot: itemActuals,
        nguoi_gui_ten: vals.nguoi_gui_ten, nguoi_gui_sdt: vals.nguoi_gui_sdt,
        nguoi_nhan_ten: vals.nguoi_nhan_ten, nguoi_nhan_sdt: vals.nguoi_nhan_sdt,
        diem_lay_chi_tiet: diemLay, diem_giao_chi_tiet: diemGiao, so_km_api: khoangCach, // 🚀 Thêm Data Mới
        hinh_thuc_thanh_toan: vals.hinh_thuc_thanh_toan, tien_cod_thu_ho: vals.tien_cod_thu_ho
      });
      message.success(`Đã cập nhật thông tin và chốt số liệu thành công!`);
      loadDetail();
    } catch { message.error('Vui lòng kiểm tra lại số liệu nhập'); }
    finally { setSavingActuals(false); }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;
  if (!data) return null;

  const isCancelled = data.trang_thai_van_chuyen === 'CANCELLED';
  const isPaid = data.trang_thai_thanh_toan !== 'UNPAID';
  const canUpdateActuals = !isCancelled && !isPaid;
  const daThu = (data.lich_su_thu || []).reduce((s, pt) => s + Number(pt.so_tien_phan_bo), 0);
  const conLai = Math.max(0, Number(data.so_tien_chot_cuoi) - daThu);

  return (
    <div style={{ padding: '0 12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space size={12} align="center">
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/van-don')} />
          <Title level={4} style={{ margin: 0 }}>Vận đơn: <span style={{ color: '#1890ff' }}>{data.ma_van_don}</span></Title>
          <StatusTag status={data.trang_thai_van_chuyen} />
          <Tag color={{ PAID: 'success', PARTIAL: 'warning', UNPAID: 'default' }[data.trang_thai_thanh_toan]}>{data.trang_thai_thanh_toan}</Tag>
        </Space>
        {!isCancelled && <Button danger icon={<CloseOutlined />} onClick={() => Modal.confirm({ title: 'Xác nhận Hủy', content: 'Hành động này không thể hoàn tác.', okType: 'danger', onOk: async () => { try { await vanDonService.huyVanDon(id); message.success('Đã hủy!'); loadDetail(); } catch { message.error('Lỗi hủy đơn'); } } })}>Hủy Đơn</Button>}
      </div>

      <Form form={actualsForm} layout="vertical">
        <Row gutter={16}>
          {/* ════════ CỘT TRÁI (INFO -> CÂN ĐO -> BẢN ĐỒ TO) ════════ */}
          <Col xs={24} lg={15}>
            <Card size="small" variant="borderless" style={{ marginBottom: 12, borderRadius: 8, border: '1px solid #e8e8e8' }} title={<Text strong>📍 Thông tin Liên hệ & Địa chỉ</Text>}>
              <Row gutter={24}>
                <Col span={12}>
                  <div style={{ padding: '10px', borderRadius: 6, borderLeft: '4px solid #1890ff', backgroundColor: '#f0f5ff' }}>
                    <Form.Item name="nguoi_gui_ten" label="Người Gửi" style={{ marginBottom: 8 }} rules={[{ required: true }]}><Input disabled={!canUpdateActuals} /></Form.Item>
                    <Form.Item name="nguoi_gui_sdt" label="SĐT Gửi" style={{ marginBottom: 8 }} rules={[{ required: true }]}><Input disabled={!canUpdateActuals} /></Form.Item>
                    <Form.Item label="Địa chỉ lấy hàng (Sửa/Tìm trên Goong)" style={{ marginBottom: 0 }}>
                      {/* 🚀 AUTOCOMPLETE ĐỊA CHỈ */}
                      <AutoComplete value={diemLay} options={optionsLay} onSearch={(v) => handleSearchAddress(v, 'origin')} onSelect={setDiemLay} onChange={setDiemLay} disabled={!canUpdateActuals}>
                        <Input.TextArea autoSize={{ minRows: 2, maxRows: 3 }} />
                      </AutoComplete>
                    </Form.Item>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ padding: '10px', borderRadius: 6, borderLeft: '4px solid #52c41a', backgroundColor: '#f6ffed' }}>
                    <Form.Item name="nguoi_nhan_ten" label="Người Nhận" style={{ marginBottom: 8 }} rules={[{ required: true }]}><Input disabled={!canUpdateActuals} /></Form.Item>
                    <Form.Item name="nguoi_nhan_sdt" label="SĐT Nhận" style={{ marginBottom: 8 }} rules={[{ required: true }]}><Input disabled={!canUpdateActuals} /></Form.Item>
                    <Form.Item label="Địa chỉ giao hàng (Sửa/Tìm trên Goong)" style={{ marginBottom: 0 }}>
                      <AutoComplete value={diemGiao} options={optionsGiao} onSearch={(v) => handleSearchAddress(v, 'destination')} onSelect={setDiemGiao} onChange={setDiemGiao} disabled={!canUpdateActuals}>
                        <Input.TextArea autoSize={{ minRows: 2, maxRows: 3 }} />
                      </AutoComplete>
                    </Form.Item>
                  </div>
                </Col>
              </Row>
            </Card>

            <Card size="small" variant="borderless" style={{ marginBottom: 12, borderRadius: 8, border: '1px solid #e8e8e8' }} title={<Text strong>⚖️ Cập nhật Số kg (Thủ Kho)</Text>}>
              {(!data.items || data.items.length === 0) ? <Alert message="Lỗi tải hàng hóa" type="error" /> : (
                (data.items || []).map((item, idx) => {
                  // 🚀 FIX 4: Xác định xem Đơn vị tính này có bắt buộc đo D/R/C không
                  const dvt = donViTinhs.find(d => Number(d.id) === Number(item.don_vi_tinh_id));
                  const isRequireDim = dvt?.yeu_cau_kich_thuoc === 1 || dvt?.yeu_cau_kich_thuoc === true;

                  return (
                    <div key={item.id} style={{ background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 6, padding: '12px', marginBottom: 10 }}>
                      <Text strong>{idx + 1}. {item.ten_hang} ({item.so_luong} {item.ten_dvt})</Text>

                      {/* KHỐI MÀU VÀNG: LOGIC SO SÁNH QUY ĐỔI */}
                      {/* KHỐI MÀU VÀNG: LOGIC SO SÁNH QUY ĐỔI */}
                      <Form.Item noStyle dependencies={[['item_actuals', item.id, 'so_luong'], ['item_actuals', item.id, 'trong_luong_thuc_te'], ['item_actuals', item.id, 'dai_cm'], ['item_actuals', item.id, 'rong_cm'], ['item_actuals', item.id, 'cao_cm']]}>
                        {({ getFieldValue }) => {
                          // 🚀 FIX 2: Bắt thêm biến qty (số lượng) từ Form
                          const qty = Number(getFieldValue(['item_actuals', item.id, 'so_luong'])) || 1;
                          const actualKg = Number(getFieldValue(['item_actuals', item.id, 'trong_luong_thuc_te'])) || 0;
                          const d = Number(getFieldValue(['item_actuals', item.id, 'dai_cm'])) || 0;
                          const r = Number(getFieldValue(['item_actuals', item.id, 'rong_cm'])) || 0;
                          const c = Number(getFieldValue(['item_actuals', item.id, 'cao_cm'])) || 0;

                          // Ẩn warning nếu Đơn vị tính không yêu cầu đo kích thước, hoặc nhập chưa đủ 3 chiều
                          if (!isRequireDim || !d || !r || !c) return null;

                          // 🚀 Nhân thể tích với số lượng mới
                          const volKg = (d * r * c) / 5000 * qty;
                          const cw = Math.max(actualKg, volKg);

                          return (
                            <div style={{ fontSize: 13, color: '#555', marginTop: 10, padding: '8px 12px', background: '#fffbe6', border: '1px dashed #ffe58f', borderRadius: 6 }}>
                              💡 <b>Lưu ý tính cước:</b> Thể tích quy đổi <b>{volKg.toFixed(1)} kg</b> vs Cân thực tế <b>{actualKg.toFixed(1)} kg</b> <br />
                              ➔ Hệ thống tự động chốt mức cao hơn: <Text type="danger" strong>{cw.toFixed(1)} kg</Text>
                            </div>
                          );
                        }}
                      </Form.Item>

                      {/* KHỐI NHẬP LIỆU LINH ĐỘNG */}
              
                    {/* KHỐI NHẬP LIỆU LINH ĐỘNG */}
                    <Row gutter={[8, 8]} align="bottom" style={{ marginTop: 10 }}>
                      
                      {/* Cân thực (Luôn luôn hiển thị) */}
                      <Col span={isRequireDim ? 4 : 8}>
                        <Form.Item name={['item_actuals', item.id, 'trong_luong_thuc_te']} label="Cân thực (kg)" style={{ marginBottom: 0 }} rules={[{ required: true }]}>
                          <InputNumber style={{ width: '100%' }} min={0.01} step={0.1} disabled={!canUpdateActuals} />
                        </Form.Item>
                      </Col>

                      {/* 🚀 FIX: Gom chung Số Lượng vào cùng nhóm với Dài/Rộng/Cao */}
                      {isRequireDim && (
                        <>
                          <Col span={4}>
                            <Form.Item name={['item_actuals', item.id, 'so_luong']} label="Số lượng" style={{ marginBottom: 0 }} rules={[{ required: true }]}>
                              <InputNumber style={{ width: '100%' }} min={1} disabled={!canUpdateActuals} />
                            </Form.Item>
                          </Col>
                          <Col span={4}>
                            <Form.Item name={['item_actuals', item.id, 'dai_cm']} label="Dài (cm)" style={{ marginBottom: 0 }}>
                              <InputNumber style={{ width: '100%' }} min={0} disabled={!canUpdateActuals} />
                            </Form.Item>
                          </Col>
                          <Col span={4}>
                            <Form.Item name={['item_actuals', item.id, 'rong_cm']} label="Rộng (cm)" style={{ marginBottom: 0 }}>
                              <InputNumber style={{ width: '100%' }} min={0} disabled={!canUpdateActuals} />
                            </Form.Item>
                          </Col>
                          <Col span={4}>
                            <Form.Item name={['item_actuals', item.id, 'cao_cm']} label="Cao (cm)" style={{ marginBottom: 0 }}>
                              <InputNumber style={{ width: '100%' }} min={0} disabled={!canUpdateActuals} />
                            </Form.Item>
                          </Col>
                        </>
                      )}

                      {/* Hiển thị Nhiệt độ dựa vào Loại hàng */}
                      {item.cau_hinh_thuoc_tinh?.includes('nhiet_do_c') && (
                        <Col span={isRequireDim ? 4 : 8}>
                          <Form.Item name={['item_actuals', item.id, 'nhiet_do_c']} label="Nhiệt độ (°C)" style={{ marginBottom: 0 }}>
                            <InputNumber style={{ width: '100%' }} disabled={!canUpdateActuals} />
                          </Form.Item>
                        </Col>
                      )}
                    </Row>
                    </div>
                  )
                })
              )}
            </Card>

            <Card size="small" variant="borderless" style={{ borderRadius: 8, border: '1px solid #e8e8e8' }} title={<Text strong>🗺️ Bản đồ Lộ trình (Kéo thả Maker để đổi địa chỉ)</Text>}>
              {/* 🚀 BẢN ĐỒ NẰM DƯỚI CÙNG VÀ CỰC KỲ RỘNG RÃI */}
              <div style={{ width: '100%', height: '550px', backgroundColor: '#fafafa', borderRadius: '8px', overflow: 'hidden' }}>
                <GoongMapRoute
                  originAddress={diemLay}
                  destinationAddress={diemGiao}
                  onAddressChange={(type, newAddr) => { type === 'origin' ? setDiemLay(newAddr) : setDiemGiao(newAddr) }}
                  onRouteCalculated={(newKm) => setKhoangCach(newKm)} // Nhận Km mới
                />
              </div>
            </Card>
          </Col>

          {/* ════════ CỘT PHẢI (TRẠNG THÁI & TÀI CHÍNH) ════════ */}
          <Col xs={24} lg={9}>
            <div style={{ position: 'sticky', top: 20 }}>

              <Card size="small" variant="borderless" style={{ marginBottom: 12, borderRadius: 8, border: '1px solid #e8e8e8' }} title={<Text strong>🚚 Trạng thái Xe</Text>}>
                <Row gutter={8}>
                  <Col span={16}>
                    <Select value={routeStatus} onChange={setRouteStatus} style={{ width: '100%' }} disabled={isCancelled}>
                      <Option value="CHO_LAY">📦 Chờ lấy hàng</Option><Option value="LUU_KHO_DI">🏭 Lưu kho đi</Option>
                      <Option value="DANG_CHAY">🚚 Đang chạy tuyến</Option><Option value="LUU_KHO_DEN">🏬 Lưu kho đến</Option>
                      <Option value="DANG_GIAO">🛵 Đang giao</Option><Option value="DA_GIAO">✅ Đã giao</Option>
                    </Select>
                  </Col>
                  <Col span={8}><Button type="primary" onClick={handleUpdateStatus} disabled={isCancelled} block>Cập Nhật</Button></Col>
                </Row>
              </Card>

              <Card size="small" variant="borderless" style={{ marginBottom: 12, borderRadius: 8, border: '1px solid #1890ff' }} title={<Text strong>💰 Tài chính</Text>}>
                <Row gutter={8}>
                  <Col span={12}>
                    <Form.Item name="hinh_thuc_thanh_toan" label="Thu tiền" style={{ marginBottom: 10 }}>
                      <Select disabled={!canUpdateActuals}>
                        <Option value="TRA_TRUOC">Trả Trước</Option><Option value="COD_THU_HO">Thu hộ (COD)</Option><Option value="GHI_NO">Công Nợ B2B</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item noStyle dependencies={['hinh_thuc_thanh_toan']}>
                      {({ getFieldValue }) => getFieldValue('hinh_thuc_thanh_toan') === 'COD_THU_HO' && (
                        <Form.Item name="tien_cod_thu_ho" label="Tiền COD" style={{ marginBottom: 10 }}><InputNumber style={{ width: '100%' }} disabled={!canUpdateActuals} /></Form.Item>
                      )}
                    </Form.Item>
                  </Col>
                </Row>

                <div style={{ background: '#fdfdfd', padding: '10px', borderRadius: 6, border: '1px solid #eee' }}>
                  <Row justify="space-between"><Text>Khoảng cách:</Text> <Text strong>{khoangCach} Km</Text></Row>
                  <Divider style={{ margin: '8px 0' }} />
                  <Row justify="space-between"><Text>Tổng cước:</Text> <CurrencyText value={data.so_tien_chot_cuoi} style={{ color: '#cf1322', fontWeight: 'bold' }} /></Row>
                  <Row justify="space-between"><Text>Đã thanh toán:</Text> <CurrencyText value={daThu} style={{ color: '#52c41a' }} /></Row>
                  <Divider style={{ margin: '8px 0' }} />
                  <Row justify="space-between"><Text strong>Còn nợ lại:</Text> <CurrencyText value={conLai} style={{ color: conLai > 0 ? '#fa8c16' : '#52c41a', fontWeight: 'bold', fontSize: 16 }} /></Row>
                </div>

                <div style={{ marginTop: 15 }}>
                  <Button block type="primary" size="large" icon={<SaveOutlined />} onClick={handleUpdateActuals} loading={savingActuals} disabled={!canUpdateActuals} style={{ marginBottom: 10 }}>Lưu Thay Đổi & Chốt Phí</Button>
                  <Row gutter={8}>
                    <Col span={12}><Button block icon={<PrinterOutlined />} onClick={() => vanDonService.exportPdf?.(id)} style={{ color: '#722ed1' }}>In PDF</Button></Col>
                    <Col span={12}><Button block icon={<MessageOutlined style={{ color: '#1890ff' }} />} onClick={() => window.open('https://chat.zalo.me', '_blank')}>Gửi Zalo</Button></Col>
                  </Row>
                  <Button block icon={<MailOutlined />} onClick={async () => { message.loading({ content: 'Đang gửi email...', key: 'email_vd' }); try { await vanDonService.sendEmail(id); message.success({ content: 'Đã gửi Email thành công!', key: 'email_vd' }); } catch { message.error({ content: 'Gửi Email thất bại', key: 'email_vd' }); } }} style={{ marginTop: 10 }}>Gửi Email Cho Khách</Button>
                </div>
              </Card>

              <Card size="small" variant="borderless" style={{ borderRadius: 8, border: '1px solid #e8e8e8' }} title={<Text strong>📋 Lịch sử Phiếu Thu</Text>}>
                <Table dataSource={data.lich_su_thu || []} rowKey={(_, i) => i} pagination={false} size="small" locale={{ emptyText: 'Chưa có giao dịch' }}
                  columns={[
                    { title: 'Ngày', width: 85, render: (_, r) => formatDate(r.ngay_thu) },
                    { title: 'Số tiền', align: 'right', render: (_, r) => <CurrencyText value={r.so_tien_phan_bo} style={{ color: '#52c41a', fontWeight: 500 }} /> },
                    { title: 'Mã CT', dataIndex: 'so_tham_chieu', width: 90 },
                  ]}
                />
              </Card>
            </div>
          </Col>
        </Row>
      </Form>
    </div>
  );
};

export default VanDonDetail;
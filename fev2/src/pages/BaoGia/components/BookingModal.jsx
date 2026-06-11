import React, { useState, useRef, useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Row, Col, Select, Button, Divider, Checkbox, Typography, message, Tag, Alert, Space } from 'antd';
import { CarOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { goongService } from '../../../services/goongService';
import CurrencyText from '../../../components/common/CurrencyText';

const { Option } = Select;
const { Text } = Typography;

const GoongAutocomplete = ({ value, onChange, onSelectLocation, placeholder }) => {
    const [options, setOptions] = useState([]);
    const debounceTimer = useRef(null);

    const handleSearch = (text) => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        if (!text) return setOptions([]);
        debounceTimer.current = setTimeout(async () => {
            try {
                const res = await goongService.searchPlaces(text);
                if (res?.predictions) {
                    setOptions(res.predictions.map(item => ({ value: item.description, label: item.description, place_id: item.place_id })));
                }
            } catch (_) { }
        }, 400);
    };

    const handleSelect = async (val, option) => {
        onChange(val);
        try {
            const res = await goongService.getPlaceDetail(option.place_id);
            if (res?.result?.geometry?.location) onSelectLocation(res.result.geometry.location);
        } catch (_) { }
    };

    return <Select showSearch value={value} placeholder={placeholder} filterOption={false} onSearch={handleSearch} onChange={handleSelect} options={options} allowClear style={{ width: '100%' }} />;
};

const BookingModal = ({ visible, onCancel, onSave, mode, masterData, editingData }) => {
    const [form] = Form.useForm();
    const [coords, setCoords] = useState({ origin: null, dest: null });
    const [loadingKm, setLoadingKm] = useState(false);
    const [localPhuPhis, setLocalPhuPhis] = useState([]);
    
    // Quản lý dữ liệu thay đổi realtime trên form
    const watchedValues = Form.useWatch((values) => values, form);
    const formValues = watchedValues || form.getFieldsValue(true) || {};

    const itemsWatcher = formValues.items || [];
    const kmWatcher = Number(formValues.soKmApi) || 0;
    const loaiXeWatcher = formValues.loaiXeId;

    const diemLayWatcher = formValues.diemLayChiTiet;
const diemGiaoWatcher = formValues.diemGiaoChiTiet;

    // 🚀 HÀM PHÂN GIẢI CỨU CÁNH CHO AI: Tự động đổi Chữ thành Tọa độ ngầm
    const autoResolveCoordsFromText = async (diemLayText, diemGiaoText) => {
        if (!diemLayText || !diemGiaoText) return;
        setLoadingKm(true);
        try {
            let originLoc = null;
            let destLoc = null;

            const resLay = await goongService.searchPlaces(diemLayText);
            if (resLay?.predictions?.[0]?.place_id) {
                const detailLay = await goongService.getPlaceDetail(resLay.predictions[0].place_id);
                originLoc = detailLay?.result?.geometry?.location;
            }

            const resGiao = await goongService.searchPlaces(diemGiaoText);
            if (resGiao?.predictions?.[0]?.place_id) {
                const detailGiao = await goongService.getPlaceDetail(resGiao.predictions[0].place_id);
                destLoc = detailGiao?.result?.geometry?.location;
            }

            if (originLoc && destLoc) {
    setCoords({ origin: originLoc, dest: destLoc });
}
        } catch (e) {
            console.error("Lỗi phân giải tọa độ AI:", e);
        } finally {
            setLoadingKm(false);
        }
    };

    // 👇 useEffect watcher - giờ khai báo SAU hàm nên dùng được
    useEffect(() => {
    const soKm = form.getFieldValue('soKmApi');
    if (!editingData && diemLayWatcher && diemGiaoWatcher && !soKm && !coords.origin && !coords.dest) {
        autoResolveCoordsFromText(diemLayWatcher, diemGiaoWatcher);
    }
}, [diemLayWatcher, diemGiaoWatcher]);

    useEffect(() => {
        if (visible) {
            if (editingData) {
                form.setFieldsValue(editingData);
                setLocalPhuPhis(editingData.phuPhis || editingData.phuPhiCoDinh || []);
                if (editingData.diemLayChiTiet && editingData.diemGiaoChiTiet && !editingData.soKmApi) {
    autoResolveCoordsFromText(editingData.diemLayChiTiet, editingData.diemGiaoChiTiet);
}
             } else {
                form.resetFields();
                setLocalPhuPhis([]);
                form.setFieldsValue({ items: [{ soLuong: 1 }] });
                setCoords({ origin: null, dest: null });
            }

            // 👇 THÊM: Sau khi form được set (cả 2 trường hợp), kiểm tra lại địa chỉ
            setTimeout(() => {
                const vals = form.getFieldsValue(true);
                if (vals.diemLayChiTiet && vals.diemGiaoChiTiet) {
                    autoResolveCoordsFromText(vals.diemLayChiTiet, vals.diemGiaoChiTiet);
                }
            }, 100);
        }
    }, [visible, editingData, mode, form]);

    // Lắng nghe sự thay đổi khi người dùng chọn thủ công bằng tay từ Dropdown
    useEffect(() => {
        const fetchDistance = async () => {
            if (coords.origin && coords.dest) {
                setLoadingKm(true);
                try {
                    const distRes = await goongService.getDistance(`${coords.origin.lat},${coords.origin.lng}`, `${coords.dest.lat},${coords.dest.lng}`);
                    if (distRes.rows?.[0]?.elements?.[0]?.status === 'OK') {
                        const km = distRes.rows[0].elements[0].distance.value / 1000;
                        form.setFieldValue('soKmApi', Number(km.toFixed(1)));
                        message.success(`Tra tự động khoảng cách: ${km.toFixed(1)} Km`);
                    }
                } catch (e) { message.error('Lỗi tự động tính khoảng cách Km'); }
                finally { setLoadingKm(false); }
            }
        };
        fetchDistance();
    }, [coords.origin, coords.dest, form]);

    const calculatePreview = () => {
        let cuocChinh = 0;
        let tongPhuPhi = 0;
        let totalCW = 0;

        itemsWatcher.forEach(item => {
            if (!item) return;
            let quyDoi = 0;
            if (item.thuocTinhChiTiet?.dai_cm) {
                quyDoi = (Number(item.thuocTinhChiTiet.dai_cm) * Number(item.thuocTinhChiTiet.rong_cm) * Number(item.thuocTinhChiTiet.cao_cm)) / 5000 * (Number(item.soLuong) || 1);
            }
            totalCW += Math.max(Number(item.trongLuongThucTe) || 0, quyDoi);
        });

        if (mode === 'LTL' && kmWatcher > 0 && totalCW > 0) {
            const bangGia = masterData.bangGiaLTLs?.find(p => Number(p.moc_tu_km) <= kmWatcher && Number(p.moc_den_km) >= kmWatcher);
            const donGiaGoc = bangGia?.don_gia_goc_kg || 0;
            const minCharge = bangGia?.cuoc_toi_thieu || 0; 
            
            const heSoChietKhau = masterData.chietKhauLTLs?.find(d => Number(d.moc_tu_kg) <= totalCW && Number(d.moc_den_kg) >= totalCW)?.he_so_chiet_khau || 1.0;
            
            itemsWatcher.forEach(item => {
                if(!item) return;
                const heSoGia = masterData.loaiHangs?.find(l => Number(l.id) === Number(item.loaiHangId))?.he_so_gia || 1.0;
                let quyDoi = item.thuocTinhChiTiet?.dai_cm ? (Number(item.thuocTinhChiTiet.dai_cm) * Number(item.thuocTinhChiTiet.rong_cm) * Number(item.thuocTinhChiTiet.cao_cm)) / 5000 * (Number(item.soLuong) || 1) : 0;
                const cw = Math.max(Number(item.trongLuongThucTe) || 0, quyDoi);
                cuocChinh += Number(donGiaGoc) * cw * Number(heSoGia) * Number(heSoChietKhau);
            });

            if (cuocChinh < Number(minCharge)) {
                cuocChinh = Number(minCharge);
            }
        } else if (mode === 'FTL' && kmWatcher > 0 && loaiXeWatcher) {
            const ftlRows = masterData.bangGiaFTLs?.filter(x => x.loai_xe_id === loaiXeWatcher) || [];
            ftlRows.sort((a, b) => Number(a.moc_tu_km) - Number(b.moc_tu_km));
            
            let kmToCalc = kmWatcher;
            for (const tier of ftlRows) {
                if (kmToCalc > Number(tier.moc_den_km)) {
                    cuocChinh += Number(tier.gia_mo_cua) + ((Number(tier.moc_den_km) - Number(tier.moc_tu_km)) * Number(tier.don_gia_km));
                } else {
                    const kmVuot = Math.max(0, kmToCalc - Number(tier.moc_tu_km));
                    cuocChinh += Number(tier.gia_mo_cua) + (kmVuot * Number(tier.don_gia_km));
                    break;
                }
            }
        }

        localPhuPhis.forEach(ppItem => {
            const ppConfig = masterData.phuPhis?.find(p => p.id === ppItem.phuPhiId);
            const matrixItem = masterData.bangGiaPhuPhis?.find(m => m.phu_phi_id === ppItem.phuPhiId && (m.loai_xe_id === ppItem.loaiXeId || !m.loai_xe_id));
            if (ppConfig && matrixItem) {
                const tienPP = ppConfig.cach_tinh === 'THEO_KG' ? Number(matrixItem.don_gia) * totalCW : Number(matrixItem.don_gia);
                tongPhuPhi += tienPP;
            }
        });

        return { cuocChinh, tongPhuPhi, total: cuocChinh + tongPhuPhi, totalCW };
    };

    const preview = calculatePreview();

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            if (!values.soKmApi) return message.error('Vui lòng chờ định vị tính số Km!');

            const processedItems = (values.items || []).map(item => {
                let khoiLuongQuyDoi = item.thuocTinhChiTiet?.dai_cm ? (Number(item.thuocTinhChiTiet.dai_cm) * Number(item.thuocTinhChiTiet.rong_cm) * Number(item.thuocTinhChiTiet.cao_cm)) / 5000 * (Number(item.soLuong) || 1) : 0;
                const kgThucTe = Number(item.trongLuongThucTe) || 0;
                return { ...item, trongLuongThucTe: kgThucTe, chargeableWeight: Math.max(kgThucTe, khoiLuongQuyDoi) };
            });

            onSave({
                ...values,
                hinhThuc: mode,
                soKmApi: Number(values.soKmApi),
                items: processedItems,
                phuPhis: localPhuPhis,
                tongCuocChinh: preview.cuocChinh,
                tongPhuPhi: preview.tongPhuPhi
            });
            form.resetFields();
            setLocalPhuPhis([]);
        } catch (error) { console.log('Validate lỗi form:', error); }
    };

    return (
        <Modal width={950} title={mode === 'LTL' ? "📦 CHI TIẾT HÀNG GHÉP (LTL)" : "🚚 CHI TIẾT BAO XE (FTL)"} open={visible} onCancel={onCancel} onOk={handleSave} okText="Lưu Chuyến Đưa Vào Báo Giá" destroyOnClose>
            <Form form={form} layout="vertical">
                <Row gutter={16}>
                    <Col span={8}><Form.Item name="nguoiGuiTen" label="Người gửi (Tùy chọn)"><Input placeholder="Tên / Công ty" /></Form.Item></Col>
                    <Col span={4}><Form.Item name="nguoiGuiSdt" label="SĐT"><Input /></Form.Item></Col>
                    <Col span={12}><Form.Item name="diemLayChiTiet" label="Địa chỉ Lấy hàng" rules={[{ required: true }]}><GoongAutocomplete placeholder="Nhập địa chỉ lấy..." onSelectLocation={(loc) => setCoords(prev => ({ ...prev, origin: loc }))} /></Form.Item></Col>
                </Row>
                <Row gutter={16}>
                    <Col span={8}><Form.Item name="nguoiNhanTen" label="Người nhận (Tùy chọn)"><Input placeholder="Tên / Công ty" /></Form.Item></Col>
                    <Col span={4}><Form.Item name="nguoiNhanSdt" label="SĐT"><Input /></Form.Item></Col>
                    <Col span={12}><Form.Item name="diemGiaoChiTiet" label="Địa chỉ Giao hàng" rules={[{ required: true }]}><GoongAutocomplete placeholder="Nhập địa chỉ giao..." onSelectLocation={(loc) => setCoords(prev => ({ ...prev, dest: loc }))} /></Form.Item></Col>
                </Row>
                <Row gutter={16}>
                    <Col span={6}><Form.Item name="soKmApi" label="Khoảng cách (Km)" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} disabled={loadingKm} addonAfter={loadingKm ? "..." : "Km"} /></Form.Item></Col>
                    {mode === 'FTL' && (
                        <Col span={8}><Form.Item name="loaiXeId" label="Loại Xe Bao" rules={[{ required: true }]}><Select showSearch filterOption={(input, option) => (option?.children ?? '').toString().toLowerCase().includes(input.toLowerCase())}>{masterData.loaiXes?.map(x => <Option key={x.id} value={x.id}>{x.ten_hien_thi}</Option>)}</Select></Form.Item></Col>
                    )}
                </Row>

                <Divider style={{ margin: '10px 0' }} />
                <Text strong style={{ fontSize: 16 }}>Chi tiết hàng hóa</Text>
                <Form.List name="items">
                    {(fields, { add, remove }) => (
                        <>
                            {fields.map(({ key, name, ...restField }) => {
                                const currentItem = itemsWatcher[name] || {};
                                const lhSelected = masterData.loaiHangs?.find(l => l.id === currentItem.loaiHangId);
                                let attrConfig = [];
                                try { attrConfig = typeof lhSelected?.cau_hinh_thuoc_tinh === 'string' ? JSON.parse(lhSelected.cau_hinh_thuoc_tinh) : (lhSelected?.cau_hinh_thuoc_tinh || []); } catch (e) { }

                                let quyDoi = 0;
                                if (attrConfig.includes('dai_cm')) {
                                    const d = currentItem.thuocTinhChiTiet?.dai_cm || 0;
                                    const r = currentItem.thuocTinhChiTiet?.rong_cm || 0;
                                    const c = currentItem.thuocTinhChiTiet?.cao_cm || 0;
                                    quyDoi = (Number(d) * Number(r) * Number(c)) / 5000 * (Number(currentItem.soLuong) || 1);
                                }
                                const thucTe = Number(currentItem.trongLuongThucTe) || 0;
                                const cw = Math.max(thucTe, quyDoi);

                                return (
                                    <div key={key} style={{ background: '#f8f9fa', padding: 12, marginBottom: 10, borderRadius: 6, position: 'relative' }}>
                                        <Row gutter={12}>
                                            <Col span={6}><Form.Item {...restField} name={[name, 'tenHang']} label="Tên hàng" rules={[{ required: true }]}><Input /></Form.Item></Col>
                                            <Col span={4}><Form.Item {...restField} name={[name, 'loaiHangId']} label="Loại hàng" rules={[{ required: true }]}><Select showSearch>{masterData.loaiHangs?.map(l => <Option key={l.id} value={l.id}>{l.ten_loai}</Option>)}</Select></Form.Item></Col>
                                            <Col span={3}><Form.Item {...restField} name={[name, 'soLuong']} label="SL"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item></Col>
                                            <Col span={3}><Form.Item {...restField} name={[name, 'donViTinhId']} label="Đơn vị"><Select showSearch allowClear>{masterData.donViTinhs?.map(d => <Option key={d.id} value={d.id}>{d.ten_dvt}</Option>)}</Select></Form.Item></Col>
                                            <Col span={4}><Form.Item {...restField} name={[name, 'trongLuongThucTe']} label="Tổng TL (Kg)" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
                                            <Col span={4}><Form.Item {...restField} name={[name, 'giaTriKhaiBao']} label="Giá trị (VNĐ)"><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
                                            {fields.length > 1 && <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(name)} style={{ position: 'absolute', top: 5, right: 5 }} />}
                                        </Row>
                                        {attrConfig.length > 0 && (
                                            <Row gutter={12}>
                                                {attrConfig.includes('dai_cm') && (
                                                    <>
                                                        <Col span={4}><Form.Item {...restField} name={[name, 'thuocTinhChiTiet', 'dai_cm']} label="Dài (cm)"><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
                                                        <Col span={4}><Form.Item {...restField} name={[name, 'thuocTinhChiTiet', 'rong_cm']} label="Rộng (cm)"><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
                                                        <Col span={4}><Form.Item {...restField} name={[name, 'thuocTinhChiTiet', 'cao_cm']} label="Cao (cm)"><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
                                                    </>
                                                )}
                                                {attrConfig.includes('nhiet_do_c') && <Col span={4}><Form.Item {...restField} name={[name, 'thuocTinhChiTiet', 'nhiet_do_c']} label="Nhiệt độ °C"><InputNumber style={{ width: '100%' }} /></Form.Item></Col>}
                                                <Col span={8} style={{ display: 'flex', alignItems: 'center', paddingTop: 10 }}>{cw > 0 && <Tag color={quyDoi > thucTe ? "error" : "success"}>Trọng lượng quy đổi: <b>{cw.toFixed(1)} kg</b></Tag>}</Col>
                                            </Row>
                                        )}
                                    </div>
                                );
                            })}
                            <Button type="dashed" onClick={() => add({ soLuong: 1 })} block icon={<PlusOutlined />}>Thêm Hàng Hóa Mới</Button>
                        </>
                    )}
                </Form.List>

                <Divider style={{ margin: '15px 0' }} />

                <Text strong style={{ fontSize: 16 }}>Dịch vụ Phụ phí & Trung chuyển</Text>
                <Row gutter={[12, 12]} style={{ marginTop: 10 }}>
                    {masterData.phuPhis?.map((pp) => {
                        const currentPp = localPhuPhis.find(x => x.phuPhiId === pp.id || x.phu_phi_id === pp.id);
                        const isChecked = !!currentPp;
                        let ppPrice = 0;
                        if (isChecked) {
                            const refXeId = currentPp.loaiXeId || currentPp.loai_xe_id || null;
                            const m = masterData.bangGiaPhuPhis?.find(x => x.phu_phi_id === pp.id && (x.loai_xe_id === refXeId || !x.loai_xe_id));
                            if (m) ppPrice = pp.cach_tinh === 'THEO_KG' ? Number(m.don_gia) * preview.totalCW : Number(m.don_gia);
                        }

                        return (
                            <Col xs={24} md={8} key={pp.id}>
                                <div style={{ border: `1px solid ${isChecked ? '#91d5ff' : '#f0f0f0'}`, padding: 10, borderRadius: 6, background: isChecked ? '#e6f7ff' : '#fff' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Checkbox checked={isChecked} onChange={e => {
                                            if (e.target.checked) setLocalPhuPhis([...localPhuPhis, { phuPhiId: pp.id, loaiXeId: null }]);
                                            else setLocalPhuPhis(localPhuPhis.filter(x => x.phuPhiId !== pp.id && x.phu_phi_id !== pp.id));
                                        }}><Text strong={isChecked}>{pp.ten_phu_phi}</Text></Checkbox>
                                        {isChecked && ppPrice > 0 && <Text type="danger" strong>+{ppPrice.toLocaleString('vi-VN')}đ</Text>}
                                        {isChecked && ppPrice === 0 && <Text type="secondary" style={{ fontSize: 12 }}>Chưa có cấu hình giá</Text>}
                                    </div>
                                    {isChecked && pp.cach_tinh === 'THEO_LOAI_XE' && (
                                        <Select size="small" placeholder="Chọn dòng xe phù hợp..." style={{ width: '100%', marginTop: 8 }} value={currentPp.loaiXeId || currentPp.loai_xe_id || null} onChange={val => setLocalPhuPhis(localPhuPhis.map(x => (x.phuPhiId === pp.id || x.phu_phi_id === pp.id) ? { ...x, phuPhiId: pp.id, loaiXeId: val } : x))}>
                                            {masterData.loaiXes?.map(x => <Option key={x.id} value={x.id}><CarOutlined /> {x.ten_hien_thi}</Option>)}
                                        </Select>
                                    )}
                                </div>
                            </Col>
                        );
                    })}
                </Row>

                <Alert
                    style={{ marginTop: 20 }}
                    type={preview.total > 0 ? "info" : "warning"}
                    message={
                        <Space wrap>
                            <Text strong>Tạm tính chi phí tuyến này:</Text>
                            <CurrencyText value={preview.cuocChinh} /> (Cước chính) +
                            <CurrencyText value={preview.tongPhuPhi} /> (Phụ phí chi tiết) =
                            <Text type="danger" strong style={{ fontSize: 18 }}><CurrencyText value={preview.total} /></Text>
                            {preview.total === 0 && <Text type="secondary" style={{ fontSize: 12 }}>(Hệ thống đang tự động định vị địa chỉ AI và tính toán đơn giá...)</Text>}
                        </Space>
                    }
                />
            </Form>
        </Modal>
    );
};
export default BookingModal;
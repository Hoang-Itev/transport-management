import React, { useState, useEffect } from 'react';
import { Card, Form, Select, DatePicker, Button, Row, Col, Typography, Table, Space, message, Tag, InputNumber, Modal, Input, Alert } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, PlusOutlined, SendOutlined, PrinterOutlined, RobotOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { goongService } from '../../services/goongService';

import BookingModal from './components/BookingModal';
import { baoGiaService } from '../../services/baoGiaService';
import { khachHangService } from '../../services/khachHangService';
import { danhMucService } from '../../services/danhMucService';
import CurrencyText from '../../components/common/CurrencyText';

const { Title, Text } = Typography;

const tinhCuocBooking = (bk, masterData) => {
    const items = bk.items || [];
    const km = Number(bk.soKmApi) || 0;
    const mode = bk.hinhThuc;
    const phuPhis = bk.phuPhis || [];

    let totalCW = 0;
    items.forEach(item => {
        let quyDoi = 0;
        // 🚀 FIX: Tính thể tích trực tiếp nếu có dữ liệu D/R/C
        if (item.thuocTinhChiTiet?.dai_cm && item.thuocTinhChiTiet?.rong_cm && item.thuocTinhChiTiet?.cao_cm) {
            quyDoi = (Number(item.thuocTinhChiTiet.dai_cm) * Number(item.thuocTinhChiTiet.rong_cm) * Number(item.thuocTinhChiTiet.cao_cm)) / 5000 * (Number(item.soLuong) || 1);
        }
        totalCW += Math.max(Number(item.trongLuongThucTe) || 0, quyDoi);
    });

    let cuocChinh = 0;
    if (mode === 'LTL' && km > 0 && totalCW > 0) {
        const bangGia = masterData.bangGiaLTLs?.find(p => Number(p.moc_tu_km) <= km && Number(p.moc_den_km) >= km);
        const donGiaGoc = bangGia?.don_gia_goc_kg || 0;
        const minCharge = bangGia?.cuoc_toi_thieu || 0;
        const heSoChietKhau = masterData.chietKhauLTLs?.find(d => Number(d.moc_tu_kg) <= totalCW && Number(d.moc_den_kg) >= totalCW)?.he_so_chiet_khau || 1.0;
        
        items.forEach(item => {
            if (!item) return;
            const heSoGia = masterData.loaiHangs?.find(l => Number(l.id) === Number(item.loaiHangId))?.he_so_gia || 1.0;
            // 🚀 FIX: Cập nhật lại cách tính quy đổi
            let quyDoi = (item.thuocTinhChiTiet?.dai_cm && item.thuocTinhChiTiet?.rong_cm && item.thuocTinhChiTiet?.cao_cm) 
                        ? (Number(item.thuocTinhChiTiet.dai_cm) * Number(item.thuocTinhChiTiet.rong_cm) * Number(item.thuocTinhChiTiet.cao_cm)) / 5000 * (Number(item.soLuong) || 1) 
                        : 0;
            const cw = Math.max(Number(item.trongLuongThucTe) || 0, quyDoi);
            cuocChinh += Number(donGiaGoc) * cw * Number(heSoGia) * Number(heSoChietKhau);
        });
        if (cuocChinh < Number(minCharge)) cuocChinh = Number(minCharge);
    } else if (mode === 'FTL' && km > 0 && bk.loaiXeId) {
        const ftlRows = masterData.bangGiaFTLs?.filter(x => x.loai_xe_id === bk.loaiXeId) || [];
        ftlRows.sort((a, b) => Number(a.moc_tu_km) - Number(b.moc_tu_km));
        let kmToCalc = km;
        for (const tier of ftlRows) {
            if (kmToCalc > Number(tier.moc_den_km)) {
                cuocChinh += Number(tier.gia_mo_cua) + ((Number(tier.moc_den_km) - Number(tier.moc_tu_km)) * Number(tier.don_gia_km));
            } else {
                cuocChinh += Number(tier.gia_mo_cua) + (Math.max(0, kmToCalc - Number(tier.moc_tu_km)) * Number(tier.don_gia_km));
                break;
            }
        }
    }

    let tongPhuPhi = 0;
    phuPhis.forEach(ppItem => {
        const ppConfig = masterData.phuPhis?.find(p => p.id === ppItem.phuPhiId);
        const matrixItem = masterData.bangGiaPhuPhis?.find(m => m.phu_phi_id === ppItem.phuPhiId && (m.loai_xe_id === ppItem.loaiXeId || !m.loai_xe_id));
        if (ppConfig && matrixItem) {
            tongPhuPhi += ppConfig.cach_tinh === 'THEO_KG' ? Number(matrixItem.don_gia) * totalCW : Number(matrixItem.don_gia);
        }
    });

    return { tongCuocChinh: cuocChinh, tongPhuPhi };
};

const BaoGiaDetail = () => {
    const [form] = Form.useForm();
    const navigate = useNavigate();
    const { id } = useParams();
    const isEdit = !!id;

    const [loading, setLoading] = useState(false);
    const [baoGiaData, setBaoGiaData] = useState(null);
    const [bookings, setBookings] = useState([]);

    const [masterData, setMasterData] = useState({ khachHangs: [], loaiHangs: [], loaiXes: [], phuPhis: [], donViTinhs: [], bangGiaLTLs: [], chietKhauLTLs: [], bangGiaFTLs: [], bangGiaPhuPhis: [] });

    const [modalVisible, setModalVisible] = useState(false);
    const [modalMode, setModalMode] = useState('LTL');
    const [editingBookingIndex, setEditingBookingIndex] = useState(null);

    const [aiVisible, setAiVisible] = useState(false);
    const [aiText, setAiText] = useState('');
    const [aiLoading, setAiLoading] = useState(false);

    // 🚀 LẮNG NGHE SỰ THAY ĐỔI CỦA Ô KHÁCH HÀNG & THUẾ ĐỂ TÍNH TOÁN
    const selectedKhachHangId = Form.useWatch('khachHangId', form);
    const vatRate = Form.useWatch('thueVatPt', form) || 8;

    // 🚀 CÁC BIẾN LIÊN QUAN ĐẾN TÀI CHÍNH & KIỂM SOÁT CÔNG NỢ
    const sumTienHang = bookings.reduce((acc, bk) => acc + Number(bk.tongCuocChinh || 0) + Number(bk.tongPhuPhi || 0), 0);
    const sumTienVat = sumTienHang * (vatRate / 100);
    const totalEstimation = sumTienHang + sumTienVat;

    const selectedKhachHang = masterData.khachHangs?.find(kh => kh.id === selectedKhachHangId);
    const isB2B = selectedKhachHang?.loai_khach === 'B2B_DOANH_NGHIEP';
    const currentDebt = Number(selectedKhachHang?.tong_no_hien_tai) || 0;
    const debtLimit = Number(selectedKhachHang?.han_muc_no_toi_da) || 0;
    
    // Vượt công nợ khi: Nợ Cũ + Giá Trị Báo Giá Này > Hạn Mức
    const isVuotHanMuc = isB2B && debtLimit > 0 && ((currentDebt + totalEstimation) > debtLimit);

    useEffect(() => {
        const loadMasterData = async () => {
            try {
                const [kh, lh, lx, pp, dvt, bgLTL, ckLTL, bgFTL, bgPP] = await Promise.all([
                    khachHangService.getList({ limit: 1000, isActive: true }),
                    danhMucService.getLoaiHangList({ limit: 100 }),
                    danhMucService.getLoaiXeList(),
                    danhMucService.getPhuPhiList(),
                    danhMucService.getDonViTinhList(),
                    danhMucService.getBangGiaLTL({}),
                    danhMucService.getChietKhauLTL({}),
                    danhMucService.getBangGiaFTL({}),
                    danhMucService.getBangGiaPhuPhi({})
                ]);

                const extractData = (res) => res?.data?.data || res?.data || [];
                setMasterData({
                    khachHangs: extractData(kh), loaiHangs: extractData(lh), loaiXes: extractData(lx),
                    phuPhis: extractData(pp), donViTinhs: extractData(dvt), bangGiaLTLs: extractData(bgLTL),
                    chietKhauLTLs: extractData(ckLTL), bangGiaFTLs: extractData(bgFTL), bangGiaPhuPhis: extractData(bgPP)
                });
            } catch (_) { message.error('Lỗi tải DB danh mục'); }
        };
        loadMasterData();
        if (isEdit) loadDetail();
    }, [id]);

    const loadDetail = async () => {
        try {
            const res = await baoGiaService.getById(id);
            if (res.success && res.data) {
                setBaoGiaData(res.data);
                form.setFieldsValue({
                    khachHangId: res.data.khach_hang_id,
                    ngayHetHan: dayjs(res.data.ngay_het_han),
                    thueVatPt: res.data.thue_vat_pt
                });

                const mappedBookings = res.data.bookings.map((bk, index) => ({
                    ...bk,
                    clientKey: bk.id || `old-bk-${index}-${Date.now()}`,
                    hinhThuc: bk.hinh_thuc,
                    loaiXeId: bk.loai_xe_id,
                    soKmApi: Number(bk.so_km_api),
                    diemLayChiTiet: bk.diem_lay_chi_tiet,
                    diemGiaoChiTiet: bk.diem_giao_chi_tiet,
                    nguoiGuiTen: bk.nguoi_gui_ten,
                    nguoiGuiSdt: bk.nguoi_gui_sdt,
                    nguoiNhanTen: bk.nguoi_nhan_ten,
                    nguoiNhanSdt: bk.nguoi_nhan_sdt,
                    tongCuocChinh: Number(bk.tong_cuoc_chinh),
                    phuPhis: bk.phuPhis || bk.phuPhiCoDinh || [],
                    items: (bk.items || []).map(i => ({
                        ...i,
                        tenHang: i.ten_hang,
                        soLuong: Number(i.so_luong),
                        thuocTinhChiTiet: typeof i.thuoc_tinh_chi_tiet === 'string' ? JSON.parse(i.thuoc_tinh_chi_tiet) : i.thuoc_tinh_chi_tiet,
                        loaiHangId: Number(i.loai_hang_id),
                        donViTinhId: i.don_vi_tinh_id ? Number(i.don_vi_tinh_id) : null,
                        trongLuongThucTe: Number(i.trong_luong_thuc_te),
                        chargeableWeight: Number(i.chargeable_weight),
                        giaTriKhaiBao: i.gia_tri_khai_bao ? Number(i.gia_tri_khai_bao) : null
                    }))
                }));
                setBookings(mappedBookings);
            }
        } catch (_) {
            message.error('Không thể tìm thấy thông tin báo giá chi tiết');
            navigate('/bao-gia');
        }
    };

    const isEditable = !isEdit || ['DRAFT', 'SENT'].includes(baoGiaData?.trang_thai);

    const handleSaveBooking = (bookingValues) => {
        const newBookings = [...bookings];
        if (editingBookingIndex !== null) {
            newBookings[editingBookingIndex] = {
                ...bookingValues,
                clientKey: bookings[editingBookingIndex].clientKey
            };
        } else {
            newBookings.push({
                ...bookingValues,
                clientKey: `new-bk-${Date.now()}-${Math.floor(Math.random() * 1000)}`
            });
        }
        setBookings(newBookings);
        setModalVisible(false);
        setEditingBookingIndex(null);
    };

    const handleAnalyzeAI = async () => {
        if (!aiText.trim()) return message.warning('Dán text vào đi Sales!');
        setAiLoading(true);
        try {
            const res = await baoGiaService.aiPhanTichZalo(aiText);
            if (res.success && res.data) {
                const aiBookings = await Promise.all(
                    (res.data.bookings || []).map(async (bk, i) => {
                        let soKmApi = bk.soKmApi || 0;
                        try {
                            if (!soKmApi && bk.diemLayChiTiet && bk.diemGiaoChiTiet) {
                                const [resLay, resGiao] = await Promise.all([
                                    goongService.searchPlaces(bk.diemLayChiTiet),
                                    goongService.searchPlaces(bk.diemGiaoChiTiet)
                                ]);
                                const placeIdLay = resLay?.predictions?.[0]?.place_id;
                                const placeIdGiao = resGiao?.predictions?.[0]?.place_id;
                                if (placeIdLay && placeIdGiao) {
                                    const [detailLay, detailGiao] = await Promise.all([
                                        goongService.getPlaceDetail(placeIdLay),
                                        goongService.getPlaceDetail(placeIdGiao)
                                    ]);
                                    const origin = detailLay?.result?.geometry?.location;
                                    const dest = detailGiao?.result?.geometry?.location;
                                    if (origin && dest) {
                                        const distRes = await goongService.getDistance(`${origin.lat},${origin.lng}`, `${dest.lat},${dest.lng}`);
                                        if (distRes.rows?.[0]?.elements?.[0]?.status === 'OK') {
                                            soKmApi = Number((distRes.rows[0].elements[0].distance.value / 1000).toFixed(1));
                                        }
                                    }
                                }
                            }
                        } catch (e) { console.error('Lỗi resolve km cho booking AI:', e); }
                        const { tongCuocChinh, tongPhuPhi } = tinhCuocBooking({ ...bk, soKmApi }, masterData);
                        return { ...bk, clientKey: `ai-bk-${Date.now()}-${i}`, phuPhis: bk.phuPhis || [], soKmApi, tongCuocChinh, tongPhuPhi };
                    })
                );
                setBookings(prev => [...prev, ...aiBookings]);
                setAiVisible(false);
                setAiText('');
                message.success(`AI đã lên đơn xong! Đã tính km cho ${aiBookings.length} chuyến.`);
            }
        } catch (e) { message.error('AI bó tay với đoạn này.'); }
        finally { setAiLoading(false); }
    };

    const onFinish = async (values) => {
        if (bookings.length === 0) return message.warning('Chưa có chuyến xe nào!');
        
        // 🚀 BỨC TƯỜNG THÉP CHẶN LẠI TRƯỚC KHI LƯU
        if (isVuotHanMuc) {
            return message.error(`Không thể lưu! Báo giá này sẽ làm khách hàng vượt hạn mức công nợ cho phép. Vui lòng yêu cầu thanh toán trước!`);
        }

        setLoading(true);
        try {
            const payload = {
                ...values,
                ngayHetHan: values.ngayHetHan.format('YYYY-MM-DD'),
                bookings
            };
            if (!isEdit) {
                const res = await baoGiaService.create(payload);
                message.success('Tạo mới báo giá thành công!');
                navigate(`/bao-gia/${res.data?.id || res.data?.data?.id || res.data}`);
            } else {
                await baoGiaService.update(id, payload);
                message.success('Cập nhật dữ liệu thành công!');
                loadDetail();
            }
        } catch (err) { message.error('Lỗi lưu báo giá, vui lòng thử lại.'); }
        finally { setLoading(false); }
    };

    const getStatusTag = (status) => {
        const statusMap = {
            DRAFT: { color: 'default', text: 'NHÁP' },
            SENT: { color: 'blue', text: 'ĐÃ GỬI KHÁCH' },
            ACCEPTED: { color: 'success', text: 'ĐÃ CHỐT' },
            REJECTED: { color: 'error', text: 'TỪ CHỐI / HỦY' }
        };
        return <Tag color={statusMap[status]?.color}>{statusMap[status]?.text}</Tag>;
    };

    const columns = [
        { title: 'Tuyến đường', render: (_, r) => <Text strong>{r.diemLayChiTiet} ➔ {r.diemGiaoChiTiet}</Text> },
        { title: 'Hình thức', render: (_, r) => <Tag color={r.hinhThuc === 'LTL' ? 'blue' : 'purple'}>{r.hinhThuc}</Tag> },
        { title: 'Km', render: (_, r) => `${r.soKmApi} Km` },
        {
            title: 'Chi phí chi tiết',
            render: (_, r) => (
                <div style={{ fontSize: 12 }}>
                    <div>Cước: <CurrencyText value={r.tongCuocChinh || 0} /></div>
                    {Number(r.tongPhuPhi) > 0 && <div style={{ color: '#d09a00' }}>Phụ phí: <CurrencyText value={r.tongPhuPhi} /></div>}
                </div>
            )
        },
        {
            title: 'Tổng Giá',
            align: 'right',
            render: (_, r) => <CurrencyText value={Number(r.tongCuocChinh || 0) + Number(r.tongPhuPhi || 0)} style={{ color: '#cf1322', fontWeight: 'bold' }} />
        },
        {
            title: 'Thao tác', align: 'center', render: (_, r, index) => (
                <Space>
                    <Button type="link" disabled={!isEditable} onClick={() => { setEditingBookingIndex(index); setModalMode(r.hinhThuc); setModalVisible(true); }}>Sửa</Button>
                    <Button type="link" danger disabled={!isEditable} onClick={() => { const n = [...bookings]; n.splice(index, 1); setBookings(n); }}>Xóa</Button>
                </Space>
            )
        }
    ];

    return (
        <div style={{ padding: '0 12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <Title level={4} style={{ margin: 0 }}>
                    <ArrowLeftOutlined onClick={() => navigate('/bao-gia')} style={{ cursor: 'pointer', marginRight: 12, color: '#1890ff' }} />
                    {isEdit ? `Chi Tiết Báo Giá: ${id}` : 'Khởi Tạo Báo Giá'}
                </Title>
                {!isEdit && <Button type="primary" style={{ background: '#722ed1' }} icon={<RobotOutlined />} onClick={() => setAiVisible(true)}>Phân Tích AI</Button>}
            </div>

            <Form form={form} disabled={!isEditable} layout="vertical" onFinish={onFinish} initialValues={{ thueVatPt: 8, ngayHetHan: dayjs().add(7, 'day') }}>
                <Row gutter={24} style={{ alignItems: 'flex-start' }}>
                    <Col xs={24} lg={17}>
                        <Card variant="borderless" size="small" style={{ marginBottom: 16, borderRadius: 8 }}>
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item label="Khách hàng" name="khachHangId" rules={[{ required: true }]} style={{ marginBottom: isB2B ? 8 : 24 }}>
                                        <Select showSearch filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())} options={masterData.khachHangs.map(kh => ({ value: kh.id, label: kh.ten_cong_ty }))} />
                                    </Form.Item>
                                    
                                    {/* 🚀 KHỐI CẢNH BÁO TỰ ĐỘNG BẬT/TẮT NẾU LÀ KHÁCH B2B */}
                                    {isB2B && (
                                        <div style={{ marginBottom: 16, padding: '8px 12px', borderRadius: 6, backgroundColor: isVuotHanMuc ? '#fff2f0' : '#f6ffed', border: `1px solid ${isVuotHanMuc ? '#ffccc7' : '#b7eb8f'}` }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                                                <Text type="secondary">Nợ hiện tại:</Text> <Text strong type={isVuotHanMuc ? 'danger' : ''}><CurrencyText value={currentDebt} /></Text>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                                <Text type="secondary">Hạn mức tối đa:</Text> <Text strong><CurrencyText value={debtLimit} /></Text>
                                            </div>
                                            {isVuotHanMuc && (
                                                <div style={{ color: '#cf1322', marginTop: 8, fontSize: 13, fontWeight: 500, backgroundColor: '#fff', padding: '6px 8px', borderRadius: 4, border: '1px dashed #cf1322' }}>
                                                    ⚠️ Chú ý: Báo giá này có giá trị <b><CurrencyText value={totalEstimation}/></b>. Nếu chốt sẽ làm vượt hạn mức nợ <b><CurrencyText value={(currentDebt + totalEstimation) - debtLimit}/></b>. Hệ thống đang khóa nút Lưu!
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </Col>
                                <Col span={8}><Form.Item label="Hiệu lực đến" name="ngayHetHan"><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item></Col>
                                <Col span={4}><Form.Item label="VAT (%)" name="thueVatPt"><InputNumber min={0} max={100} style={{ width: '100%' }} /></Form.Item></Col>
                            </Row>
                        </Card>

                        <Card variant="borderless" title="Danh sách chuyến (Báo giá Breakdown)" size="small" style={{ borderRadius: 8 }}>
                            {!isEditable && (
                                <Alert message="Báo giá này đã hoàn thành chốt đơn hoặc bị hủy, hệ thống đã khóa chỉnh sửa." type="warning" showIcon style={{ marginBottom: 16 }} />
                            )}
                            <Table columns={columns} dataSource={bookings} pagination={false} rowKey="clientKey" />
                            {isEditable && (
                                <Space style={{ marginTop: 16 }}>
                                    <Button type="dashed" icon={<PlusOutlined />} onClick={() => { setEditingBookingIndex(null); setModalMode('LTL'); setModalVisible(true); }}>Thêm Hàng Ghép (LTL)</Button>
                                    <Button type="dashed" icon={<PlusOutlined />} onClick={() => { setEditingBookingIndex(null); setModalMode('FTL'); setModalVisible(true); }}>Thêm Bao Nguyên Xe (FTL)</Button>
                                </Space>
                            )}
                        </Card>
                    </Col>

                    <Col xs={24} lg={7}>
                        <div style={{ position: 'sticky', top: 80, zIndex: 10 }}>
                            <Card variant="borderless" title="Tóm Tắt & Thanh Toán" style={{ borderRadius: 8, border: '1px solid #1890ff' }}>
                                <Space style={{ width: '100%', justifyContent: 'space-between' }}><Text>Cộng tiền hàng:</Text><CurrencyText value={sumTienHang} /></Space>
                                <Space style={{ width: '100%', justifyContent: 'space-between', marginTop: 8 }}><Text>Thuế VAT ({vatRate}%):</Text><CurrencyText value={sumTienVat} /></Space>
                                <div style={{ textAlign: 'center', margin: '24px 0' }}>
                                    <Text type="secondary" style={{ fontSize: 13 }}>TỔNG CỘNG THANH TOÁN</Text><br />
                                    <CurrencyText value={totalEstimation} style={{ fontSize: 28, fontWeight: 800, color: '#cf1322' }} />
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {isEditable && (
                                        <Button type="primary" htmlType="submit" size="large" icon={<SaveOutlined />} loading={loading} disabled={isVuotHanMuc}>
                                            LƯU BÁO GIÁ
                                        </Button>
                                    )}
                                    {isEdit && (
                                        <>
                                            <Button size="large" icon={<PrinterOutlined />} onClick={() => {
                                                message.info('Hệ thống đang xuất PDF dữ liệu lưu gần nhất.');
                                                baoGiaService.exportPdf(id);
                                            }}>Xuất PDF 1 chạm</Button>

                                            <Button size="large" icon={<SendOutlined style={{ color: '#eb2f96' }} />} onClick={async () => {
                                                try {
                                                    message.loading({ content: 'Đang gửi email...', key: 'send_email' });
                                                    await baoGiaService.guiEmail(id);
                                                    message.success({ content: 'Đã gửi Email báo giá kèm PDF cho khách!', key: 'send_email' });
                                                } catch (error) {
                                                    message.error({ content: 'Gửi Email thất bại', key: 'send_email' });
                                                }
                                            }}>Gửi Email Khách Hàng</Button>

                                            <Button size="large" icon={<SendOutlined />} onClick={async () => {
                                                await navigator.clipboard.writeText(`Dạ em gửi anh chị Báo giá. Tổng chi phí là: ${(sumTienHang + sumTienVat).toLocaleString('vi-VN')} VNĐ ạ.`);
                                                window.open('https://chat.zalo.me', '_blank');
                                            }}>Chốt qua Zalo</Button>

                                            {baoGiaData?.trang_thai === 'DRAFT' && (
                                                <Button size="large" type="primary" style={{ background: '#0068ff' }} onClick={async () => { await baoGiaService.guiBaoGia(id); message.success('Đã chuyển trạng thái sang ĐỀ XUẤT!'); loadDetail(); }}>Xác nhận Gửi Khách</Button>
                                            )}

                                            {baoGiaData?.trang_thai === 'SENT' && (
                                                <div style={{ marginTop: 10, borderTop: '1px dashed #d9d9d9', paddingTop: 16 }}>
                                                    <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>Khách phản hồi nhanh:</Text>
                                                    <Space direction="vertical" style={{ width: '100%' }}>
                                                        <Button block size="large" style={{ background: '#52c41a', color: '#fff' }} icon={<CheckCircleOutlined />} onClick={async () => { await baoGiaService.xacNhan(id, { trangThai: 'ACCEPTED' }); message.success('Khách đồng ý chốt đơn!'); loadDetail(); }}>Khách ĐỒNG Ý</Button>
                                                        <Button block danger size="large" icon={<CloseCircleOutlined />} onClick={async () => { await baoGiaService.tuChoi(id, { trangThai: 'REJECTED', lyDo: 'Từ chối từ màn chi tiết' }); message.info('Đã hủy báo giá.'); loadDetail(); }}>Khách TỪ CHỐI</Button>
                                                    </Space>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </Card>
                        </div>
                    </Col>
                </Row>
            </Form>

            <BookingModal visible={modalVisible} onCancel={() => { setModalVisible(false); setEditingBookingIndex(null); }} onSave={handleSaveBooking} mode={modalMode} masterData={masterData} editingData={editingBookingIndex !== null ? bookings[editingBookingIndex] : null} />

            <Modal title="Phân tích Zalo bằng AI Copilot" open={aiVisible} onCancel={() => setAiVisible(false)} onOk={handleAnalyzeAI} confirmLoading={aiLoading} okText="Dịch & Lên đơn" okButtonProps={{ style: { background: '#722ed1' } }} destroyOnClose>
                <Alert message="Mẹo: Copy nguyên đoạn chat của khách trên Zalo dán vào đây, AI sẽ tự hiểu lấy hàng ở đâu, giao ở đâu, hàng nặng bao nhiêu ký." type="info" showIcon style={{ marginBottom: 16 }} />
                <Input.TextArea rows={8} placeholder="Dán tin nhắn Zalo của khách vào đây..." value={aiText} onChange={(e) => setAiText(e.target.value)} />
            </Modal>
        </div>
    );
};
export default BaoGiaDetail;
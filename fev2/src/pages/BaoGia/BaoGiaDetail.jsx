import React, { useState, useEffect } from 'react';
import { Card, Form, Input, InputNumber, Button, Row, Col, Select, DatePicker, message, Space, Divider, Typography, Spin, Popconfirm, Modal } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, PlusOutlined, DeleteOutlined, SendOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';

import { baoGiaService } from '../../services/baoGiaService';
import { khachHangService } from '../../services/khachHangService'; 
import { danhMucService } from '../../services/danhMucService';     
import { vanDonService } from '../../services/vanDonService'; 
import StatusTag from '../../components/common/StatusTag';
import CurrencyText from '../../components/common/CurrencyText';

const { Title, Text } = Typography;

const BaoGiaDetail = () => {
    const [form] = Form.useForm();
    const navigate = useNavigate();
    const { id } = useParams();
    const isEdit = !!id;

    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(isEdit);
    const [baoGiaData, setBaoGiaData] = useState(null);

    const [khachHangList, setKhachHangList] = useState([]);
    const [tuyenDuongList, setTuyenDuongList] = useState([]);
    const [loaiHangList, setLoaiHangList] = useState([]);

    const [currentKhachHangId, setCurrentKhachHangId] = useState(null);

    const [isCreateVdVisible, setIsCreateVdVisible] = useState(false);
    const [selectedChiTietId, setSelectedChiTietId] = useState(null);
    const [vdForm] = Form.useForm();

    const isDraft = !isEdit || baoGiaData?.trang_thai === 'DRAFT';
    const dsChiTiet = baoGiaData?.chiTiet || baoGiaData?.chi_tiet || [];

    useEffect(() => {
        const loadDropdownData = async () => {
            try {
                const [khRes, tdRes, lhRes] = await Promise.all([
                    khachHangService.getList({ limit: 1000, isActive: true }),
                    danhMucService.getTuyenDuongList(),
                    danhMucService.getLoaiHangList() 
                ]);
                if (khRes.success) setKhachHangList(khRes.data);
                if (tdRes.success) setTuyenDuongList(tdRes.data);
                if (lhRes.success) setLoaiHangList(lhRes.data);
            } catch (error) {
                message.error('Không tải được danh mục');
            }
        };

        loadDropdownData();
        if (isEdit) loadDetail();
    }, [id]);

    const loadDetail = async () => {
        try {
            const res = await baoGiaService.getById(id);
            if (res.success) {
                setBaoGiaData(res.data);
                const chiTietArr = res.data.chiTiet || res.data.chi_tiet || [];
                
                setCurrentKhachHangId(res.data.khach_hang_id);

                form.setFieldsValue({
                    khachHangId: res.data.khach_hang_id,
                    ngayHetHan: dayjs(res.data.ngay_het_han),
                    ghiChu: res.data.ghi_chu,
                    chiTiet: chiTietArr.map(ct => ({
                        ...ct,
                        tuyenDuongId: Number(ct.tuyen_duong_id),
                        loaiHangId: Number(ct.loai_hang_id), 
                        diaChiLayHang: ct.dia_chi_lay_hang,
                        diaChiGiaoHang: ct.dia_chi_giao_hang,
                        trongLuong: Number(ct.trong_luong)
                    }))
                });
            }
        } catch (error) {
            message.error('Không tải được báo giá');
            navigate('/bao-gia');
        } finally {
            setFetching(false);
        }
    };

    // NGHIỆP VỤ: TÍNH TOÁN CÔNG NỢ & QUÁ HẠN
    const selectedKhachHang = khachHangList.find(kh => kh.id === currentKhachHangId);
    const currentDebt = Number(selectedKhachHang?.cong_no_hien_tai) || 0;
    const debtLimit = Number(selectedKhachHang?.han_muc_cong_no) || 0;
    
    // BỔ SUNG: Kiểm tra số đơn quá hạn thanh toán
    const soDonQuaHan = Number(selectedKhachHang?.so_don_qua_han) || 0;
    const isQuaHan = soDonQuaHan > 0;
    const isVuotHanMuc = selectedKhachHang && debtLimit > 0 && currentDebt > debtLimit;

    // Cờ khóa toàn bộ các nút thao tác lưu/gửi nếu bị chặn nghiệp vụ
    const isBlocked = isVuotHanMuc || isQuaHan;

    const onFinish = async (values) => {
        if (!isDraft) return;

        if (isQuaHan) {
            message.error(`LỖI: Khách hàng đang có ${soDonQuaHan} đơn QUÁ HẠN THANH TOÁN!`);
            return;
        }
        if (isVuotHanMuc) {
            message.error('LỖI: Khách hàng đã vượt quá hạn mức công nợ!');
            return;
        }

        setLoading(true);
        try {
            const payload = { ...values, ngayHetHan: values.ngayHetHan.format('YYYY-MM-DD') };

            if (!isEdit) {
                const res = await baoGiaService.create(payload);
                message.success('Tạo báo giá thành công!');
                navigate(`/bao-gia/${res.data.id}`);
            } else {
                await baoGiaService.update(id, { 
                    ngayHetHan: payload.ngayHetHan, 
                    ghiChu: payload.ghiChu,
                    chiTiet: payload.chiTiet 
                });
                message.success('Đã lưu thay đổi báo giá');
                loadDetail();
            }
        } catch (error) {
            const errorMsg = error?.response?.data?.error?.message || error?.error?.message || 'Lỗi khi lưu báo giá';
            message.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (actionType) => {
        try {
            if (actionType === 'GUI') {
                await baoGiaService.guiBaoGia(id);
                message.success('Đã chuyển trạng thái báo giá thành ĐÃ GỬI');
                
                message.loading({ content: 'Đang khởi tạo file PDF...', key: 'pdf_download' });
                try {
                    await baoGiaService.exportPdf(id);
                    message.success({ content: 'Đã tải file PDF về máy!', key: 'pdf_download' });
                } catch (pdfErr) {
                    message.error({ content: 'Lỗi tải PDF', key: 'pdf_download' });
                }
                
            } else if (actionType === 'XAC_NHAN') {
                await baoGiaService.xacNhan(id, { trangThai: 'ACCEPTED', lyDo: '' });
                message.success('Khách đã đồng ý báo giá');
            } else if (actionType === 'TU_CHOI') {
                await baoGiaService.xacNhan(id, { trangThai: 'REJECTED', lyDo: 'Khách không đồng ý' });
                message.success('Đã đánh dấu khách từ chối');
            }
            loadDetail(); 
        } catch (error) {
            message.error('Lỗi thao tác');
        }
    };

    const handleCreateVanDon = async (values) => {
        try {
            const payload = {
                baoGiaChiTietId: selectedTrip ? selectedTrip.bao_gia_chi_tiet_id : selectedChiTietId,
                nguoiLienHeLay: values.nguoiLienHeLay,
                nguoiLienHeGiao: values.nguoiLienHeGiao,
                ngayVanChuyen: values.ngayVanChuyen.format('YYYY-MM-DD'),
                ngayHetHanThanhToan: values.ngayHetHanThanhToan.format('YYYY-MM-DD') 
            };
            const res = await vanDonService.create(payload);
            message.success('Tạo Vận đơn thành công!');
            setIsCreateVdVisible(false);
            vdForm.resetFields();
            navigate(`/van-don/${res.data.id}`);
        } catch (error) {
            message.error(error?.error?.message || 'Lỗi khi tạo vận đơn');
        }
    };

    if (fetching) return <div style={{ textAlign: 'center', padding: 50 }}><Spin size="large" /></div>;

    return (
        <Card bordered={false}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Space>
                    <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/bao-gia')} />
                    <Title level={4} style={{ margin: 0 }}>{isEdit ? `Chi tiết Báo giá #${id}` : 'Tạo Báo Giá Mới'}</Title>
                    {isEdit && <StatusTag status={baoGiaData?.trang_thai} />}
                </Space>

                {isEdit && (
                    <Space>
                        {baoGiaData?.trang_thai === 'SENT' && (
                            <>
                                <Popconfirm title="Xác nhận khách đã đồng ý chốt giá?" onConfirm={() => handleAction('XAC_NHAN')}>
                                    <Button style={{ backgroundColor: '#52c41a', color: 'white' }} icon={<CheckOutlined />}>Khách Đồng Ý</Button>
                                </Popconfirm>
                                <Popconfirm title="Đánh dấu khách từ chối báo giá này?" onConfirm={() => handleAction('TU_CHOI')}>
                                    <Button danger icon={<CloseOutlined />}>Khách Từ Chối</Button>
                                </Popconfirm>
                            </>
                        )}
                        {baoGiaData?.trang_thai === 'ACCEPTED' && (
                            <div style={{ backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', padding: '6px 16px', borderRadius: 6, color: '#389e0d', fontWeight: 500 }}>
                                Đã chốt! Hãy kéo xuống tạo Vận đơn 👇
                            </div>
                        )}
                    </Space>
                )}
            </div>

            <Form form={form} layout="vertical" onFinish={onFinish}>

                <Divider orientation="left">Thông tin chung</Divider>
                <Row gutter={24}>
                    <Col span={8}>
                        <Form.Item label="Khách hàng" name="khachHangId" rules={[{ required: true, message: 'Vui lòng chọn khách hàng' }]} style={{ marginBottom: selectedKhachHang ? 8 : 24 }}>
                            <Select
                                showSearch
                                placeholder="Tìm tên hoặc SĐT..."
                                optionFilterProp="label"
                                filterOption={(input, option) => String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                                options={khachHangList.map(kh => ({ value: kh.id, label: `${kh.ten_cong_ty} (${kh.so_dien_thoai})` }))}
                                disabled={isEdit}
                                onChange={(val) => setCurrentKhachHangId(val)}
                            />
                        </Form.Item>

                        {/* HIỂN THỊ CẢNH BÁO KÉP (CÔNG NỢ VÀ QUÁ HẠN) */}
                        {selectedKhachHang && (
                            <div style={{ 
                                marginBottom: 24, 
                                padding: '10px 12px', 
                                borderRadius: 6, 
                                backgroundColor: isBlocked ? '#fff2f0' : '#f6ffed', 
                                border: `1px solid ${isBlocked ? '#ffccc7' : '#b7eb8f'}` 
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <Text type="secondary">Nợ hiện tại:</Text>
                                    <Text strong type={isVuotHanMuc ? 'danger' : ''}><CurrencyText value={currentDebt} /></Text>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Text type="secondary">Hạn mức:</Text>
                                    <Text strong><CurrencyText value={debtLimit} /></Text>
                                </div>
                                
                                {/* Thông báo đỏ nếu bị dính 1 trong 2 lỗi */}
                                {isQuaHan && (
                                    <div style={{ color: '#cf1322', marginTop: 8, fontSize: 13, fontWeight: 500 }}>
                                        ⚠️ Khách đang có <strong style={{fontSize: 15}}>{soDonQuaHan}</strong> đơn quá hạn thanh toán!
                                    </div>
                                )}
                                {isVuotHanMuc && !isQuaHan && (
                                    <div style={{ color: '#cf1322', marginTop: 8, fontSize: 13, fontWeight: 500 }}>
                                        ⚠️ Khách đã vượt hạn mức công nợ!
                                    </div>
                                )}
                            </div>
                        )}
                    </Col>
                    <Col span={8}>
                        <Form.Item label="Ngày hết hạn" name="ngayHetHan" rules={[{ required: true }]}>
                            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" disabled={!isDraft} />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item label="Ghi chú chung" name="ghiChu">
                            <Input placeholder="Ghi chú (tùy chọn)..." disabled={!isDraft} />
                        </Form.Item>
                    </Col>
                </Row>

                <Divider orientation="left">Chi tiết vận chuyển</Divider>
                <Form.List name="chiTiet" rules={[{
                    validator: async (_, chiTiet) => {
                        if (!chiTiet || chiTiet.length < 1) return Promise.reject(new Error('Phải có ít nhất 1 chuyến hàng'));
                    }
                }]}>
                    {(fields, { add, remove }, { errors }) => (
                        <>
                            {fields.map(({ key, name, ...restField }, index) => (
                                <Card size="small" key={key} style={{ marginBottom: 16, backgroundColor: '#fafafa', border: '1px solid #e8e8e8' }}
                                    title={`Chuyến hàng ${index + 1}`}
                                    extra={
                                        <Space>
                                            {isDraft && <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(name)} title="Xóa chuyến này" />}
                                            {baoGiaData?.trang_thai === 'ACCEPTED' && (
                                                <Button
                                                    type="primary"
                                                    size="small"
                                                    onClick={() => {
                                                        setSelectedChiTietId(dsChiTiet[index]?.id);
                                                        setIsCreateVdVisible(true);
                                                    }}
                                                >
                                                    + Tạo Vận Đơn
                                                </Button>
                                            )}
                                        </Space>
                                    }
                                >
                                    <Row gutter={16}>
                                        <Col span={8}>
                                            <Form.Item {...restField} label="Tuyến đường" name={[name, 'tuyenDuongId']} rules={[{ required: true }]}>
                                                <Select
                                                    showSearch
                                                    placeholder="Gõ để tìm tuyến (VD: HCM)..."
                                                    optionFilterProp="label"
                                                    filterOption={(input, option) => String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                                                    options={tuyenDuongList
                                                        .filter(td => td.is_active === 1 || td.is_active === true || td.isActive === 1 || td.isActive === true)
                                                        .map(td => {
                                                            const labelDisplay = (td.tinh_di && td.tinh_den) 
                                                                                ? `${td.tinh_di} - ${td.tinh_den}` 
                                                                                : (td.ten_tuyen_duong || td.tenTuyenDuong || td.ten_tuyen || td.tenTuyen || `Tuyến số ${td.id}`);
                                                            return { value: Number(td.id), label: labelDisplay };
                                                        })
                                                    }
                                                    disabled={!isDraft}
                                                />
                                            </Form.Item>
                                        </Col>
                                        <Col span={8}>
                                            <Form.Item {...restField} label="Loại hàng" name={[name, 'loaiHangId']} rules={[{ required: true }]}>
                                                <Select
                                                    showSearch
                                                    placeholder="Gõ để tìm loại..."
                                                    optionFilterProp="label"
                                                    filterOption={(input, option) => String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                                                    options={loaiHangList
                                                        .filter(lh => lh.is_active === 1 || lh.is_active === true || lh.isActive === 1 || lh.isActive === true)
                                                        .map(lh => {
                                                            const labelDisplay = lh.ten || lh.ten_loai_hang || lh.tenLoaiHang || lh.ten_loai || lh.tenLoai || `Mã loại ${lh.id}`;
                                                            return { value: Number(lh.id), label: labelDisplay };
                                                        })
                                                    }
                                                    disabled={!isDraft}
                                                />
                                            </Form.Item>
                                        </Col>
                                        <Col span={8}>
                                            <Form.Item {...restField} label="Trọng lượng (kg)" name={[name, 'trongLuong']} rules={[{ required: true }]}>
                                                <InputNumber style={{ width: '100%' }} min={1} disabled={!isDraft} />
                                            </Form.Item>
                                        </Col>
                                    </Row>

                                    <Row gutter={16}>
                                        <Col span={12}>
                                            <Form.Item {...restField} label="Địa chỉ lấy hàng" name={[name, 'diaChiLayHang']} rules={[{ required: true }]}>
                                                <Input placeholder="Chi tiết nơi bốc hàng..." disabled={!isDraft} />
                                            </Form.Item>
                                        </Col>
                                        <Col span={12}>
                                            <Form.Item {...restField} label="Địa chỉ giao hàng" name={[name, 'diaChiGiaoHang']} rules={[{ required: true }]}>
                                                <Input placeholder="Chi tiết nơi trả hàng..." disabled={!isDraft} />
                                            </Form.Item>
                                        </Col>
                                    </Row>

                                    {isEdit && dsChiTiet[index] && (
                                        <div style={{ padding: '12px 16px', background: '#e6f7ff', borderLeft: '4px solid #1890ff', borderRadius: '4px' }}>
                                            <Text strong>Đơn giá áp dụng: </Text>
                                            <CurrencyText value={dsChiTiet[index].don_gia_ap_dung} />
                                            <span style={{ margin: '0 16px', color: '#bfbfbf' }}>|</span>
                                            <Text strong>Thành tiền: </Text>
                                            <CurrencyText value={dsChiTiet[index].thanh_tien} style={{ color: '#cf1322', fontSize: '16px' }} />
                                        </div>
                                    )}
                                </Card>
                            ))}

                            {/* CHẶN NÚT THÊM CHUYẾN NẾU BỊ BLOCK */}
                            {isDraft && !isBlocked && (
                                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />} style={{ marginBottom: 16, height: 40 }}>
                                    Thêm chuyến hàng
                                </Button>
                            )}
                            <Form.ErrorList errors={errors} />
                        </>
                    )}
                </Form.List>

                {isEdit && (
                    <div style={{ textAlign: 'right', marginTop: 16, padding: '16px', background: '#fff1f0', border: '1px solid #ffa39e', borderRadius: '6px' }}>
                        <Text strong style={{ fontSize: '18px', marginRight: '16px' }}>TỔNG CỘNG:</Text>
                        <CurrencyText value={baoGiaData?.tong_gia_tri} style={{ fontSize: '26px', color: '#cf1322' }} />
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: 24 }}>
                    <Button onClick={() => navigate('/bao-gia')}>Quay lại</Button>
                    
                    {isDraft && (
                        // NÚT LƯU SẼ BỊ VÔ HIỆU HÓA NẾU BỊ BLOCK
                        <Button type="primary" htmlType="submit" size="large" icon={<SaveOutlined />} loading={loading} disabled={isBlocked}>
                            Lưu báo giá (Cập nhật giá)
                        </Button>
                    )}

                    {isEdit && baoGiaData?.trang_thai === 'DRAFT' && (
                        <Popconfirm 
                            title="Chốt và gửi báo giá cho khách?" 
                            description="Hệ thống sẽ chốt giá hiện tại và tải file PDF về máy."
                            onConfirm={() => handleAction('GUI')}
                            okText="Gửi & Tải PDF"
                            cancelText="Hủy"
                            disabled={isBlocked}
                        >
                            <Button type="primary" style={{ backgroundColor: isBlocked ? '#bfbfbf' : '#52c41a' }} size="large" icon={<SendOutlined />} disabled={isBlocked}>
                                Gửi KH (Tải PDF)
                            </Button>
                        </Popconfirm>
                    )}
                </div>
            </Form>

            {/* MODAL TẠO VẬN ĐƠN */}
            <Modal
                title="Khởi tạo Vận đơn thực tế"
                open={isCreateVdVisible}
                onCancel={() => setIsCreateVdVisible(false)}
                onOk={() => vdForm.submit()}
                destroyOnClose
            >
                <Form form={vdForm} layout="vertical" onFinish={handleCreateVanDon}>
                    <Form.Item name="ngayVanChuyen" label="Ngày vận chuyển (Dự kiến đi)" rules={[{ required: true, message: 'Vui lòng chọn ngày đi' }]}>
                        <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                    </Form.Item>
                    
                    <Form.Item name="nguoiLienHeLay" label="Thông tin người lấy hàng" rules={[{ required: true, message: 'Vui lòng nhập thông tin người lấy' }]}>
                        <Input placeholder="Tên và SĐT người ở kho bốc..." />
                    </Form.Item>
                    
                    <Form.Item name="nguoiLienHeGiao" label="Thông tin người nhận hàng" rules={[{ required: true, message: 'Vui lòng nhập thông tin người nhận' }]}>
                        <Input placeholder="Tên và SĐT người nhận hàng..." />
                    </Form.Item>
                    
                    <Form.Item name="ngayHetHanThanhToan" label="Hạn chót thanh toán" rules={[{ required: true, message: 'Vui lòng chọn hạn chót' }]}>
                        <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                    </Form.Item>
                </Form>
            </Modal>
        </Card>
    );
};

export default BaoGiaDetail;
// src/controllers/waybillController.js
const Waybill = require('../models/waybillModel');
const db = require('../config/database');
const puppeteer = require('puppeteer');
const { sendWaybillEmail } = require('../services/emailService');
const { sendTelegramMessage } = require('../services/telegramService');
const pdfService = require('../services/pdfService');
const fs = require('fs');
const path = require('path');

const getWaybills = async (req, res) => {
  try {
    const filterQuery = {
        ...req.query,
        trangThaiThanhToan: req.query.trangThaiThanhToan || req.query.trangThaiTT
    };
    const result = await Waybill.findAll(filterQuery);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

const getWaybillById = async (req, res) => {
  try {
    const waybill = await Waybill.findById(req.params.id);
    if (!waybill) return res.status(404).json({ success: false, error: { message: 'Không tìm thấy vận đơn' } });
    res.json({ success: true, data: waybill });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

const createFromQuotation = async (req, res) => {
  try {
    const { bookingId, nguoiGuiTen, nguoiGuiSdt, nguoiNhanTen, nguoiNhanSdt, hinhThucThanhToan, tienCodThuHo } = req.body;

    const [bkRows] = await db.query(`
      SELECT bk.*, bg.khach_hang_id, bg.trang_thai, kh.han_muc_no_toi_da, kh.tong_no_hien_tai, kh.ten_cong_ty, kh.loai_khach 
      FROM bookings bk JOIN bao_gias bg ON bk.bao_gia_id = bg.id JOIN khach_hangs kh ON bg.khach_hang_id = kh.id
      WHERE bk.id = ?`, [bookingId]
    );

    if (bkRows.length === 0) return res.status(404).json({ success: false, message: 'Không tìm thấy Booking' });
    const booking = bkRows[0];

    if (booking.trang_thai !== 'ACCEPTED') return res.status(422).json({ success: false, message: 'Báo giá chưa được khách duyệt' });

    if (booking.loai_khach === 'B2C_VANG_LAI' && hinhThucThanhToan === 'GHI_NO') {
        return res.status(422).json({ success: false, message: 'Khách B2C không được phép công nợ' });
    }

    const [ppRows] = await db.query(`SELECT SUM(so_tien_du_kien) as tong_phu_phi FROM booking_phu_phis WHERE booking_id = ?`, [bookingId]);
    const tongPhuPhi = Number(ppRows[0].tong_phu_phi) || 0;
    const soTienChotCuoi = Number(booking.tong_cuoc_chinh) + tongPhuPhi;

    if (hinhThucThanhToan === 'GHI_NO' && Number(booking.han_muc_no_toi_da) > 0) {
      if ((Number(booking.tong_no_hien_tai) + soTienChotCuoi > Number(booking.han_muc_no_toi_da))) {
        return res.status(422).json({ success: false, message: `Vượt hạn mức nợ` });
      }
    }

    const maVanDon = await Waybill.createTransaction({
      bookingId, nguoiTaoId: req.user.id, 
      nguoiGuiTen: nguoiGuiTen || booking.nguoi_gui_ten, nguoiGuiSdt: nguoiGuiSdt || booking.nguoi_gui_sdt, 
      nguoiNhanTen: nguoiNhanTen || booking.nguoi_nhan_ten, nguoiNhanSdt: nguoiNhanSdt || booking.nguoi_nhan_sdt, 
      tongCuocChinh: booking.tong_cuoc_chinh, tongPhuPhi, soTienChotCuoi,
      hinhThucThanhToan, tienCodThuHo, khachHangId: booking.khach_hang_id
    });

    if (typeof sendTelegramMessage === 'function') {
        const msg = `📦 ĐƠN MỚI: [${maVanDon}]\n👤 Khách: ${booking.ten_cong_ty}\n📍 Tuyến: ${booking.diem_lay_chi_tiet} -> ${booking.diem_giao_chi_tiet}\n💵 Tổng: ${soTienChotCuoi.toLocaleString()}đ\n💳 TT: ${hinhThucThanhToan}`;
        sendTelegramMessage(msg);
    }

    res.status(201).json({ success: true, message: 'Tạo Vận đơn thành công', data: { ma_van_don: maVanDon } });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const createDirectly = async (req, res) => {
  try {
    const result = await Waybill.createDirectTransaction(req.body, req.user.id);
    res.status(201).json({ success: true, message: 'Phát hành Vận đơn B2C thành công', data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

const finalizeNumbers = async (req, res) => {
  try {
    const { id } = req.params;
    // 🚀 1. Nhận thêm các trường thông tin thay đổi từ màn hình Detail
    const { 
      trongLuongChot, kichThuocChot, 
      nguoi_gui_ten, nguoi_gui_sdt, 
      nguoi_nhan_ten, nguoi_nhan_sdt, 
      hinh_thuc_thanh_toan, tien_cod_thu_ho 
    } = req.body;

    // 1. SELECT THÊM CỘT thue_vat_pt TỪ BẢNG bao_gias
    const [wdRows] = await db.query(`
      SELECT vd.*, bk.hinh_thuc, bk.so_km_api, bk.loai_xe_id, bg.khach_hang_id, bg.thue_vat_pt, kh.loai_khach
      FROM van_dons vd
      JOIN bookings bk ON vd.booking_id = bk.id
      JOIN bao_gias bg ON bk.bao_gia_id = bg.id
      JOIN khach_hangs kh ON kh.id = bg.khach_hang_id
      WHERE vd.ma_van_don = ?
    `, [id]);
    
    if (wdRows.length === 0) return res.status(404).json({ success: false, message: 'Không tìm thấy Vận đơn' });
    const waybill = wdRows[0];
    
    // 🔒 2. KHÓA CHẾT: Không cho sửa nếu Kế toán đã thu tiền (Dù chỉ 1 đồng)
    if (waybill.trang_thai_thanh_toan !== 'UNPAID') {
      return res.status(422).json({ success: false, message: 'Vận đơn đã phát sinh giao dịch thu tiền. Hệ thống tự động khóa bảo vệ số liệu!' });
    }

    // --- [ĐOẠN LOGIC TÍNH TOÁN CƯỚC CHÍNH VÀ PHỤ PHÍ] ---
    let totalChargeableWeight = 0;
    const itemUpdates = [];
    const [origItems] = await db.query(`SELECT id, loai_hang_id, so_luong FROM booking_items WHERE booking_id = ?`, [waybill.booking_id]);

    for (const actItem of kichThuocChot) {
      const orig = origItems.find(o => Number(o.id) === Number(actItem.booking_item_id));
      const qty = orig ? orig.so_luong : 1;
      const lhId = orig ? orig.loai_hang_id : 1;

      let quyDoi = 0;
      if (actItem.dai_cm && actItem.rong_cm && actItem.cao_cm) {
        quyDoi = (Number(actItem.dai_cm) * Number(actItem.rong_cm) * Number(actItem.cao_cm)) / 5000 * qty;
      }
      const actKg = Number(actItem.trong_luong_thuc_te) || 0;
      const cw = Math.max(actKg, quyDoi);
      totalChargeableWeight += cw;

      itemUpdates.push({ id: actItem.booking_item_id, chargeableWeight: cw, loaiHangId: lhId });
    }

    let tongCuocChinh = 0;
    if (waybill.hinh_thuc === 'LTL') {
      const [basePriceRow] = await db.query(`SELECT don_gia_goc_kg, cuoc_toi_thieu FROM bang_gia_ltls WHERE is_active = 1 AND moc_tu_km <= ? AND moc_den_km >= ? LIMIT 1`, [waybill.so_km_api, waybill.so_km_api]);
      const [discountRow] = await db.query(`SELECT he_so_chiet_khau FROM chiet_khau_san_luong_ltls WHERE moc_tu_kg <= ? AND moc_den_kg >= ? LIMIT 1`, [totalChargeableWeight, totalChargeableWeight]);
      const donGiaGoc = basePriceRow.length > 0 ? Number(basePriceRow[0].don_gia_goc_kg) : 0;
      const minCharge = basePriceRow.length > 0 ? Number(basePriceRow[0].cuoc_toi_thieu) : 0;
      const heSoChietKhau = discountRow.length > 0 ? Number(discountRow[0].he_so_chiet_khau) : 1.0;

      for (const it of itemUpdates) {
          const [lhRows] = await db.query('SELECT he_so_gia FROM loai_hangs WHERE id = ?', [it.loaiHangId]);
          const heSoGia = lhRows.length > 0 ? Number(lhRows[0].he_so_gia) : 1.0;
          tongCuocChinh += donGiaGoc * it.chargeableWeight * heSoGia * heSoChietKhau;
      }
      if (tongCuocChinh < minCharge) tongCuocChinh = minCharge;
    } else if (waybill.hinh_thuc === 'FTL') {
      const [ftlRows] = await db.query(`SELECT * FROM bang_gia_ftls WHERE loai_xe_id = ? AND is_active = 1 ORDER BY moc_tu_km ASC`, [waybill.loai_xe_id]);
      let kmToCalc = Number(waybill.so_km_api) || 0;
      for (const tier of ftlRows) {
        if (kmToCalc > Number(tier.moc_den_km)) {
          tongCuocChinh += Number(tier.gia_mo_cua) + ((Number(tier.moc_den_km) - Number(tier.moc_tu_km)) * Number(tier.don_gia_km));
        } else {
          const kmVuot = Math.max(0, kmToCalc - Number(tier.moc_tu_km));
          tongCuocChinh += Number(tier.gia_mo_cua) + (kmVuot * Number(tier.don_gia_km));
          break;
        }
      }
    }

    let tongPhuPhi = 0;
    const [phuPhis] = await db.query(`SELECT * FROM booking_phu_phis WHERE booking_id = ?`, [waybill.booking_id]);
    for (const pp of phuPhis) {
      const [ppRules] = await db.query('SELECT cach_tinh FROM phu_phis WHERE id = ?', [pp.phu_phi_id]);
      if (ppRules.length > 0) {
        const rule = ppRules[0].cach_tinh;
        if (rule === 'THEO_KG') {
          const [matrix] = await db.query('SELECT don_gia FROM bang_gia_phu_phis WHERE phu_phi_id = ? LIMIT 1', [pp.phu_phi_id]);
          if (matrix.length > 0) tongPhuPhi += Number(matrix[0].don_gia) * totalChargeableWeight;
        } else {
          tongPhuPhi += Number(pp.so_tien_du_kien);
        }
      }
    }

    // 🚀 ĐÃ FIX: TÍNH THÊM THUẾ VAT VÀO VẬN ĐƠN
    const tongTruocThue = tongCuocChinh + tongPhuPhi;
    const thueVatPt = Number(waybill.thue_vat_pt) || 0; // Lấy 8% hoặc 10% từ báo giá gốc
    const tienThueVat = tongTruocThue * (thueVatPt / 100);
    const soTienChotCuoi = tongTruocThue + tienThueVat;
    // --- [KẾT THÚC LOGIC TÍNH CƯỚC] ---

   // 🚀 3. CẬP NHẬT TẤT CẢ VÀO DB
    await db.query(
      `UPDATE van_dons 
       SET trong_luong_chot = ?, kich_thuoc_chot = ?, 
           tong_cuoc_chinh = ?, tong_phu_phi = ?, so_tien_chot_cuoi = ?,
           nguoi_gui_ten_thuc_te = COALESCE(?, nguoi_gui_ten_thuc_te), 
           nguoi_gui_sdt_thuc_te = COALESCE(?, nguoi_gui_sdt_thuc_te),
           nguoi_nhan_ten_thuc_te = COALESCE(?, nguoi_nhan_ten_thuc_te), 
           nguoi_nhan_sdt_thuc_te = COALESCE(?, nguoi_nhan_sdt_thuc_te),
           hinh_thuc_thanh_toan = COALESCE(?, hinh_thuc_thanh_toan), 
           tien_cod_thu_ho = COALESCE(?, tien_cod_thu_ho)
       WHERE ma_van_don = ?`,
      [
        trongLuongChot || null, JSON.stringify(kichThuocChot) || null, 
        tongCuocChinh, tongPhuPhi, soTienChotCuoi,
        nguoi_gui_ten, nguoi_gui_sdt, nguoi_nhan_ten, nguoi_nhan_sdt,
        hinh_thuc_thanh_toan, tien_cod_thu_ho, id
      ]
    );
    
    // 4. CẬP NHẬT CÔNG NỢ B2B NẾU CÓ CHÊNH LỆCH DO ĐỔI HÌNH THỨC HOẶC KHỐI LƯỢNG
    const finalHinhThuc = hinh_thuc_thanh_toan || waybill.hinh_thuc_thanh_toan;
    if (finalHinhThuc === 'GHI_NO') {
      const chenhLech = soTienChotCuoi - Number(waybill.so_tien_chot_cuoi);
      await db.query(`UPDATE khach_hangs SET tong_no_hien_tai = tong_no_hien_tai + ? WHERE id = ?`, [chenhLech, waybill.khach_hang_id]);
    }

    if (typeof sendTelegramMessage === 'function') {
        sendTelegramMessage(`⚖️ Kho đã cập nhật đơn [${id}]\n- Khối lượng: ${trongLuongChot} kg\n- Thành tiền: ${soTienChotCuoi.toLocaleString()}đ`);
    }

    res.json({ success: true, message: 'Chốt số liệu và cập nhật thông tin thành công!' });
  } catch (error) { 
    res.status(500).json({ success: false, message: error.message }); 
  }
};

const exportPdf = async (req, res) => {
  try {
    const { id } = req.params;
    const waybill = await Waybill.getFullDetailsForPdf(id);
    if (!waybill) return res.status(404).json({ success: false, message: "Lỗi tải dữ liệu Vận đơn" });

    const pdfBuffer = await pdfService.generateWaybillPdf(waybill);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=\"Waybill-${id}.pdf\"`);
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const uploadPod = async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ success: false, message: 'Vui lòng chọn ảnh Biên nhận (POD)' });

    const uploadDir = path.join(__dirname, '../../public/uploads/pod');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    
    const fileName = `POD_${id}_${Date.now()}.jpg`;
    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, req.file.buffer);

    const imageUrl = `/uploads/pod/${fileName}`;
    await db.query(`UPDATE van_dons SET hinh_anh_pod = ?, trang_thai_van_chuyen = 'DA_GIAO' WHERE ma_van_don = ?`, [imageUrl, id]);

    res.json({ success: true, message: 'Tải ảnh POD thành công!', data: { url: imageUrl } });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

const cancelWaybill = async (req, res) => {
  try {
    const [wdRows] = await db.query(`SELECT trang_thai_thanh_toan FROM van_dons WHERE ma_van_don = ?`, [req.params.id]);
    if(wdRows.length === 0) return res.status(404).json({ success: false, message: 'Không tìm thấy Vận đơn' });
    
    if(wdRows[0].trang_thai_thanh_toan !== 'UNPAID') {
       return res.status(422).json({ success: false, message: 'Không thể hủy vận đơn đã thanh toán hoặc thanh toán một phần' });
    }

    await Waybill.cancel(req.params.id);
    res.json({ success: true, message: 'Đã hủy vận đơn thành công' });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

const getPendingWaybills = async (req, res) => {
  try {
    const rows = await Waybill.getPendingBookings();
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🚀 BỔ SUNG: Hàm xử lý API Gửi Email Vận Đơn cho khách
const sendWaybillEmailController = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Truy vấn DB lấy Email và Tên khách hàng của Vận đơn này
    const [khRows] = await db.query(`
      SELECT kh.email, kh.ten_cong_ty 
      FROM van_dons vd
      JOIN bookings bk ON vd.booking_id = bk.id
      JOIN bao_gias bg ON bk.bao_gia_id = bg.id
      JOIN khach_hangs kh ON bg.khach_hang_id = kh.id
      WHERE vd.ma_van_don = ?
    `, [id]);

    if (khRows.length === 0 || !khRows[0].email) {
      return res.status(404).json({ success: false, message: 'Khách hàng này chưa có địa chỉ Email trong hệ thống!' });
    }

    // 2. Tạo ngầm file PDF Vận đơn
    const waybill = await Waybill.getFullDetailsForPdf(id);
    if (!waybill) return res.status(404).json({ success: false, message: 'Không thể tạo PDF vì thiếu dữ liệu Vận đơn' });
    const pdfBuffer = await pdfService.generateWaybillPdf(waybill);

    // 3. Gọi hàm sendWaybillEmail từ emailService (Bạn đã import ở đầu file rồi)
    await sendWaybillEmail(khRows[0].email, khRows[0].ten_cong_ty, id, pdfBuffer);

    res.json({ success: true, message: 'Đã gửi Email đính kèm Vận đơn thành công!' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khi gửi email: ' + error.message });
  }
};

module.exports = { 
  getWaybills, getWaybillById, createFromQuotation, createDirectly, 
  finalizeNumbers, uploadPod, cancelWaybill, getPendingWaybills, exportPdf ,sendWaybillEmailController
};
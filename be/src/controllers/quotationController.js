const Quotation = require('../models/quotationModel');
const db = require('../config/database');
const { parseZaloMessage } = require('../services/aiCopilotService');
const pdfService = require('../services/pdfService');

const analyzeZaloText = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ success: false, message: 'Vui lòng cung cấp nội dung tin nhắn' });
    const aiResult = await parseZaloMessage(text);
    res.json({ success: true, message: 'AI phân tích thành công', data: aiResult });
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }); }
};

const processBookingData = async (bookings) => {
    let tongTienTruocThue = 0;
    const processedBookings = [];

    for (const bk of bookings) {
      if (!bk.hinhThuc) throw new Error('Dữ liệu chuyến đi bị thiếu Hình thức (LTL/FTL)');

      let tongCuocChinh = 0;
      let tongPhuPhi = 0;
      const processedItems = [];

      let totalChargeableWeightBooking = 0;
      for (const item of (bk.items || [])) {
          let khoiLuongQuyDoi = 0;
          if (item.thuocTinhChiTiet && item.thuocTinhChiTiet.dai_cm) {
              khoiLuongQuyDoi = (item.thuocTinhChiTiet.dai_cm * item.thuocTinhChiTiet.rong_cm * item.thuocTinhChiTiet.cao_cm) / 5000 * (item.soLuong || 1);
          }
          const tongKgThucTe = Number(item.trongLuongThucTe) || 0;
          const chargeableWeight = Math.max(tongKgThucTe, khoiLuongQuyDoi);
          totalChargeableWeightBooking += chargeableWeight;
          processedItems.push({ ...item, chargeableWeight });
      }

      if (bk.hinhThuc === 'LTL') {
          // 🚀 Truy vấn lấy thêm cột cuoc_toi_thieu
          const [basePriceRow] = await db.query(`SELECT don_gia_goc_kg, cuoc_toi_thieu FROM bang_gia_ltls WHERE is_active = 1 AND moc_tu_km <= ? AND moc_den_km >= ? LIMIT 1`, [bk.soKmApi, bk.soKmApi]);
          const [discountRow] = await db.query(`SELECT he_so_chiet_khau FROM chiet_khau_san_luong_ltls WHERE moc_tu_kg <= ? AND moc_den_kg >= ? LIMIT 1`, [totalChargeableWeightBooking, totalChargeableWeightBooking]);
          
          const donGiaGoc = basePriceRow.length > 0 ? Number(basePriceRow[0].don_gia_goc_kg) : 0;
          const minCharge = basePriceRow.length > 0 ? Number(basePriceRow[0].cuoc_toi_thieu) : 0; // 🚀 Lấy biến Mincharge
          const heSoChietKhau = discountRow.length > 0 ? Number(discountRow[0].he_so_chiet_khau) : 1.0;

          if (donGiaGoc === 0) throw new Error(`Khoảng cách ${bk.soKmApi}km chưa có cấu hình giá LTL`);

          for (const item of processedItems) {
              const [lhRows] = await db.query('SELECT he_so_gia FROM loai_hangs WHERE id = ?', [item.loaiHangId || 1]);
              const heSoGia = lhRows.length > 0 ? Number(lhRows[0].he_so_gia) : 1.0;
              tongCuocChinh += donGiaGoc * item.chargeableWeight * heSoGia * heSoChietKhau;
          }

          // 🚀 ÁP DỤNG LUẬT DƯỚI BACKEND
          if (tongCuocChinh < minCharge) {
              tongCuocChinh = minCharge;
          }
      } else if (bk.hinhThuc === 'FTL') {
          // 🚀 FIX LỖI 500: Tự tính giá FTL bằng SQL thay vì gọi file pricingEngine bị lỗi
          const [ftlRows] = await db.query(`SELECT * FROM bang_gia_ftls WHERE loai_xe_id = ? AND is_active = 1 ORDER BY moc_tu_km ASC`, [bk.loaiXeId]);
          if (ftlRows.length > 0) {
              let kmToCalc = Number(bk.soKmApi) || 0;
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
      }

      const calculatedPhuPhi = [];
      const phuPhisInput = bk.phuPhis || bk.phuPhiCoDinh || []; 
      if (phuPhisInput.length > 0) {
        for (const pp of phuPhisInput) {
            const [ppRules] = await db.query('SELECT cach_tinh FROM phu_phis WHERE id = ?', [pp.phuPhiId]);
            if (ppRules.length > 0) {
                const rule = ppRules[0].cach_tinh;
                let queryMatrix = 'SELECT don_gia FROM bang_gia_phu_phis WHERE phu_phi_id = ?';
                let paramsMatrix = [pp.phuPhiId];

                if (rule === 'THEO_LOAI_XE' && pp.loaiXeId) {
                    queryMatrix += ' AND loai_xe_id = ?'; paramsMatrix.push(pp.loaiXeId);
                }
                queryMatrix += ' LIMIT 1';

                const [matrix] = await db.query(queryMatrix, paramsMatrix);
                let tienPP = 0;
                if (matrix.length > 0) {
                    tienPP = (rule === 'THEO_KG') ? (Number(matrix[0].don_gia) * totalChargeableWeightBooking) : Number(matrix[0].don_gia);
                }
                tongPhuPhi += tienPP;
                calculatedPhuPhi.push({ phuPhiId: pp.phuPhiId, loaiXeId: pp.loaiXeId || null, soTienDuKien: tienPP });
            }
        }
      }

      tongTienTruocThue += (tongCuocChinh + tongPhuPhi);
      processedBookings.push({ 
        ...bk, tongCuocChinh, tongPhuPhi, items: processedItems, phuPhiCoDinh: calculatedPhuPhi 
      });
    }
    return { tongTienTruocThue, processedBookings };
};

const createQuotation = async (req, res) => {
  try {
    const { khachHangId, thueVatPt = 0, ngayHetHan, ghiChu, bookings } = req.body;
    if (!bookings || bookings.length === 0) return res.status(422).json({ success: false, error: { message: 'Phải có ít nhất 1 chuyến xe' } });

    const { tongTienTruocThue, processedBookings } = await processBookingData(bookings);
    const tongTienSauThue = tongTienTruocThue + (tongTienTruocThue * (Number(thueVatPt) / 100));

    const quotationId = await Quotation.createFullTransaction({
      khachHangId, nguoiTaoId: req.user.id, tongTienTruocThue, thueVatPt, tongTienSauThue, ngayHetHan, ghiChu, processedBookings
    });
    res.status(201).json({ success: true, data: { id: quotationId } });
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }); }
};

const updateQuotation = async (req, res) => {
  try {
    const { id } = req.params;
    const { thueVatPt = 0, ngayHetHan, ghiChu, bookings } = req.body; 
    const { tongTienTruocThue, processedBookings } = await processBookingData(bookings);
    const tongTienSauThue = tongTienTruocThue + (tongTienTruocThue * (Number(thueVatPt) / 100));

    await Quotation.updateFullTransaction(id, { tongTienTruocThue, thueVatPt, tongTienSauThue, ngayHetHan, ghiChu, processedBookings });
    res.json({ success: true, message: 'Cập nhật thành công' });
  } catch (error) { res.status(500).json({ success: false, error: { message: error.message } }); }
};

const getQuotations = async (req, res) => {
    const result = await Quotation.findAll(req.query);
    res.json({ success: true, ...result });
};
const getQuotationById = async (req, res) => {
    const data = await Quotation.findById(req.params.id);
    res.json({ success: true, data });
};
const sendQuotation = async (req, res) => {
    await Quotation.updateStatus(req.params.id, 'SENT');
    res.json({ success: true });
};
const confirmQuotation = async (req, res) => {
    await Quotation.updateStatus(req.params.id, req.body.trangThai, req.body.lyDo);
    res.json({ success: true });
};
const rejectQuotation = async (req, res) => {
    await Quotation.updateStatus(req.params.id, 'REJECTED', req.body.lyDo);
    res.json({ success: true });
};
const deleteQuotation = async (req, res) => {
    await db.query('DELETE FROM bao_gias WHERE id = ? AND trang_thai = "DRAFT"', [req.params.id]);
    res.json({ success: true });
};

const exportPdf = async (req, res) => {
  try {
    const quotation = await Quotation.getFullDetailsForPdf(req.params.id);
    if (!quotation) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
    const pdfBuffer = await pdfService.generateQuotationPdf(quotation);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="BaoGia-${quotation.id}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

module.exports = { analyzeZaloText, getQuotations, getQuotationById, createQuotation, updateQuotation, sendQuotation, confirmQuotation, rejectQuotation, deleteQuotation, exportPdf };
const Quotation = require('../models/quotationModel');
const Pricing = require('../models/pricingModel'); // Import model Bảng Giá để tra cứu
const puppeteer = require('puppeteer');
const db = require('../config/database'); // THÊM DÒNG NÀY ĐỂ QUERY CÔNG NỢ


//mail
const { sendQuotationEmail } = require('../services/emailService');


// ĐÂY LÀ CÂU QUERY THẦN THÁNH TÍNH CÔNG NỢ ĐỘNG
const queryCongNo = `
  SELECT 
    kh.han_muc_cong_no,
    (
      -- Tổng nợ (Từ các vận đơn CONFIRMED)
      COALESCE((
        SELECT SUM(v.gia_tri) 
        FROM van_dons v
        JOIN bao_gia_chi_tiets bct ON v.bao_gia_chi_tiet_id = bct.id
        JOIN bao_gias bg ON bct.bao_gia_id = bg.id
        WHERE bg.khach_hang_id = kh.id AND v.trang_thai = 'CONFIRMED'
      ), 0)
      - 
      -- Tổng đã thanh toán (Từ phiếu thu)
      COALESCE((
        SELECT SUM(pt.tong_so_tien) 
        FROM phieu_thus pt 
        WHERE pt.khach_hang_id = kh.id
      ), 0)
    ) AS cong_no_hien_tai
  FROM khach_hangs kh
  WHERE kh.id = ?
`;

const getQuotations = async (req, res) => {
  try {
    const result = await Quotation.findAll(req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

const getQuotationById = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) return res.status(404).json({ success: false, message: 'Không tìm thấy báo giá' });
    res.json({ success: true, data: quotation });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// ⚠️ NGHIỆP VỤ LÕI: TẠO BÁO GIÁ
const createQuotation = async (req, res) => {
  try {
    const { khachHangId, ngayHetHan, ghiChu, chiTiet } = req.body;
    
    if (!chiTiet || chiTiet.length === 0) {
      return res.status(422).json({ success: false, error: { message: 'Báo giá phải có ít nhất 1 chi tiết' } });
    }

    let tongGiaTri = 0;
    const processedChiTiet = [];

    for (const item of chiTiet) {
      const { tuyenDuongId, loaiHangId, trongLuong } = item;
      
      const priceResult = await Pricing.lookupPrice(tuyenDuongId, loaiHangId, trongLuong);
      if (!priceResult) {
        return res.status(404).json({ success: false, error: { code: 'GIA_KHONG_TIM_THAY', message: `Không tìm thấy bảng giá phù hợp` } });
      }

      const donGiaApDung = priceResult.donGia;
      const thanhTien = Number(donGiaApDung) * Number(trongLuong);
      tongGiaTri += thanhTien;
      processedChiTiet.push({ ...item, donGiaApDung, thanhTien });
    }

    // BỨC TƯỜNG THÉP: Dùng câu Query tính công nợ động
    const [khRows] = await db.query(queryCongNo, [khachHangId]);
    
    if (khRows.length > 0) {
      const hanMuc = Number(khRows[0].han_muc_cong_no) || 0;
      const noHienTai = Number(khRows[0].cong_no_hien_tai) || 0;

      if (hanMuc > 0 && (noHienTai + tongGiaTri > hanMuc)) {
        return res.status(422).json({
          success: false,
          error: {
            code: 'VUOT_HAN_MUC_CONG_NO',
            message: `LỖI: Báo giá mới (${tongGiaTri.toLocaleString('vi-VN')}đ) + Nợ hiện tại (${noHienTai.toLocaleString('vi-VN')}đ) đã vượt Hạn mức (${hanMuc.toLocaleString('vi-VN')}đ).`
          }
        });
      }
    }

    const userId = req.user.id; 
    const id = await Quotation.createWithDetails(khachHangId, ngayHetHan, ghiChu, tongGiaTri, processedChiTiet, userId);

    res.status(201).json({ success: true, message: 'Tạo báo giá thành công', data: { id, tongGiaTri } });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// [PUT] Cập nhật thông tin chung (chỉ DRAFT)
const updateQuotation = async (req, res) => {
  try {
    const { id } = req.params;
    const { ngayHetHan, ghiChu, chiTiet } = req.body; 

    const quotation = await Quotation.findById(id);

    if (!quotation) return res.status(404).json({ success: false, message: 'Không tìm thấy báo giá' });
    if (quotation.trang_thai !== 'DRAFT') {
      return res.status(422).json({ success: false, error: { code: 'KHONG_THE_THAO_TAC', message: 'Chỉ được sửa báo giá DRAFT' } });
    }

    if (!chiTiet || !Array.isArray(chiTiet) || chiTiet.length === 0) {
       await Quotation.update(id, req.body);
       return res.json({ success: true, message: 'Cập nhật thành công' });
    }

    let tongGiaTri = 0;
    const processedChiTiet = [];

    for (const item of chiTiet) {
      const { tuyenDuongId, loaiHangId, trongLuong } = item;
      const priceResult = await Pricing.lookupPrice(tuyenDuongId, loaiHangId, trongLuong);
      if (!priceResult) return res.status(404).json({ success: false, error: { code: 'GIA_KHONG_TIM_THAY', message: `Lỗi tra giá` } });

      const donGiaApDung = priceResult.donGia;
      const thanhTien = Number(donGiaApDung) * Number(trongLuong);
      tongGiaTri += thanhTien;
      processedChiTiet.push({ ...item, donGiaApDung, thanhTien });
    }

    // BỨC TƯỜNG THÉP LÚC UPDATE:
    const [khRows] = await db.query(queryCongNo, [quotation.khach_hang_id]);
    
    if (khRows.length > 0) {
      const hanMuc = Number(khRows[0].han_muc_cong_no) || 0;
      const noHienTai = Number(khRows[0].cong_no_hien_tai) || 0;

      if (hanMuc > 0 && (noHienTai + tongGiaTri > hanMuc)) {
        return res.status(422).json({
          success: false,
          error: {
            code: 'VUOT_HAN_MUC_CONG_NO',
            message: `LỖI: Báo giá sau cập nhật (${tongGiaTri.toLocaleString('vi-VN')}đ) + Nợ hiện tại (${noHienTai.toLocaleString('vi-VN')}đ) đã vượt Hạn mức!`
          }
        });
      }
    }

    await Quotation.updateWithDetails(id, ngayHetHan, ghiChu, tongGiaTri, processedChiTiet);

    res.json({ success: true, message: 'Cập nhật báo giá thành công', data: { tongGiaTri } });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// [POST] Gửi báo giá
// const sendQuotation = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const quotation = await Quotation.findById(id);

//     if (!quotation) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
//     if (quotation.trang_thai !== 'DRAFT') {
//       return res.status(422).json({ success: false, error: { code: 'KHONG_THE_THAO_TAC', message: 'Báo giá không ở trạng thái DRAFT' } });
//     }
//     if (quotation.chiTiet.length === 0) {
//       return res.status(422).json({ success: false, error: { code: 'BAO_GIA_KHONG_CO_CHI_TIET', message: 'Báo giá trống' } });
//     }

//     await Quotation.updateStatus(id, 'SENT');
//     res.json({ success: true, message: 'Đã gửi báo giá' });
//   } catch (error) {
//     res.status(500).json({ success: false, error: { message: error.message } });
//   }
// };

// [POST] Gửi báo giá (Chốt DRAFT -> SENT và Gửi Email tự động)
const sendQuotation = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Gọi hàm lấy Full Details (có chứa luôn email khách hàng)
    const quotation = await Quotation.getFullDetailsForPdf(id);

    if (!quotation) return res.status(404).json({ success: false, message: 'Không tìm thấy báo giá' });
    if (quotation.trang_thai !== 'DRAFT') {
      return res.status(422).json({ success: false, error: { code: 'KHONG_THE_THAO_TAC', message: 'Báo giá không ở trạng thái DRAFT' } });
    }
    if (!quotation.details || quotation.details.length === 0) {
      return res.status(422).json({ success: false, error: { code: 'BAO_GIA_KHONG_CO_CHI_TIET', message: 'Báo giá trống' } });
    }

    // 1. Chuyển trạng thái sang SENT
    await Quotation.updateStatus(id, 'SENT');

    // 2. Tạo File PDF Ngầm (Không tải về, chỉ lưu ở bộ nhớ tạm - Buffer)
    let rowsHtml = '';
    quotation.details.forEach((item, index) => {
      rowsHtml += `
        <tr>
          <td style="text-align: center;">${index + 1}</td>
          <td>${item.dia_chi_lay_hang}</td>
          <td>${item.dia_chi_giao_hang}</td>
          <td>${item.ten_loai_hang || 'N/A'}</td>
          <td style="text-align: right;">${Number(item.trong_luong).toLocaleString('vi-VN')} kg</td>
          <td style="text-align: right;">${Number(item.don_gia_ap_dung).toLocaleString('vi-VN')} đ</td>
          <td style="text-align: right;">${Number(item.thanh_tien).toLocaleString('vi-VN')} đ</td>
        </tr>
      `;
    });

    const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; line-height: 1.6; }
            .header { border-bottom: 3px solid #1a73e8; padding-bottom: 10px; margin-bottom: 20px; }
            .company-name { font-size: 24px; font-weight: bold; color: #1a73e8; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #dee2e6; padding: 10px; font-size: 13px; }
            th { background-color: #f8f9fa; color: #1a73e8; }
            .total-box { margin-top: 20px; text-align: right; font-size: 18px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">BÁO GIÁ VẬN TẢI # ${quotation.id}</div>
            <p>Ngày tạo: ${new Date(quotation.ngay_tao).toLocaleDateString('vi-VN')}</p>
          </div>
          <p><strong>Khách hàng:</strong> ${quotation.ten_cong_ty}</p>
          <p><strong>Đại diện:</strong> ${quotation.nguoi_lien_he} - ${quotation.so_dien_thoai}</p>
          <table>
            <thead>
              <tr><th>STT</th><th>Từ</th><th>Đến</th><th>Loại hàng</th><th>Trọng lượng</th><th>Đơn giá</th><th>Thành tiền</th></tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <div class="total-box">Tổng thanh toán: ${Number(quotation.tong_gia_tri).toLocaleString('vi-VN')} VNĐ</div>
        </body>
      </html>
    `;

    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.setContent(htmlContent);
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    // 3. Gửi Email cho khách hàng kèm file PDF
    if (quotation.email) {
      await sendQuotationEmail(quotation.email, quotation.ten_cong_ty, id, pdfBuffer);
    }

    res.json({ success: true, message: 'Đã chốt báo giá và tự động gửi Email đính kèm PDF cho khách hàng!' });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// [POST] Khách hàng xác nhận
const confirmQuotation = async (req, res) => {
  try {
    const { id } = req.params;
    const { trangThai, lyDo } = req.body; // trangThai: ACCEPTED hoặc REJECTED
    const quotation = await Quotation.findById(id);

    if (!quotation) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
    if (quotation.trang_thai !== 'SENT') {
      return res.status(422).json({ success: false, error: { code: 'KHONG_THE_THAO_TAC', message: 'Chỉ xác nhận được báo giá ở trạng thái SENT' } });
    }
    if (!['ACCEPTED', 'REJECTED'].includes(trangThai)) {
      return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });
    }

    await Quotation.updateStatus(id, trangThai, lyDo);
    res.json({ success: true, message: `Báo giá đã được chuyển sang ${trangThai}` });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

const exportPdf = async (req, res) => {
  try {
    const { id } = req.params;
    const quotation = await Quotation.getFullDetailsForPdf(id);

    if (!quotation) {
      return res.status(404).json({
        success: false,
        error: { code: 'QUOTATION_NOT_FOUND', message: 'Không tìm thấy báo giá' }
      });
    }

    let rowsHtml = '';
    quotation.details.forEach((item, index) => {
      rowsHtml += `
        <tr>
          <td style="text-align: center;">${index + 1}</td>
          <td>${item.dia_chi_lay_hang}</td>
          <td>${item.dia_chi_giao_hang}</td>
          <td>${item.ten_loai_hang || 'N/A'}</td>
          <td style="text-align: right;">${Number(item.trong_luong).toLocaleString('vi-VN')} kg</td>
          <td style="text-align: right;">${Number(item.don_gia_ap_dung).toLocaleString('vi-VN')} đ</td>
          <td style="text-align: right;">${Number(item.thanh_tien).toLocaleString('vi-VN')} đ</td>
        </tr>
      `;
    });

    const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; line-height: 1.6; }
            .header { border-bottom: 3px solid #1a73e8; padding-bottom: 10px; margin-bottom: 20px; }
            .company-name { font-size: 24px; font-weight: bold; color: #1a73e8; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #dee2e6; padding: 10px; font-size: 13px; }
            th { background-color: #f8f9fa; color: #1a73e8; }
            .total-box { margin-top: 20px; text-align: right; font-size: 18px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">BÁO GIÁ VẬN TẢI # ${quotation.id}</div>
            <p>Ngày tạo: ${new Date(quotation.ngay_tao).toLocaleDateString('vi-VN')}</p>
          </div>
          <p><strong>Khách hàng:</strong> ${quotation.ten_cong_ty}</p>
          <p><strong>Đại diện:</strong> ${quotation.nguoi_lien_he} - ${quotation.so_dien_thoai}</p>
          <table>
            <thead>
              <tr>
                <th>STT</th><th>Từ</th><th>Đến</th><th>Loại hàng</th><th>Trọng lượng</th><th>Đơn giá</th><th>Thành tiền</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <div class="total-box">Tổng thanh toán: ${Number(quotation.tong_gia_tri).toLocaleString('vi-VN')} VNĐ</div>
        </body>
      </html>
    `;

    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.setContent(htmlContent);
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    // 🚀 TỰ ĐỘNG GỬI MAIL KHI XUẤT PDF
    if (quotation.email) {
      sendQuotationEmail(quotation.email, quotation.ten_cong_ty, id, pdfBuffer)
        .catch(err => console.error("Lỗi gửi mail báo giá:", err));
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Quotation-${id}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};



module.exports = { getQuotations, getQuotationById, createQuotation, updateQuotation, sendQuotation, confirmQuotation, exportPdf };
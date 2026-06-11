// src/services/pdfService.js
const puppeteer = require('puppeteer');
const { generateQrUrl } = require('./vietQrService');

// 1. PDF BÁO GIÁ (Quotation) - Thương mại
exports.generateQuotationPdf = async (quotation) => {
    let rowsHtml = '';
    if (quotation.bookings) {
        quotation.bookings.forEach((bk, index) => {
            let itemsHtml = bk.items.map(item => `<div style="font-size: 13px; color: #444;">- ${item.ten_hang} (${item.so_luong} ${item.ten_dvt}) | TL: ${item.chargeable_weight} kg</div>`).join('');
            let phuPhiHtml = bk.chi_tiet_phu_phi.map(pp => `<br><span style="font-size: 13px; color: #d09a00;">+ ${pp.ten_phu_phi}</span>`).join('');
            rowsHtml += `
            <tr>
              <td style="text-align: center;">${index + 1}</td>
              <td><b>Từ:</b> ${bk.diem_lay_chi_tiet} <br><b>Đến:</b> ${bk.diem_giao_chi_tiet}${phuPhiHtml}</td>
              <td>${itemsHtml}</td>
              <td style="text-align: right; color: #cf1322;"><b>${Number(bk.tong_cuoc_chinh).toLocaleString('vi-VN')} đ</b></td>
            </tr>`;
        });
    }

    const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: 'Arial', sans-serif; padding: 40px; color: #333; }
            .header { display: flex; justify-content: space-between; border-bottom: 3px solid #1890ff; padding-bottom: 20px; }
            .logo { font-size: 24px; font-weight: 900; color: #1890ff; }
            h1 { text-align: center; color: #333; letter-spacing: 1px; margin-top: 30px; }
            .info-table { width: 100%; margin-bottom: 30px; }
            .info-table td { padding: 5px; font-size: 14px; }
            .main-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            .main-table th, .main-table td { border: 1px solid #ccc; padding: 12px; font-size: 14px; }
            .main-table th { background: #f0f2f5; color: #111; }
            .total-box { float: right; width: 40%; margin-top: 20px; border: 2px solid #cf1322; padding: 15px; border-radius: 8px; }
            .total-row { display: flex; justify-content: space-between; font-size: 15px; margin-bottom: 8px; }
            .final-total { font-size: 20px; font-weight: bold; color: #cf1322; border-top: 1px dashed #ccc; padding-top: 10px; }
            .terms { margin-top: 40px; clear: both; font-size: 13px; color: #555; background: #fafafa; padding: 15px; border-left: 5px solid #faad14; }
            .signatures { display: flex; justify-content: space-around; margin-top: 50px; text-align: center; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">LOGISTICS PRO</div>
            <div style="text-align: right; font-size: 13px;">
              Mã Báo Giá: <b>BG-${quotation.id}</b><br/>Ngày lập: ${new Date(quotation.created_at).toLocaleDateString('vi-VN')}
            </div>
          </div>
          <h1>BẢNG BÁO GIÁ DỊCH VỤ VẬN TẢI</h1>
          <table class="info-table">
            <tr><td><b>Khách hàng:</b> ${quotation.ten_cong_ty}</td><td><b>Người liên hệ:</b> ${quotation.nguoi_lien_he}</td></tr>
            <tr><td><b>SĐT:</b> ${quotation.so_dien_thoai}</td><td><b>Email:</b> ${quotation.email || '---'}</td></tr>
          </table>
          <table class="main-table">
            <thead><tr><th>STT</th><th>Tuyến Đường & Dịch Vụ</th><th>Chi Tiết Hàng Hóa</th><th>Thành Tiền</th></tr></thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <div class="total-box">
            <div class="total-row"><span>Tổng cước dịch vụ:</span> <span>${Number(quotation.tong_tien_truoc_thue).toLocaleString('vi-VN')} đ</span></div>
            <div class="total-row"><span>Thuế VAT (${quotation.thue_vat_pt}%):</span> <span>${(Number(quotation.tong_tien_truoc_thue) * Number(quotation.thue_vat_pt) / 100).toLocaleString('vi-VN')} đ</span></div>
            <div class="total-row final-total"><span>TỔNG CỘNG:</span> <span>${Number(quotation.tong_tien_sau_thue).toLocaleString('vi-VN')} đ</span></div>
          </div>
          <div class="terms"><b>ĐIỀU KHOẢN:</b><br/>${(quotation.ghi_chu_dieu_khoan || 'Giá chưa bao gồm phí lưu bãi. Hàng hóa tự đóng gói.').replace(/\n/g, '<br/>')}</div>
          <div class="signatures">
            <div>ĐẠI DIỆN KHÁCH HÀNG<br/><span style="font-size:12px; font-weight: normal;">(Ký & Đóng dấu)</span></div>
            <div>ĐẠI DIỆN LOGISTICS<br/><span style="font-size:12px; font-weight: normal;">(Ký & Ghi rõ họ tên)</span></div>
          </div>
        </body>
      </html>
    `;
    return renderPdf(htmlContent);
};

// 2. PDF VẬN ĐƠN (Waybill) - Vận hành đi đường
exports.generateWaybillPdf = async (waybill) => {
    // 🚀 LẤY SỐ KG THỰC TẾ (NẾU ĐÃ CHỐT)
    let actuals = [];
    try {
        actuals = typeof waybill.kich_thuoc_chot === 'string' 
            ? JSON.parse(waybill.kich_thuoc_chot) 
            : (waybill.kich_thuoc_chot || []);
    } catch (e) {}

    let itemsHtml = (waybill.items || []).map(item => {
      // Ưu tiên lấy cân thực tế, nếu chưa cân thì lấy cân báo giá
      const actual = actuals.find(a => Number(a.booking_item_id) === Number(item.id));
      const finalWeight = actual ? (Number(actual.trong_luong_thuc_te) || item.chargeable_weight) : item.chargeable_weight;

      return `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.ten_hang}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;"><b>${item.so_luong}</b> ${item.ten_dvt}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${finalWeight} kg</td>
      </tr>
      `;
    }).join('');

    const barcodeUrl = `https://barcode.tec-it.com/barcode.ashx?data=${waybill.ma_van_don}&code=Code128&dpi=96`;
    let qrHtml = '';
    
    // 🚀 ĐÃ FIX: Hiển thị minh bạch số tiền nhưng khóa cảnh báo B2B
    if (waybill.loai_khach === 'B2C_VANG_LAI') {
        const qrUrl = generateQrUrl(waybill.so_tien_chot_cuoi, waybill.ma_van_don);
        qrHtml = `
          <div style="text-align: center; border: 2px dashed #1890ff; padding: 15px; border-radius: 8px;">
            <p style="margin: 0 0 10px 0; font-weight: bold; color: #1890ff;">QUÉT MÃ ĐỂ THANH TOÁN</p>
            <img src="${qrUrl}" style="max-width: 150px;" />
            <p style="margin: 10px 0 0 0; font-size: 18px; color: #cf1322;"><b>${Number(waybill.so_tien_chot_cuoi).toLocaleString('vi-VN')} VNĐ</b></p>
          </div>
        `;
    } else {
        qrHtml = `
          <div style="text-align: center; padding: 20px; border: 2px dashed #faad14; background: #fffbe6; border-radius: 8px;">
            <p style="margin: 0 0 10px 0; color: #faad14; font-weight: bold; font-size: 16px;">DOANH NGHIỆP GHI NỢ</p>
            <p style="margin: 0; font-size: 18px; color: #cf1322;"><b>TỔNG CƯỚC: ${Number(waybill.so_tien_chot_cuoi).toLocaleString('vi-VN')} Đ</b></p>
            <p style="margin: 10px 0 0 0; font-size: 12px; color: #cf1322; font-style: italic;">(Lưu ý: Tài xế tuyệt đối không thu tiền mặt)</p>
          </div>
        `;
    }

    const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: 'Arial', sans-serif; padding: 20px; color: #111; }
            .top-bar { display: flex; justify-content: space-between; align-items: center; border-bottom: 4px solid #111; padding-bottom: 10px; margin-bottom: 20px; }
            .waybill-title { font-size: 32px; font-weight: 900; letter-spacing: 2px; }
            .barcode img { height: 60px; }
            .location-box { border: 3px solid #111; border-radius: 8px; padding: 15px; margin-bottom: 20px; }
            .location-title { background: #111; color: #fff; display: inline-block; padding: 5px 15px; font-weight: bold; font-size: 14px; margin: -15px 0 10px -15px; border-bottom-right-radius: 8px; }
            .big-text { font-size: 24px; font-weight: bold; margin: 5px 0; text-transform: uppercase; }
            .mid-text { font-size: 18px; color: #333; margin-bottom: 10px; }
            .grid { display: flex; gap: 20px; }
            .col { flex: 1; }
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .items-table th { background: #eee; padding: 10px; text-align: left; border-bottom: 2px solid #ccc; }
            .pod-box { display: flex; border: 2px solid #111; margin-top: 30px; }
            .pod-col { flex: 1; border-right: 1px solid #111; padding: 15px; text-align: center; height: 120px; position: relative; }
            .pod-col:last-child { border-right: none; }
            .pod-title { font-weight: bold; text-transform: uppercase; font-size: 13px; }
            .pod-date { position: absolute; bottom: 10px; left: 0; right: 0; font-size: 11px; color: #666; font-style: italic; }
          </style>
        </head>
        <body>
          <div class="top-bar">
            <div class="waybill-title">WAYBILL / VẬN ĐƠN</div>
            <div class="barcode"><img src="${barcodeUrl}" /></div>
          </div>

          <div class="grid">
            <div class="col location-box">
              <div class="location-title">NƠI LẤY HÀNG (SENDER)</div>
              <div class="big-text">${waybill.nguoi_gui_ten_thuc_te}</div>
              <div class="mid-text">📞 ${waybill.nguoi_gui_sdt_thuc_te}</div>
              <div style="font-size: 16px; line-height: 1.5;">📍 ${waybill.diem_lay_chi_tiet}</div>
            </div>
            <div class="col location-box">
              <div class="location-title">NƠI GIAO HÀNG (RECEIVER)</div>
              <div class="big-text">${waybill.nguoi_nhan_ten_thuc_te}</div>
              <div class="mid-text">📞 ${waybill.nguoi_nhan_sdt_thuc_te}</div>
              <div style="font-size: 16px; line-height: 1.5;">📍 ${waybill.diem_giao_chi_tiet}</div>
            </div>
          </div>

          <div class="grid">
            <div class="col" style="flex: 2;">
              <h3 style="margin-top: 0;">THÔNG TIN HÀNG HÓA</h3>
              <table class="items-table">
                <thead><tr><th>Tên hàng hóa</th><th style="text-align: center;">Số lượng</th><th style="text-align: right;">Trọng lượng tính cước</th></tr></thead>
                <tbody>${itemsHtml}</tbody>
              </table>
              <p><b>Hình thức vận chuyển:</b> ${waybill.hinh_thuc} | <b>Khoảng cách:</b> ${waybill.so_km_api} Km</p>
              <p style="color: #cf1322; font-size: 18px;"><b>Tiền Thu Hộ (COD):</b> ${waybill.tien_cod_thu_ho > 0 ? Number(waybill.tien_cod_thu_ho).toLocaleString('vi-VN') + ' VNĐ' : 'KHÔNG'}</p>
            </div>
            <div class="col" style="flex: 1;">
              ${qrHtml}
            </div>
          </div>

          <div class="pod-box">
            <div class="pod-col">
              <div class="pod-title">1. NGƯỜI GỬI BÀN GIAO</div>
              <div class="pod-date">Ngày: ...../...../20..... Giờ: .......</div>
            </div>
            <div class="pod-col">
              <div class="pod-title">2. TÀI XẾ NHẬN HÀNG</div>
              <div class="pod-date">Ngày: ...../...../20..... Giờ: .......</div>
            </div>
            <div class="pod-col">
              <div class="pod-title">3. NGƯỜI NHẬN THÀNH CÔNG</div>
              <div class="pod-date">Ngày: ...../...../20..... Giờ: .......</div>
            </div>
          </div>
        </body>
      </html>
    `;
    return renderPdf(htmlContent);
};

// Hàm phụ trợ in PDF (Dùng chung cho cả 2)
const renderPdf = async (html) => {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html);
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '10mm', bottom: '10mm' } });
    await browser.close();
    return pdfBuffer;
};
const nodemailer = require('nodemailer');

// 1. Cấu hình hòm thư gửi đi của hệ thống
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'itev.online@gmail.com', // Email của bạn
    pass: 'geir ablv hqyz gegd' // ⚠️ NHỚ SỬA LẠI THÀNH MÃ 16 CHỮ CÁI CỦA BẠN VÀO ĐÂY NHÉ
  }
});

// 2. Hàm gửi Email Báo giá
const sendQuotationEmail = async (toEmail, customerName, quotationId, pdfBuffer) => {
  const mailOptions = {
    from: '"Hệ thống Logistics" <itev.online@gmail.com>',
    to: toEmail,
    subject: `[Báo giá vận tải] Bảng giá cước mã số BG-${quotationId}`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
        <h3 style="color: #1890ff;">Kính gửi công ty ${customerName},</h3>
        <p>Công ty Logistics xin trân trọng gửi đến Quý khách hàng bảng báo giá cước vận tải chi tiết cho các tuyến đường yêu cầu.</p>
        <p>Vui lòng xem file PDF đính kèm bên dưới.</p>
        <p>Nếu có bất kỳ thắc mắc nào về cước phí, xin vui lòng phản hồi lại email này hoặc liên hệ qua hotline của chúng tôi.</p>
        <br/>
        <p>Trân trọng,</p>
        <p><strong>Phòng Kinh Doanh - Hệ thống Logistics</strong></p>
      </div>
    `,
    attachments: [
      {
        filename: `BaoGia-BG${quotationId}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }
    ]
  };

  await transporter.sendMail(mailOptions);
};

// 3. Hàm gửi Email Vận đơn
const sendWaybillEmail = async (toEmail, customerName, waybillId, pdfBuffer) => {
  const mailOptions = {
    from: '"Hệ thống Logistics" <itev.online@gmail.com>',
    to: toEmail,
    subject: `[Vận đơn] Thông tin giao nhận hàng hóa - Mã: ${waybillId}`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
        <h3 style="color: #1890ff;">Kính gửi công ty ${customerName},</h3>
        <p>Hệ thống Logistics xin thông báo: Vận đơn <strong>${waybillId}</strong> đã được khởi tạo thành công.</p>
        <p>Chi tiết về tuyến đường, thông tin liên hệ bốc dỡ và cước phí tạm tính đã được đính kèm trong file PDF bên dưới.</p>
        <p>Tài xế của chúng tôi sẽ liên hệ với quý khách trong thời gian sớm nhất.</p>
        <br/>
        <p>Trân trọng,</p>
        <p><strong>Phòng Điều Vận - Hệ thống Logistics</strong></p>
      </div>
    `,
    attachments: [
      { filename: `VanDon-${waybillId}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }
    ]
  };
  await transporter.sendMail(mailOptions);
};

// 4. Hàm gửi Email Phiếu thu
const sendReceiptEmail = async (toEmail, customerName, receiptId, pdfBuffer) => {
  const mailOptions = {
    from: '"Hệ thống Logistics" <itev.online@gmail.com>',
    to: toEmail,
    subject: `[Phiếu thu] Biên nhận thanh toán - Mã: PT-${receiptId}`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
        <h3 style="color: #52c41a;">Kính gửi công ty ${customerName},</h3>
        <p>Chúng tôi xác nhận đã nhận được khoản thanh toán từ quý khách.</p>
        <p>Phiếu thu số <strong>PT-${receiptId}</strong> đã được ghi nhận vào hệ thống để gạch trừ công nợ.</p>
        <p>Vui lòng xem chi tiết biên nhận và các vận đơn được phân bổ trong file PDF đính kèm.</p>
        <br/>
        <p>Trân trọng,</p>
        <p><strong>Phòng Kế Toán - Hệ thống Logistics</strong></p>
      </div>
    `,
    attachments: [
      { filename: `PhieuThu-PT${receiptId}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }
    ]
  };
  await transporter.sendMail(mailOptions);
};

// Hàm gửi Email Nhắc Nợ
const sendDebtReminderEmail = async (toEmail, customerName, tongNo, soNgayQuaHan) => {
  const mailOptions = {
    from: '"Hệ thống Logistics" <itev.online@gmail.com>',
    to: toEmail,
    subject: `[Thông báo] Nhắc thanh toán công nợ quá hạn - Công ty Logistics`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
        <h3 style="color: #cf1322;">Kính gửi công ty ${customerName},</h3>
        <p>Hệ thống Kế toán Logistics xin thông báo: Hiện tại quý khách đang có các khoản công nợ vận tải đã <strong>quá hạn thanh toán ${soNgayQuaHan} ngày</strong>.</p>
        <p>Tổng số tiền nợ cần thanh toán gấp: <strong style="font-size: 18px; color: #cf1322;">${Number(tongNo).toLocaleString('vi-VN')} VNĐ</strong></p>
        <p>Quý khách vui lòng thu xếp thanh toán trong thời gian sớm nhất để không ảnh hưởng đến hạn mức công nợ và các tiến trình giao nhận hàng hóa tiếp theo.</p>
        <p>Nếu quý khách đã thanh toán, xin vui lòng bỏ qua email này.</p>
        <br/>
        <p>Trân trọng,</p>
        <p><strong>Phòng Kế Toán - Hệ thống Logistics</strong></p>
      </div>
    `
  };
  await transporter.sendMail(mailOptions);
};

// Ghi đè lại dòng export:
module.exports = { sendQuotationEmail, sendWaybillEmail, sendReceiptEmail, sendDebtReminderEmail };
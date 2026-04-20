const nodemailer = require('nodemailer');

// Cấu hình hòm thư gửi đi của hệ thống
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    
    user: 'itev.online@gmail.com', // Email của bạn
    pass: 'geir ablv hqyz gegd' // Lát nữa ở Bước 4 mình sẽ chỉ bạn lấy cái này
  }
});

// Hàm chuyên dùng để gửi Báo giá
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

module.exports = { sendQuotationEmail };
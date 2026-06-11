// src/cronjobs/debtReminder.js
const cron = require('node-cron');
const CongNo = require('../models/congNoModel');
const { sendDebtReminderEmail } = require('../services/emailService');

// 🚀 Chạy vào 08:00 sáng MỖI NGÀY, nhưng chỉ kích hoạt gửi mail nếu hôm đó là NGÀY CUỐI THÁNG
cron.schedule('0 8 * * *', async () => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Logic: Nếu ngày mai là mùng 1 -> Hôm nay chính xác là ngày cuối tháng
  if (tomorrow.getDate() === 1) {
    console.log(`⏰ [CRON] ${today.toLocaleDateString()}: Bắt đầu quét và gửi email nhắc nợ cuối tháng...`);
    
    try {
      // Gọi thẳng hàm lấy danh sách nợ từ Model Công Nợ đã nâng cấp
      const khachHangNoList = await CongNo.getDanhSachKhachNoEmail();
      
      if (khachHangNoList.length === 0) {
        console.log('✅ Không có khách hàng nào đang nợ để gửi nhắc nhở.');
        return;
      }

      for (const kh of khachHangNoList) {
        try {
          // Gửi mail với số nợ hiện tại. Hạn thanh toán mặc định là cuối tháng.
          await sendDebtReminderEmail(kh.email, kh.ten_cong_ty, kh.tong_no_hien_tai, kh.soNgayQuaHan);
          console.log(`📧 Đã gửi nhắc nợ tự động cho: ${kh.email}`);
        } catch (e) {
          console.error(`❌ Lỗi gửi mail cho ${kh.email}:`, e.message);
        }
        // Delay nhẹ 2s giữa các mail để Google không khóa tài khoản vì nghi Spam
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      console.log('✅ [CRON] Hoàn tất quá trình gửi mail nhắc nợ cuối tháng!');
    } catch (error) {
      console.error('❌ Lỗi hệ thống khi quét nợ:', error);
    }
  } else {
    // console.log(`Hôm nay chưa phải cuối tháng. Bỏ qua.`);
  }
});
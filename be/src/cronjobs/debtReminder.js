const cron = require('node-cron');
const db = require('../config/database'); // Điều chỉnh lại đường dẫn file kết nối DB của bạn
const { sendDebtReminderEmail } = require('../services/emailService');

// Cài đặt lịch: Chạy vào đúng 08:00 Sáng mỗi ngày
// Cú pháp: Giây(tùy chọn) | Phút | Giờ | Ngày trong tháng | Tháng | Ngày trong tuần
cron.schedule('0 8 * * *', async () => {
  console.log('⏰ [CRON] Bắt đầu quét công nợ quá hạn lúc 08:00 AM...');

  try {
    // Tìm các vận đơn chưa thanh toán, và ngày hết hạn trễ đúng 3 ngày hoặc 7 ngày
    // DATEDIFF(CURDATE(), ngay_het_han_thanh_toan) = Tính số ngày quá hạn
    const [overdueWaybills] = await db.query(`
      SELECT vd.id, vd.ngay_het_han_thanh_toan, vd.gia_tri, 
             bg.khach_hang_id, kh.ten_cong_ty, kh.email,
             DATEDIFF(CURDATE(), vd.ngay_het_han_thanh_toan) as so_ngay_qua_han
      FROM van_dons vd
      JOIN bao_gia_chi_tiets ct ON vd.bao_gia_chi_tiet_id = ct.id
      JOIN bao_gias bg ON ct.bao_gia_id = bg.id
      JOIN khach_hangs kh ON bg.khach_hang_id = kh.id
      WHERE vd.trang_thai_thanh_toan != 'PAID'
        AND DATEDIFF(CURDATE(), vd.ngay_het_han_thanh_toan) IN (3, 7)
    `);

    if (overdueWaybills.length === 0) {
      console.log('✅ Không có khách hàng nào tới mốc quá hạn 3 ngày hoặc 7 ngày hôm nay.');
      return;
    }

    // Gửi mail cho từng khách
    for (const item of overdueWaybills) {
      if (item.email) {
        await sendDebtReminderEmail(item.email, item.ten_cong_ty, item.gia_tri, item.so_ngay_qua_han);
        console.log(`📧 Đã gửi nhắc nợ cho: ${item.ten_cong_ty} (Quá hạn ${item.so_ngay_qua_han} ngày)`);
      }
    }

  } catch (error) {
    console.error('❌ Lỗi khi chạy Cron Nhắc nợ:', error);
  }
});

console.log('⏳ Tiến trình Nhắc nợ tự động đã được kích hoạt!');
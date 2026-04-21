const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./config/database'); 

// 1. IMPORT TẤT CẢ CÁC ROUTES
const authRoutes = require('./routes/authRoutes');
const cargoTypeRoutes = require('./routes/cargoTypeRoutes');
const customerRoutes = require('./routes/customerRoutes');
const routeRoutes = require('./routes/routeRoutes');
const userRoutes = require('./routes/userRoutes');
const pricingRoutes = require('./routes/pricingRoutes');
const quotationRoutes = require('./routes/quotationRoutes');
const waybillRoutes = require('./routes/waybillRoutes'); // 🆕 Thêm import Vận đơn
const receipts = require('./routes/receiptRoutes');
const congNoRoutes = require('./routes/congNoRoutes');  // thêm dòng này cùng chỗ với các import khác
const dashboardRoutes = require('./routes/dashboardRoutes');

require('./cronjobs/debtReminder'); // Kích hoạt hệ thống chạy ngầm


const app = express();

// --- MIDDLEWARES ---
app.use(cors());
app.use(express.json()); // Để server đọc được dữ liệu JSON gửi lên

// --- ROUTES (PHẢI NẰM Ở ĐÂY, TRƯỚC KHI START SERVER) ---

// Route test kết nối
app.get('/test-db', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT 1 + 1 AS result');
    res.json({ success: true, message: "Database kết nối tốt!", data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Đăng ký các route nghiệp vụ
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/khach-hang', customerRoutes);
app.use('/api/v1/loai-hang', cargoTypeRoutes);
app.use('/api/v1/tuyen-duong', routeRoutes);
app.use('/api/v1/nguoi-dung', userRoutes);
app.use('/api/v1/bang-gia', pricingRoutes);
app.use('/api/v1/bao-gia', quotationRoutes);
app.use('/api/v1/van-don', waybillRoutes); // 🆕 Đăng ký URL cho Vận đơn
app.use('/api/v1/phieu-thu', receipts);
app.use('/api/v1/cong-no', congNoRoutes);  // thêm dòng này cùng chỗ với các app.use khác
app.use('/api/v1/dashboard', dashboardRoutes);




// --- START SERVER (PHẢI NẰM DƯỚI CÙNG) ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại: http://localhost:${PORT}`);
});
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./config/database'); 

// 1. IMPORT TẤT CẢ CÁC ROUTES
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const customerRoutes = require('./routes/customerRoutes');

// --- CÁC DANH MỤC (MASTER DATA) ---
const cargoTypeRoutes = require('./routes/cargoTypeRoutes');
const vehicleTypeRoutes = require('./routes/vehicleTypeRoutes');
const surchargeRoutes = require('./routes/surchargeRoutes');
const unitTypeRoutes = require('./routes/unitTypeRoutes'); // 🆕 Đơn vị tính

// --- CẤU HÌNH & BẢNG GIÁ ---
const sysParamRoutes = require('./routes/sysParamRoutes');
const pricingRoutes = require('./routes/pricingRoutes');

// --- LÕI NGHIỆP VỤ ---
const quotationRoutes = require('./routes/quotationRoutes');
const waybillRoutes = require('./routes/waybillRoutes'); 
const receiptRoutes = require('./routes/receiptRoutes');
const congNoRoutes = require('./routes/congNoRoutes');  
const dashboardRoutes = require('./routes/dashboardRoutes');

const aiChatRoutes = require('./routes/aiChatRoutes');

// Kích hoạt hệ thống chạy ngầm
// require('./cronjobs/debtReminder'); 

const app = express();

// --- MIDDLEWARES ---
app.use(cors());
app.use(express.json()); // Để server đọc được dữ liệu JSON

// Route test kết nối DB
app.get('/test-db', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT 1 + 1 AS result');
    res.json({ success: true, message: "Database kết nối tốt!", data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// 2. ĐĂNG KÝ CÁC ROUTE (ĐÃ QUY HOẠCH LẠI CHUẨN RESTFUL)
// =========================================================================

// Nhóm 1: Hệ thống & Đối tác
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/nguoi-dung', userRoutes);
app.use('/api/v1/khach-hang', customerRoutes);

// Nhóm 2: Master Data (Gom hết vào prefix /danh-muc/)
app.use('/api/v1/danh-muc/loai-hang', cargoTypeRoutes);   // Đã dời vào danh mục
app.use('/api/v1/danh-muc/loai-xe', vehicleTypeRoutes);   
app.use('/api/v1/danh-muc/phu-phi', surchargeRoutes);     
app.use('/api/v1/danh-muc/don-vi-tinh', unitTypeRoutes);  // 🆕 Chuẩn hóa tên

// Nhóm 3: Cấu hình & Bảng giá
app.use('/api/v1/tham-so', sysParamRoutes);               
app.use('/api/v1/bang-gia', pricingRoutes); // 👈 Chỉ cần đúng 1 dòng này là nó bao trọn gói LTL, FTL, Chiết khấu, Phụ phí.

// Nhóm 4: Lõi nghiệp vụ (Giao dịch)
app.use('/api/v1/bao-gia', quotationRoutes);
app.use('/api/v1/van-don', waybillRoutes); 
app.use('/api/v1/phieu-thu', receiptRoutes);
app.use('/api/v1/cong-no', congNoRoutes);  
app.use('/api/v1/dashboard', dashboardRoutes);

app.use('/api/v1/ai-chat', aiChatRoutes);

// --- START SERVER ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server Logistics ERP đang chạy tại: http://localhost:${PORT}`);
});
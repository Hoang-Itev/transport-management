// src/services/aiChatService.js
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk');
const db = require('../config/database');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// 🚀 Cung cấp cho AI biết toàn bộ cấu trúc DB và các mối quan hệ (Foreign Keys)
const DB_SCHEMA = `
Hệ thống quản lý vận tải (Logistics). Hôm nay là ngày ${new Date().toISOString().split('T')[0]}.
Chỉ sử dụng các bảng, cột và các mối quan hệ dưới đây để viết câu lệnh MySQL:

1. BẢNG khach_hangs
- Cột: id (PK), loai_khach ('B2C_VANG_LAI', 'B2B_DOANH_NGHIEP'), ten_cong_ty, ma_so_thue, nguoi_lien_he, so_dien_thoai, email, han_muc_no_toi_da, tong_no_hien_tai, is_active, created_at

2. BẢNG bao_gias
- Cột: id (PK), khach_hang_id (FK -> khach_hangs.id), nguoi_tao_id, tong_tien_truoc_thue, thue_vat_pt, tong_tien_sau_thue, trang_thai ('DRAFT','SENT','ACCEPTED','REJECTED'), ngay_het_han, created_at

3. BẢNG bookings (Tuyến đường)
- Cột: id (PK), bao_gia_id (FK -> bao_gias.id), hinh_thuc ('LTL', 'FTL'), so_km_api, diem_lay_chi_tiet, diem_giao_chi_tiet, tong_cuoc_chinh

4. BẢNG van_dons (Chốt cuối cùng)
- Cột: ma_van_don (PK), booking_id (FK -> bookings.id), nguoi_gui_ten_thuc_te, nguoi_nhan_ten_thuc_te, trong_luong_chot, tong_cuoc_chinh, tong_phu_phi, so_tien_chot_cuoi, hinh_thuc_thanh_toan ('TRA_TRUOC','COD_THU_HO','GHI_NO'), tien_cod_thu_ho, trang_thai_thanh_toan ('UNPAID','PARTIAL','PAID'), trang_thai_van_chuyen ('CHO_LAY','DANG_CHAY','DA_GIAO','CANCELLED'), ngay_tao

5. BẢNG phieu_thus (Thanh toán)
- Cột: id (PK), khach_hang_id (FK -> khach_hangs.id), so_tien_nhan_duoc, ngay_thu, hinh_thuc ('CHUYEN_KHOAN','TIEN_MAT')

LƯU Ý KHI JOIN:
- Để lấy thông tin Khách hàng của Vận đơn: van_dons JOIN bookings ON van_dons.booking_id = bookings.id JOIN bao_gias ON bookings.bao_gia_id = bao_gias.id JOIN khach_hangs ON bao_gias.khach_hang_id = khach_hangs.id
`;

const cleanSQL = (text) => {
    // 🚀 Thuật toán làm sạch SQL tốt hơn cho cả Gemini và Groq
    let sql = text.replace(/```sql/ig, '').replace(/```/g, '').replace(/\n/g, ' ').trim();
    return sql;
};

// 🔒 Lớp khiên bảo vệ (Chỉ cho Read-only)
const isSafeSQL = (sql) => {
    const upperSQL = sql.toUpperCase();
    if (!upperSQL.startsWith('SELECT')) return false;
    const dangerousKeywords = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'TRUNCATE', 'GRANT', 'REVOKE'];
    for (let word of dangerousKeywords) {
        if (upperSQL.includes(word)) return false;
    }
    return true;
};

const generateSQLWithAI = async (question) => {
    const prompt = `${DB_SCHEMA}\n\nNhiệm vụ của bạn là dịch câu hỏi sau của người dùng sang 1 câu lệnh SELECT MySQL duy nhất, tối ưu. TUYỆT ĐỐI KHÔNG giải thích gì thêm, KHÔNG in ra markdown, CHỈ trả về đoạn text code SQL thuần túy.\nCâu hỏi: "${question}"`;

    try {
        // Ưu tiên 1: Gemini 2.5 Flash
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent(prompt);
        return cleanSQL(result.response.text());
    } catch (geminiError) {
        console.warn('⚠️ Gemini lỗi hoặc quá tải. Kích hoạt Groq Fallback...');
        try {
            // Ưu tiên 2: Fallback qua Groq
            const chatCompletion = await groq.chat.completions.create({
                messages: [
                    { role: "system", content: "You are a MySQL expert. Only output raw SQL code. No markdown. No explanations." },
                    { role: "user", content: prompt }
                ],
                model: "llama-3.3-70b-versatile", // 🚀 ĐÃ FIX THÀNH MODEL MỚI NHẤT
                temperature: 0,
            });
            return cleanSQL(chatCompletion.choices[0].message.content);
        } catch (groqError) {
            console.error('❌ Cả hai mô hình AI đều sập:', groqError.message);
            throw new Error('Hệ thống AI đang bảo trì, vui lòng thử lại sau ít phút.');
        }
    }
};

// Thay thế hàm explainDataWithAI cũ bằng đoạn này:
const explainDataWithAI = async (question, sql, data) => {
    // 🚀 DẠY AI CÁCH TRẢ LỜI (SYSTEM PROMPTING)
    const prompt = `Bạn là Trợ lý Phân tích Dữ liệu Logistics (Data Analyst) chuyên nghiệp của công ty.
    Sếp vừa hỏi bạn câu này: "${question}"
    Đây là kết quả trích xuất chính xác từ Database (định dạng JSON):
    ${JSON.stringify(data).substring(0, 3000)}

    YÊU CẦU BẮT BUỘC KHI TRẢ LỜI:
    1. Xưng hô tôn trọng: Xưng "Tôi" hoặc "Dạ", gọi người dùng là "Sếp" hoặc "Bạn".
    2. Phân tích trực tiếp dữ liệu JSON ở trên để trả lời. TUYỆT ĐỐI KHÔNG bịaa số liệu.
    3. Định dạng tiền tệ chuẩn Việt Nam: Ví dụ 25425000 phải viết là 25.425.000 VNĐ.
    4. Trình bày sạch đẹp: Dùng gạch đầu dòng (bullet points) hoặc in đậm các con số quan trọng để Sếp dễ đọc.
    5. Nếu JSON rỗng ([]), hãy báo cáo: "Dạ, không tìm thấy dữ liệu nào khớp với yêu cầu."
    6. TUYỆT ĐỐI KHÔNG giải thích về câu lệnh SQL. Chỉ tập trung vào ý nghĩa của các con số.`;

    try {
        // Ưu tiên 1: Gemini 2.5 Flash
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (geminiError) {
        console.warn('⚠️ Gemini nghẽn ở khâu giải thích. Dùng Groq để giải thích JSON...');
        try {
            // 🚀 BỔ SUNG: Ưu tiên 2: Groq Fallback
            const chatCompletion = await groq.chat.completions.create({
                messages: [
                    { role: "system", content: "You are a helpful Vietnamese data analyst assistant." },
                    { role: "user", content: prompt }
                ],
                model: "llama-3.3-70b-versatile", // 🚀 ĐÃ FIX THÀNH MODEL MỚI NHẤT
                temperature: 0.3,
            });
            return chatCompletion.choices[0].message.content;
        } catch (groqError) {
            // Nếu cả 2 nền tảng AI đều sập cùng lúc (Rất hiếm)
            return "Dạ báo cáo Sếp, hệ thống đã lấy được dữ liệu ở bên dưới, nhưng module ngôn ngữ đang bị nghẽn mạng nên không thể tóm tắt thành văn bản lúc này ạ. Sếp xem tạm dữ liệu thô nhé!";
        }
    }
};

const processAIChat = async (question) => {
    // Bước 1: Xin AI câu lệnh SQL
    const sqlQuery = await generateSQLWithAI(question);
    
    // Bước 2: Kiểm tra an ninh
    if (!isSafeSQL(sqlQuery)) {
        throw new Error('Cảnh báo an ninh: Câu lệnh SQL không hợp lệ. AI chỉ được phép đọc dữ liệu (SELECT).');
    }

    try {
        // Bước 3: Chạy SQL vào DB
        const [rows] = await db.query(sqlQuery);

        // Bước 4: Xin AI tóm tắt lại dữ liệu bằng tiếng Việt
        let aiExplanation = '';
        if (rows.length > 0) {
            aiExplanation = await explainDataWithAI(question, sqlQuery, rows);
        } else {
            aiExplanation = "Không tìm thấy dữ liệu nào khớp với yêu cầu của bạn trên hệ thống.";
        }

        return { 
            sql: sqlQuery, 
            data: rows, 
            answer: aiExplanation 
        };
    } catch (dbError) {
        console.error("Lỗi Query SQL từ AI:", sqlQuery);
        throw new Error('AI viết câu lệnh SQL bị lỗi cú pháp. Sếp vui lòng hỏi rõ ngữ cảnh hơn nhé.');
    }
};

module.exports = { processAIChat };
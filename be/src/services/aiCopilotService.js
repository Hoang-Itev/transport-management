// src/services/aiCopilotService.js
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require("groq-sdk");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const cleanJsonResponse = (text) => {
  if (!text) return "{}";
  let cleaned = text.trim();
  // FIX: dùng \n thay vì ký tự newline thật trong regex
  cleaned = cleaned.replace(/```json/gi, '').replace(/\n```/g, '').trim();
  const match = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  return match ? match[0] : cleaned;
};

const parseZaloMessage = async (message) => {
  const prompt = `Bạn là trợ lý điều phối Logistics xuất sắc. Đọc tin nhắn Zalo của khách và bóc tách thành JSON chuẩn.
 
QUY TẮC SUY LUẬN "loaiHangId":
- Nếu là "hóa chất", "chất lỏng nguy hiểm": "loaiHangId": 3
- Nếu là "dễ vỡ", "thủy tinh", "điện tử", "rượu": "loaiHangId": 2
- Các loại hàng hóa thông thường khác (quần áo, bánh kẹo, máy móc...): "loaiHangId": 1

QUY TẮC SUY LUẬN XE (loaiXeId):
- Chỉ điền mã xe nếu khách yêu cầu Bao xe (FTL). VD: "xe máy" -> XE_MAY, "1.25 tấn" -> XE_1.25T, "5 tấn" -> XE_5T, "15 tấn" -> XE_15T. Nếu là hàng ghép (LTL) thì để null.

FORMAT JSON DUY NHẤT TRẢ VỀ (Phải tuân thủ tuyệt đối cấu trúc này):
{
  "khachHangSdt": "SĐT của khách (nếu có)",
  "bookings": [
    {
      "hinhThuc": "LTL", 
      "diemLayChiTiet": "Địa chỉ lấy hàng chi tiết hoặc Tên Tỉnh/Thành",
      "diemGiaoChiTiet": "Địa chỉ giao hàng chi tiết hoặc Tên Tỉnh/Thành",
      "loaiXeId": "Mã xe hoặc null",
      "items": [
        {
          "tenHang": "Tên hàng hóa",
          "loaiHangId": 1,
          "soLuong": 1,
          "trongLuongThucTe": 0,
          "thuocTinhChiTiet": {
            "dai_cm": 0,
            "rong_cm": 0,
            "cao_cm": 0
          }
        }
      ]
    }
  ]
}

TIN NHẮN KHÁCH HÀNG:

"${message}"`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", generationConfig: { responseMimeType: "application/json" } });
    const result = await model.generateContent(prompt);
    return JSON.parse(cleanJsonResponse(result.response.text()));
  } catch (error) {
    try {
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      const chatCompletion = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama-3.3-70b-versatile",
        temperature: 0.1,
      });
      return JSON.parse(cleanJsonResponse(chatCompletion.choices[0]?.message?.content));
    } catch (groqError) {
      throw new Error("AI đang bận");
    }
  }
};

// 🚀 ĐÃ FIX: Tối ưu Prompt và bắt lỗi chi tiết
// 🚀 ĐÃ FIX: Dạy AI quy luật viết liền của Ngân hàng để tự động khôi phục dấu "-"
const scanBillWithGemini = async (imageBuffer, mimeType) => {
  const prompt = `Bạn là hệ thống Kế toán AI tự động. Hãy đọc ảnh biên lai/hóa đơn chuyển khoản ngân hàng này và trích xuất dữ liệu thành chuỗi JSON duy nhất.
  
  QUY TẮC DỮ LIỆU:
  - "tongSoTien": Chỉ trả về số nguyên (VD: 1500000), tuyệt đối không có dấu phẩy hay chữ VNĐ.
  - "noiDung": Toàn bộ nội dung chuyển khoản nguyên gốc.
  - "tenNguoiChuyen": Tên người chuyển tiền hoặc Tên tài khoản gửi.
  - "maVanDonList": Tìm trong nội dung chuyển khoản, trích ra các mã Vận đơn. 
    🔥 LƯU Ý TỐI QUAN TRỌNG: Ngân hàng thường viết liền mã và bỏ dấu gạch ngang (VD: VD20260610001). Bạn PHẢI tự động nhận diện và CHÈN LẠI dấu gạch ngang (-) để mã trả về ĐÚNG CHUẨN định dạng là VD-YYYYMMDD-XXX (Ví dụ: VD-20260610-001). Nếu không tìm thấy, trả về mảng [].

  FORMAT JSON DUY NHẤT TRẢ VỀ:
  {
    "tongSoTien": 0,
    "noiDung": "...",
    "tenNguoiChuyen": "...",
    "maVanDonList": []
  }`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); 
    const imageParts = [{
      inlineData: { data: imageBuffer.toString("base64"), mimeType: mimeType || "image/jpeg" }
    }];

    const result = await model.generateContent([prompt, ...imageParts]);
    return JSON.parse(cleanJsonResponse(result.response.text()));
  } catch (error) {
    console.error("LỖI GEMINI NỘI BỘ:", error);
    throw new Error(`Gemini từ chối xử lý: ${error.message}`);
  }
};

module.exports = { parseZaloMessage, scanBillWithGemini };
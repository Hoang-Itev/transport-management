// src/services/vietQrService.js

/**
 * Sinh URL chứa ảnh mã QR chuyển khoản tĩnh hoặc động.
 * @param {Number} amount Số tiền cần thanh toán
 * @param {String} content Nội dung chuyển khoản (Thường là Mã Vận Đơn)
 */
exports.generateQrUrl = (amount, content) => {
    // THAY ĐỔI CÁC THÔNG SỐ NÀY THÀNH THÔNG TIN NGÂN HÀNG CỦA CÔNG TY BẠN
    const bankId = 'MB'; // Tên viết tắt hoặc BIN của Ngân hàng (Ví dụ: MB, VCB, TCB)
    const accountNo = '0123456789'; // Số tài khoản ngân hàng
    const accountName = 'CONG TY TNHH LOGISTICS'; // Tên chủ tài khoản viết không dấu
    const template = 'compact'; // Giao diện QR (compact, qr_only, print)

    // Tạo URL ảnh gọi trực tiếp (Không cần cài thư viện rườm rà)
    let url = `https://img.vietqr.io/image/${bankId}-${accountNo}-${template}.png`;
    
    // Nếu có truyền tiền và nội dung thì tự động ghép vào param
    if (amount && content) {
        url += `?amount=${amount}&addInfo=${encodeURIComponent(content)}&accountName=${encodeURIComponent(accountName)}`;
    }

    return url;
};
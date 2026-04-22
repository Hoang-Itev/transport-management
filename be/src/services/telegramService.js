const axios = require('axios');

const sendTelegramMessage = async (message) => {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
        console.log('⚠️ Bỏ qua gửi Telegram vì chưa cấu hình .env');
        return;
    }

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

    try {
        // Gửi request ngầm, không dùng await ở Controller để tránh block UI
        await axios.post(url, {
            chat_id: chatId,
            text: message,
            parse_mode: 'HTML' // Cho phép in đậm, in nghiêng trong tin nhắn
        });
        console.log('🚀 [Telegram] Đã gửi thông báo cho Sếp!');
    } catch (error) {
        // Bắt lỗi để server không bị sập nếu rớt mạng hoặc sai token
        console.error('❌ [Telegram] Lỗi gửi tin nhắn:', error?.response?.data || error.message);
    }
};

module.exports = { sendTelegramMessage };
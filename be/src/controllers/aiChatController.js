// src/controllers/aiChatController.js
const aiChatService = require('../services/aiChatService');

const chatWithDatabase = async (req, res) => {
    try {
        const { question } = req.body;
        if (!question) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập câu hỏi' });
        }

        const result = await aiChatService.processAIChat(question);
        
        res.json({
            success: true,
            data: {
                aiAnswer: result.answer, // Câu trả lời thân thiện
                sqlGenerated: result.sql, // Query (Đưa ra để debug/Sếp xem)
                rawRows: result.data // Dữ liệu thô để Frontend vẽ Table/Chart
            }
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'AI không thể xử lý câu hỏi này, vui lòng hỏi rõ ràng hơn.',
            error: error.message 
        });
    }
};

module.exports = { chatWithDatabase };
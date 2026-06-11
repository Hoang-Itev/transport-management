import React, { useState, useRef, useEffect } from 'react';
import { Button, Input, Spin, Typography, Collapse, Avatar, Tooltip } from 'antd';
import { RobotOutlined, SendOutlined, CloseOutlined, UserOutlined, DatabaseOutlined } from '@ant-design/icons';
import { aiChatService } from '../../services/aiChatService';

const { Text } = Typography;
const { Panel } = Collapse;

const AiChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState('');
  
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: 'Dạ xin chào Sếp! Tôi là Trợ lý AI Phân tích Dữ liệu. Sếp cần tra cứu công nợ, xem báo cáo doanh thu hay tìm vận đơn nào hôm nay ạ?',
    }
  ]);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!question.trim()) return;

    const userMsg = { sender: 'user', text: question };
    setMessages(prev => [...prev, userMsg]);
    setQuestion('');
    setLoading(true);

    try {
      const res = await aiChatService.chatWithDatabase(question);
      if (res.success) {
        setMessages(prev => [...prev, {
          sender: 'ai',
          text: res.data.aiAnswer,
          sql: res.data.sqlGenerated,
          rawRows: res.data.rawRows
        }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        sender: 'ai',
        text: 'Dạ thưa Sếp, tôi chưa hiểu rõ ý này. Sếp có thể dùng từ ngữ đơn giản hoặc cung cấp thêm thông tin được không ạ?',
        isError: true
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: 30, right: 30, zIndex: 9999 }}>
      {/* 🚀 FIX: KHUNG CHAT TO HƠN, RỘNG HƠN */}
      <div style={{
        display: isOpen ? 'flex' : 'none',
        flexDirection: 'column',
        width: 450,           // Kéo rộng ra 450px
        height: '75vh',       // Chiều cao linh động theo màn hình
        maxHeight: 700,       // Tối đa 700px
        backgroundColor: '#fff',
        borderRadius: 12,
        boxShadow: '0 12px 32px rgba(0,0,0,0.2)',
        border: '1px solid #e8e8e8',
        marginBottom: 16,
        overflow: 'hidden',
        transition: 'all 0.3s ease'
      }}>
        {/* Header Chat */}
        <div style={{ padding: '16px', background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <RobotOutlined style={{ fontSize: 24 }} />
            <div>
              <Text strong style={{ color: '#fff', fontSize: 16, display: 'block' }}>AI Data Copilot</Text>
              <Text style={{ color: '#e6f7ff', fontSize: 12 }}>Truy vấn & Phân tích Database</Text>
            </div>
          </div>
          <CloseOutlined style={{ cursor: 'pointer', fontSize: 18 }} onClick={() => setIsOpen(false)} />
        </div>

        {/* Nội dung Chat */}
        <div style={{ flex: 1, padding: 16, overflowY: 'auto', backgroundColor: '#f0f2f5' }}>
          {messages.map((msg, index) => (
            <div key={index} style={{
              display: 'flex',
              flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row',
              marginBottom: 20,
              gap: 12
            }}>
              <Avatar 
                size="large"
                icon={msg.sender === 'user' ? <UserOutlined /> : <RobotOutlined />} 
                style={{ backgroundColor: msg.sender === 'user' ? '#87d068' : '#722ed1', flexShrink: 0 }} 
              />
              <div style={{ maxWidth: '85%' }}>
                <div style={{
                  padding: '12px 16px',
                  backgroundColor: msg.sender === 'user' ? '#1890ff' : '#fff',
                  color: msg.sender === 'user' ? '#fff' : '#111',
                  borderRadius: 16,
                  borderTopRightRadius: msg.sender === 'user' ? 0 : 16,
                  borderTopLeftRadius: msg.sender === 'ai' ? 0 : 16,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                  fontSize: 14,
                  lineHeight: 1.6 // 🚀 FIX: Dãn dòng cho dễ đọc
                }}>
                  {/* Sử dụng pre-wrap để giữ lại định dạng gạch đầu dòng của AI */}
                  <div 
  style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: msg.isError ? '#cf1322' : 'inherit' }}
  dangerouslySetInnerHTML={{ __html: msg.text?.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
/>
                </div>

                {/* Nếu AI có trả về Dữ liệu thô và SQL, tạo nút để xem */}
                {msg.sender === 'ai' && msg.sql && (
                  <Collapse ghost size="small" style={{ marginTop: 8, background: 'transparent' }}>
                    <Panel header={<Text type="secondary" style={{ fontSize: 13 }}><DatabaseOutlined /> Xem Log Truy Vấn (Dev/Admin)</Text>} key="1">
                      <div style={{ background: '#282c34', color: '#abb2bf', padding: 12, borderRadius: 8, fontSize: 12, marginBottom: 8, overflowX: 'auto' }}>
                        <code>{msg.sql}</code>
                      </div>
                      {msg.rawRows && msg.rawRows.length > 0 && (
                        <div style={{ maxHeight: 200, overflowY: 'auto', background: '#fff', border: '1px solid #d9d9d9', borderRadius: 8 }}>
                           <pre style={{ fontSize: 12, margin: 0, padding: 12 }}>
                             {JSON.stringify(msg.rawRows.slice(0, 10), null, 2)}
                             {msg.rawRows.length > 10 && '\n... (Đã rút gọn bớt kết quả)'}
                           </pre>
                        </div>
                      )}
                    </Panel>
                  </Collapse>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
               <Avatar size="large" icon={<RobotOutlined />} style={{ backgroundColor: '#722ed1', flexShrink: 0 }} />
               <div style={{ padding: '12px 16px', background: '#fff', borderRadius: 16, borderTopLeftRadius: 0, boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
                 <Spin size="small" style={{ marginRight: 8 }} /> Đang soi Database để lấy số liệu cho Sếp...
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Khung Nhập Liệu */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid #e8e8e8', background: '#fff' }}>
          <Input.TextArea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Hỏi AI về doanh thu, công nợ, đơn hàng..."
            autoSize={{ minRows: 1, maxRows: 4 }}
            disabled={loading}
            style={{ borderRadius: 24, paddingRight: 45, fontSize: 14 }}
          />
          <Button 
            type="primary" 
            shape="circle" 
            size="large"
            icon={<SendOutlined />} 
            onClick={handleSend} 
            disabled={!question.trim() || loading} 
            style={{ position: 'absolute', right: 24, bottom: 20, background: '#722ed1', border: 'none' }} 
          />
        </div>
      </div>

      {/* NÚT FLOAT ICON ROBOT */}
      {!isOpen && (
        <Tooltip title="AI Copilot - Truy vấn Database" placement="left">
          <Button 
            type="primary" 
            shape="circle" 
            size="large"
            icon={<RobotOutlined style={{ fontSize: 32 }} />} 
            style={{ width: 65, height: 65, background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)', border: 'none', boxShadow: '0 4px 16px rgba(114,46,209,0.4)' }}
            onClick={() => setIsOpen(true)}
          />
        </Tooltip>
      )}
    </div>
  );
};

export default AiChatWidget;    
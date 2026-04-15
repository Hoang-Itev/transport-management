import React from 'react';
import { Tag } from 'antd';

const StatusTag = ({ status }) => {
  const statusMap = {
    // Khách hàng
    1: { color: 'success', text: 'Đang hợp tác' },
    0: { color: 'default', text: 'Ngừng hợp tác' },
    // Báo giá
    DRAFT: { color: 'default', text: 'DRAFT' },
    SENT: { color: 'processing', text: 'SENT' },
    ACCEPTED: { color: 'success', text: 'ACCEPTED' },
    REJECTED: { color: 'error', text: 'REJECTED' },
    // Vận đơn / Phiếu thu
    UNPAID: { color: 'error', text: 'UNPAID' },
    PARTIAL: { color: 'warning', text: 'PARTIAL' },
    PAID: { color: 'success', text: 'PAID' },
    CONFIRMED: { color: 'success', text: 'CONFIRMED' },
    CANCELLED: { color: 'error', text: 'CANCELLED' }
  };

  // Hỗ trợ cả boolean (true/false) cho isActive của Khách hàng
  if (status === true) status = 1;
  if (status === false) status = 0;

  const cfg = statusMap[status] || { color: 'default', text: status };
  return <Tag color={cfg.color} style={{ fontWeight: 500 }}>{cfg.text}</Tag>;
};

export default StatusTag;
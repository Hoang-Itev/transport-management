// src/components/common/StatusTag.jsx
import React from 'react';
import { Tag } from 'antd';

const StatusTag = ({ status }) => {
  const statusMap = {
    // Trạng thái chung (Boolean -> 1/0)
    1: { color: 'success', text: 'Hoạt động' },
    0: { color: 'default', text: 'Vô hiệu hóa' },
    
    // Báo giá
    DRAFT: { color: 'default', text: 'NHÁP' },
    SENT: { color: 'processing', text: 'ĐÃ GỬI' },
    ACCEPTED: { color: 'success', text: 'CHỐT (ACCEPTED)' },
    REJECTED: { color: 'error', text: 'TỪ CHỐI' },
    
    // Vận đơn - Thanh toán
    UNPAID: { color: 'error', text: 'CHƯA THU' },
    PARTIAL: { color: 'warning', text: 'THU 1 PHẦN' },
    PAID: { color: 'success', text: 'ĐÃ THU ĐỦ' },
    
    // Vận đơn - Vận chuyển (V3)
    CHO_XE: { color: 'default', text: 'CHỜ BỐC XE' },
    DANG_CHAY: { color: 'processing', text: 'ĐANG CHẠY' },
    DA_GIAO: { color: 'success', text: 'ĐÃ GIAO HÀNG' },
    CANCELLED: { color: 'error', text: 'ĐÃ HỦY' }
  };

  // Hỗ trợ cả boolean (true/false) cho isActive
  let mappedStatus = status;
  if (status === true) mappedStatus = 1;
  if (status === false) mappedStatus = 0;

  const cfg = statusMap[mappedStatus] || { color: 'default', text: status };
  
  return <Tag color={cfg.color} style={{ fontWeight: 600 }}>{cfg.text}</Tag>;
};

export default StatusTag;
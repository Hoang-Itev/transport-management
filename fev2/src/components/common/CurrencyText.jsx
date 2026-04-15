import React from 'react';
import { formatCurrency } from '../../utils/formatCurrency';

const CurrencyText = ({ value, style }) => {
  return <span style={{ fontWeight: 500, color: '#1890ff', ...style }}>{formatCurrency(value)}</span>;
};

export default CurrencyText;
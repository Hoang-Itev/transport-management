export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return '0 VNĐ';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
};
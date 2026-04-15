import dayjs from 'dayjs';

export const formatDate = (dateString, format = 'DD/MM/YYYY') => {
  if (!dateString) return '';
  return dayjs(dateString).format(format);
};
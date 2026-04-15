import { useState } from 'react';

export const usePagination = (defaultLimit = 10) => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(defaultLimit);
  const [total, setTotal] = useState(0);

  const onChange = (newPage, newLimit) => {
    setPage(newPage);
    if (newLimit !== limit) setLimit(newLimit);
  };

  return { page, limit, total, setTotal, setPage, onChange };
};
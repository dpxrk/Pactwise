import { useState, useCallback, useMemo } from 'react';

export interface PaginationConfig {
  initialPage?: number;
  pageSize?: number;
  totalItems?: number;
}

export interface PaginationResult {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  startIndex: number;
  endIndex: number;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  setPageSize: (size: number) => void;
  setTotalItems: (total: number) => void;
}

/**
 * Custom hook for pagination logic
 */
export function usePagination({
  initialPage = 1,
  pageSize: initialPageSize = 20,
  totalItems: initialTotalItems = 0,
}: PaginationConfig = {}): PaginationResult {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [totalItems, setTotalItems] = useState(initialTotalItems);

  const totalPages = useMemo(() => {
    return Math.ceil(totalItems / pageSize);
  }, [totalItems, pageSize]);

  const hasNext = useMemo(() => {
    return currentPage < totalPages;
  }, [currentPage, totalPages]);

  const hasPrev = useMemo(() => {
    return currentPage > 1;
  }, [currentPage]);

  const startIndex = useMemo(() => {
    return (currentPage - 1) * pageSize;
  }, [currentPage, pageSize]);

  const endIndex = useMemo(() => {
    return Math.min(startIndex + pageSize, totalItems);
  }, [startIndex, pageSize, totalItems]);

  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  }, [totalPages]);

  const nextPage = useCallback(() => {
    if (hasNext) {
      setCurrentPage(prev => prev + 1);
    }
  }, [hasNext]);

  const prevPage = useCallback(() => {
    if (hasPrev) {
      setCurrentPage(prev => prev - 1);
    }
  }, [hasPrev]);

  const handleSetPageSize = useCallback((size: number) => {
    setPageSize(size);
    // Reset to first page when page size changes
    setCurrentPage(1);
  }, []);

  const handleSetTotalItems = useCallback((total: number) => {
    setTotalItems(total);
    // Ensure current page is valid
    const newTotalPages = Math.ceil(total / pageSize);
    if (currentPage > newTotalPages && newTotalPages > 0) {
      setCurrentPage(newTotalPages);
    }
  }, [currentPage, pageSize]);

  return {
    currentPage,
    pageSize,
    totalItems,
    totalPages,
    hasNext,
    hasPrev,
    startIndex,
    endIndex,
    goToPage,
    nextPage,
    prevPage,
    setPageSize: handleSetPageSize,
    setTotalItems: handleSetTotalItems,
  };
}

export default usePagination;
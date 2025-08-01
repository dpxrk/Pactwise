import React, { createContext, useContext, ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// Context for sharing table state
interface TableContextType {
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (field: string) => void;
}

const TableContext = createContext<TableContextType | undefined>(undefined);

// Main DataTable component
interface DataTableProps {
  children: ReactNode;
  className?: string;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (field: string) => void;
}

export function DataTable({ 
  children, 
  className, 
  sortField, 
  sortDirection, 
  onSort 
}: DataTableProps) {
  const contextValue: TableContextType = {};
  
  if (sortField !== undefined) {
    contextValue.sortField = sortField;
  }
  if (sortDirection !== undefined) {
    contextValue.sortDirection = sortDirection;
  }
  if (onSort !== undefined) {
    contextValue.onSort = onSort;
  }

  return (
    <TableContext.Provider value={contextValue}>
      <Card className={cn('overflow-hidden', className)}>
        {children}
      </Card>
    </TableContext.Provider>
  );
}

// Table Header component
interface TableHeaderProps {
  children: ReactNode;
  className?: string;
}

export function TableHeader({ children, className }: TableHeaderProps) {
  return (
    <div className={cn('bg-muted/50 border-b', className)}>
      <div className="grid gap-4 p-4">
        {children}
      </div>
    </div>
  );
}

// Table Body component
interface TableBodyProps {
  children: ReactNode;
  className?: string;
  emptyState?: ReactNode;
}

export function TableBody({ children, className, emptyState }: TableBodyProps) {
  const hasChildren = React.Children.count(children) > 0;
  
  return (
    <div className={cn('divide-y', className)}>
      {hasChildren ? children : emptyState}
    </div>
  );
}

// Table Row component
interface TableRowProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  isSelected?: boolean;
}

export function TableRow({ children, className, onClick, isSelected }: TableRowProps) {
  return (
    <div 
      className={cn(
        'grid gap-4 p-4 transition-colors',
        onClick && 'cursor-pointer hover:bg-muted/50',
        isSelected && 'bg-muted/30',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

// Table Cell component
interface TableCellProps {
  children: ReactNode;
  className?: string;
  sortable?: boolean;
  sortField?: string;
}

export function TableCell({ children, className, sortable, sortField }: TableCellProps) {
  const context = useContext(TableContext);
  const currentSortField = context?.sortField;
  const sortDirection = context?.sortDirection;
  const onSort = context?.onSort;
  
  const handleSort = () => {
    if (sortable && sortField && onSort) {
      onSort(sortField);
    }
  };
  
  const isSorted = sortField === currentSortField;
  
  return (
    <div 
      className={cn(
        'flex items-center',
        sortable && 'cursor-pointer select-none hover:text-foreground/80',
        className
      )}
      onClick={handleSort}
    >
      {children}
      {sortable && isSorted && (
        <span className="ml-1 text-xs">
          {sortDirection === 'asc' ? '↑' : '↓'}
        </span>
      )}
    </div>
  );
}

// Table Actions component
interface TableActionsProps {
  children: ReactNode;
  className?: string;
}

export function TableActions({ children, className }: TableActionsProps) {
  return (
    <div className={cn('flex items-center justify-end gap-2', className)}>
      {children}
    </div>
  );
}

// Table Pagination component
interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function TablePagination({ 
  currentPage, 
  totalPages, 
  totalItems, 
  pageSize,
  onPageChange, 
  className 
}: TablePaginationProps) {
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);
  
  return (
    <div className={cn('flex items-center justify-between p-4 border-t bg-muted/25', className)}>
      <div className="text-sm text-muted-foreground">
        Showing {startItem} to {endItem} of {totalItems} results
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNumber;
            if (totalPages <= 5) {
              pageNumber = i + 1;
            } else if (currentPage <= 3) {
              pageNumber = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNumber = totalPages - 4 + i;
            } else {
              pageNumber = currentPage - 2 + i;
            }
            
            return (
              <Button
                key={pageNumber}
                variant={pageNumber === currentPage ? "default" : "outline"}
                size="sm"
                onClick={() => onPageChange(pageNumber)}
              >
                {pageNumber}
              </Button>
            );
          })}
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Table Status Badge component
interface TableStatusBadgeProps {
  status: string;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  className?: string;
}

export function TableStatusBadge({ status, variant = 'default', className }: TableStatusBadgeProps) {
  const getVariantForStatus = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'completed':
      case 'approved':
        return 'default';
      case 'pending':
      case 'processing':
        return 'secondary';
      case 'expired':
      case 'failed':
      case 'rejected':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <Badge 
      variant={getVariantForStatus(status)} 
      className={className}
    >
      {formatStatus(status)}
    </Badge>
  );
}

// Table Loading component
interface TableLoadingProps {
  rows?: number;
  columns?: number;
}

export function TableLoading({ rows = 5, columns = 4 }: TableLoadingProps) {
  return (
    <div className="divide-y">
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div key={rowIndex} className="grid gap-4 p-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }, (_, colIndex) => (
            <div key={colIndex} className="h-4 bg-muted animate-pulse rounded" />
          ))}
        </div>
      ))}
    </div>
  );
}

// Table Empty State component
interface TableEmptyStateProps {
  title?: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}

export function TableEmptyState({ 
  title = 'No data found',
  description = 'There are no items to display',
  action,
  icon
}: TableEmptyStateProps) {
  return (
    <div className="text-center py-12 px-4">
      {icon && (
        <div className="flex justify-center mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground mb-4">{description}</p>
      {action && action}
    </div>
  );
}

// Export all components as named exports and compound component
export default Object.assign(DataTable, {
  Header: TableHeader,
  Body: TableBody,
  Row: TableRow,
  Cell: TableCell,
  Actions: TableActions,
  Pagination: TablePagination,
  StatusBadge: TableStatusBadge,
  Loading: TableLoading,
  EmptyState: TableEmptyState,
});
import React, { useCallback, useMemo, CSSProperties, useRef, useEffect, useState } from 'react';
import { FixedSizeList as List } from 'react-window';
import { cn } from '@/lib/utils';

interface Column<T> {
  key: keyof T | string;
  header: string;
  width?: number | string;
  render?: (value: any, item: T, index: number) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

interface VirtualTableProps<T> {
  data: T[];
  columns: Column<T>[];
  rowHeight?: number;
  headerHeight?: number;
  onRowClick?: (item: T, index: number) => void;
  className?: string;
  headerClassName?: string;
  rowClassName?: string | ((item: T, index: number) => string);
  overscan?: number;
  stickyHeader?: boolean;
}

/**
 * High-performance virtual table component
 */
export function VirtualTable<T extends Record<string, any>>({
  data,
  columns,
  rowHeight = 48,
  headerHeight = 48,
  onRowClick,
  className,
  headerClassName,
  rowClassName,
  overscan = 3,
  stickyHeader = true,
}: VirtualTableProps<T>) {
  const getColumnWidth = useCallback((column: Column<T>, totalWidth: number) => {
    if (!column.width) {
      const flexColumns = columns.filter(c => !c.width);
      const fixedWidth = columns
        .filter(c => c.width)
        .reduce((sum, c) => {
          const width = typeof c.width === 'string' 
            ? parseInt(c.width) 
            : c.width || 0;
          return sum + width;
        }, 0);
      
      return (totalWidth - fixedWidth) / flexColumns.length;
    }
    
    if (typeof column.width === 'string') {
      if (column.width.endsWith('%')) {
        return (totalWidth * parseInt(column.width)) / 100;
      }
      return parseInt(column.width);
    }
    
    return column.width;
  }, [columns]);

  const Row = useCallback(
    ({ index, style }: { index: number; style: CSSProperties }) => {
      const item = data[index];
      const rowClassValue = typeof rowClassName === 'function' 
        ? rowClassName(item, index) 
        : rowClassName;

      return (
        <div
          style={style}
          className={cn(
            "flex items-center border-b border-gray-200 hover:bg-gray-50 transition-colors",
            onRowClick && "cursor-pointer",
            rowClassValue
          )}
          onClick={() => onRowClick?.(item, index)}
        >
          {columns.map((column, colIndex) => {
            const value = column.key.includes('.') 
              ? column.key.split('.').reduce((obj, key) => obj?.[key], item)
              : item[column.key as keyof T];
            
            const content = column.render 
              ? column.render(value, item, index)
              : value?.toString() || '';

            return (
              <div
                key={`${index}-${colIndex}`}
                className={cn(
                  "px-4 py-2 overflow-hidden text-ellipsis whitespace-nowrap",
                  column.className
                )}
                style={{
                  width: getColumnWidth(column, window.innerWidth),
                  flexShrink: 0,
                }}
              >
                {content}
              </div>
            );
          })}
        </div>
      );
    },
    [data, columns, onRowClick, rowClassName, getColumnWidth]
  );

  const Header = useMemo(() => (
    <div
      className={cn(
        "flex items-center bg-gray-50 border-b border-gray-300 font-semibold",
        stickyHeader && "sticky top-0 z-10",
        headerClassName
      )}
      style={{ height: headerHeight }}
    >
      {columns.map((column, index) => (
        <div
          key={index}
          className={cn(
            "px-4 py-2 overflow-hidden text-ellipsis whitespace-nowrap",
            column.headerClassName
          )}
          style={{
            width: getColumnWidth(column, window.innerWidth),
            flexShrink: 0,
          }}
        >
          {column.header}
        </div>
      ))}
    </div>
  ), [columns, headerHeight, stickyHeader, headerClassName, getColumnWidth]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: rect.width,
          height: rect.height - headerHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [headerHeight]);

  return (
    <div className={cn("w-full h-full overflow-hidden", className)}>
      {Header}
      <div ref={containerRef} style={{ height: `calc(100% - ${headerHeight}px)` }}>
        {dimensions.height > 0 && dimensions.width > 0 && (
          <List
            height={dimensions.height}
            width={dimensions.width}
            itemCount={data.length}
            itemSize={rowHeight}
            overscanCount={overscan}
          >
            {Row}
          </List>
        )}
      </div>
    </div>
  );
}

/**
 * Virtual table with sorting and filtering
 */
interface EnhancedVirtualTableProps<T> extends VirtualTableProps<T> {
  sortable?: boolean;
  filterable?: boolean;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  onFilter?: (filters: Record<string, string>) => void;
  sortConfig?: { key: string; direction: 'asc' | 'desc' };
}

export function EnhancedVirtualTable<T extends Record<string, any>>({
  sortable,
  filterable,
  onSort,
  onFilter,
  sortConfig,
  ...props
}: EnhancedVirtualTableProps<T>) {
  const [filters, setFilters] = React.useState<Record<string, string>>({});

  const handleSort = (key: string) => {
    if (!sortable || !onSort) return;
    
    const direction = sortConfig?.key === key && sortConfig.direction === 'asc' 
      ? 'desc' 
      : 'asc';
    
    onSort(key, direction);
  };

  const handleFilter = (key: string, value: string) => {
    if (!filterable || !onFilter) return;
    
    const newFilters = { ...filters, [key]: value };
    if (!value) {
      delete newFilters[key];
    }
    
    setFilters(newFilters);
    onFilter(newFilters);
  };

  const enhancedColumns = props.columns.map(column => ({
    ...column,
    header: (
      <div className="flex flex-col space-y-1">
        <div className="flex items-center space-x-2">
          <span>{column.header}</span>
          {sortable && (
            <button
              onClick={() => handleSort(column.key as string)}
              className="text-gray-400 hover:text-gray-600"
            >
              {sortConfig?.key === column.key ? (
                sortConfig.direction === 'asc' ? '↑' : '↓'
              ) : '↕'}
            </button>
          )}
        </div>
        {filterable && (
          <input
            type="text"
            placeholder="Filter..."
            className="w-full px-2 py-1 text-sm border rounded"
            onChange={(e) => handleFilter(column.key as string, e.target.value)}
            onClick={(e) => e.stopPropagation()}
          />
        )}
      </div>
    ),
  }));

  return (
    <VirtualTable
      {...props}
      columns={enhancedColumns}
      headerHeight={sortable || filterable ? 80 : props.headerHeight}
    />
  );
}

/**
 * Example usage
 */
export const VirtualTableExample: React.FC = () => {
  const data = Array.from({ length: 10000 }, (_, i) => ({
    id: i,
    name: `User ${i}`,
    email: `user${i}@example.com`,
    role: i % 3 === 0 ? 'Admin' : i % 2 === 0 ? 'Editor' : 'Viewer',
    status: i % 2 === 0 ? 'Active' : 'Inactive',
    createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
  }));

  const columns: Column<typeof data[0]>[] = [
    {
      key: 'id',
      header: 'ID',
      width: 80,
    },
    {
      key: 'name',
      header: 'Name',
      width: '25%',
    },
    {
      key: 'email',
      header: 'Email',
      width: '25%',
    },
    {
      key: 'role',
      header: 'Role',
      width: 120,
      render: (value) => (
        <span className={cn(
          "px-2 py-1 rounded-full text-xs",
          value === 'Admin' ? 'bg-red-100 text-red-800' :
          value === 'Editor' ? 'bg-blue-100 text-blue-800' :
          'bg-gray-100 text-gray-800'
        )}>
          {value}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: 100,
      render: (value) => (
        <span className={cn(
          "px-2 py-1 rounded-full text-xs",
          value === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        )}>
          {value}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (value) => new Date(value).toLocaleDateString(),
    },
  ];

  return (
    <div className="h-[600px] border rounded-lg">
      <VirtualTable
        data={data}
        columns={columns}
        onRowClick={(item) => console.log('Clicked:', item)}
      />
    </div>
  );
};
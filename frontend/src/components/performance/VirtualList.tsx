import React, { useCallback, useMemo, CSSProperties, useRef, useEffect, useState } from 'react';
import { VariableSizeList as List, FixedSizeList } from 'react-window';
import { cn } from '@/lib/utils';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number | ((index: number) => number);
  renderItem: (item: T, index: number, style: CSSProperties) => React.ReactNode;
  overscan?: number;
  className?: string;
  estimatedItemSize?: number;
  onScroll?: (scrollOffset: number) => void;
  onItemsRendered?: (startIndex: number, endIndex: number) => void;
}

/**
 * Generic virtual list component for high-performance rendering of large lists
 */
export function VirtualList<T>({
  items,
  itemHeight,
  renderItem,
  overscan = 3,
  className,
  estimatedItemSize = 50,
  onScroll,
  onItemsRendered,
}: VirtualListProps<T>) {
  const isFixedHeight = typeof itemHeight === 'number';

  const Row = useCallback(
    ({ index, style }: { index: number; style: CSSProperties }) => {
      const item = items[index];
      return renderItem(item, index, style);
    },
    [items, renderItem]
  );

  const getItemSize = useMemo(() => {
    if (typeof itemHeight === 'function') {
      return itemHeight;
    }
    return () => itemHeight;
  }, [itemHeight]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  return (
    <div ref={containerRef} className={cn('w-full h-full', className)}>
      {dimensions.height > 0 && dimensions.width > 0 && (
        isFixedHeight ? (
          <FixedSizeList
            height={dimensions.height}
            width={dimensions.width}
            itemCount={items.length}
            itemSize={itemHeight as number}
            overscanCount={overscan}
            onScroll={onScroll}
            onItemsRendered={onItemsRendered}
          >
            {Row}
          </FixedSizeList>
        ) : (
          <List
            height={dimensions.height}
            width={dimensions.width}
            itemCount={items.length}
            itemSize={getItemSize}
            estimatedItemSize={estimatedItemSize}
            overscanCount={overscan}
            onScroll={onScroll}
            onItemsRendered={onItemsRendered}
          >
            {Row}
          </List>
        )
      )}
    </div>
  );
}

/**
 * Virtual list with infinite scroll support
 */
interface InfiniteVirtualListProps<T> extends Omit<VirtualListProps<T>, 'onItemsRendered'> {
  hasMore: boolean;
  isLoading: boolean;
  loadMore: () => void;
  loadingComponent?: React.ReactNode;
  threshold?: number;
}

export function InfiniteVirtualList<T>({
  items,
  hasMore,
  isLoading,
  loadMore,
  loadingComponent,
  threshold = 5,
  ...props
}: InfiniteVirtualListProps<T>) {
  const handleItemsRendered = useCallback(
    (startIndex: number, endIndex: number) => {
      if (!isLoading && hasMore && endIndex >= items.length - threshold) {
        loadMore();
      }
    },
    [isLoading, hasMore, items.length, threshold, loadMore]
  );

  const itemsWithLoader = useMemo(() => {
    if (isLoading && hasMore) {
      return [...items, { __loading: true } as any];
    }
    return items;
  }, [items, isLoading, hasMore]);

  const renderItemWithLoader = useCallback(
    (item: T | { __loading: boolean }, index: number, style: CSSProperties) => {
      if ((item as any).__loading) {
        return (
          <div style={style} className="flex items-center justify-center p-4">
            {loadingComponent || (
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
              </div>
            )}
          </div>
        );
      }
      return props.renderItem(item as T, index, style);
    },
    [props.renderItem, loadingComponent]
  );

  return (
    <VirtualList
      {...props}
      items={itemsWithLoader}
      renderItem={renderItemWithLoader}
      onItemsRendered={handleItemsRendered}
    />
  );
}

/**
 * Example usage component
 */
export const VirtualListExample: React.FC = () => {
  const items = Array.from({ length: 10000 }, (_, i) => ({
    id: i,
    name: `Item ${i}`,
    description: `Description for item ${i}`,
  }));

  return (
    <div className="h-[600px] border rounded-lg">
      <VirtualList
        items={items}
        itemHeight={80}
        renderItem={(item, index, style) => (
          <div
            style={style}
            className={cn(
              "flex items-center p-4 border-b",
              index % 2 === 0 ? "bg-gray-50" : "bg-white"
            )}
          >
            <div className="flex-1">
              <h3 className="font-semibold">{item.name}</h3>
              <p className="text-sm text-gray-600">{item.description}</p>
            </div>
          </div>
        )}
      />
    </div>
  );
};
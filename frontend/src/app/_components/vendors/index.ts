// Non-lazy components (for backward compatibility)
export { VendorList as VendorListSync } from './VendorList';
export { VendorDetail as VendorDetailSync } from './VendorDetail';
export { VendorAnalytics as VendorAnalyticsSync } from './VendorAnalytics';
export { VendorCreateDialog } from './VendorCreateDialog';
export { VirtualizedVendorList } from './VirtualizedVendorList';

// Lazy-loaded exports (recommended for better performance)
export { LazyVendorList as VendorList } from './LazyVendorList';
export { LazyVendorDetail as VendorDetail } from './LazyVendorDetail';
export { LazyVendorAnalytics as VendorAnalytics } from './LazyVendorAnalytics';
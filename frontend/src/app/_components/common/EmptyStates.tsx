'use client';

import React from 'react';
import { 
  FileText, 
  Building, 
  Search, 
  Users, 
  BarChart3, 
  Bell, 
  Archive, 
  Plus, 
  Upload, 
  Filter,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Star,
  Settings,
  ArrowRight,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { EmptyState as PremiumEmptyState } from '@/components/premium';
import { PremiumButton } from '@/components/premium';

// Base empty state component
export interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'secondary';
    icon?: React.ComponentType<{ className?: string }>;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    variant?: 'ghost' | 'outline';
  };
  image?: string;
  variant?: 'default' | 'minimal' | 'illustrated' | 'card';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: IconComponent = FileText,
  title,
  description,
  action,
  secondaryAction,
  image,
  variant = 'default',
  size = 'md',
  className,
  children
}) => {
  // Map old props to new premium component props
  const premiumVariant = variant === 'minimal' ? 'default' : 
                        variant === 'illustrated' ? 'constellation' : 
                        variant === 'card' ? 'aurora' : 'default';
  
  const iconElement = IconComponent ? <IconComponent className="h-12 w-12" /> : undefined;
  
  return (
    <PremiumEmptyState
      title={title}
      description={description}
      icon={iconElement}
      action={action ? {
        label: action.label,
        onClick: action.onClick
      } : undefined}
      variant={premiumVariant}
      className={className}
    />
  );
};

// Contract-specific empty states
export const EmptyContracts: React.FC<{
  variant?: 'all' | 'filtered' | 'draft' | 'active' | 'expired' | 'archived';
  onCreateContract?: () => void;
  onClearFilters?: () => void;
  className?: string;
}> = ({ variant = 'all', onCreateContract, onClearFilters, className }) => {
  const configs = {
    all: {
      title: 'No contracts yet',
      description: 'Get started by creating your first contract. Upload documents and let our AI analyze the key terms automatically.',
      action: onCreateContract ? {
        label: 'Create First Contract',
        onClick: onCreateContract,
        icon: Plus
      } : undefined
    },
    filtered: {
      title: 'No contracts match your filters',
      description: 'Try adjusting your search criteria or filters to find what you\'re looking for.',
      action: onClearFilters ? {
        label: 'Clear Filters',
        onClick: onClearFilters,
        variant: 'outline' as const,
        icon: Filter
      } : undefined
    },
    draft: {
      title: 'No draft contracts',
      description: 'Draft contracts will appear here as you create them.',
      action: onCreateContract ? {
        label: 'Create Draft',
        onClick: onCreateContract,
        icon: Plus
      } : undefined
    },
    active: {
      title: 'No active contracts',
      description: 'Active contracts will be displayed here once they are executed and in force.',
      icon: CheckCircle
    },
    expired: {
      title: 'No expired contracts',
      description: 'Contracts that have passed their end date will appear here.',
      icon: Calendar
    },
    archived: {
      title: 'No archived contracts',
      description: 'Archived contracts will be shown here.',
      icon: Archive
    }
  };

  const config = configs[variant];

  const props: EmptyStateProps & { className?: string } = {
    title: config.title,
    description: config.description,
  };
  
  if ('icon' in config && config.icon) {
    props.icon = config.icon;
  } else {
    props.icon = FileText;
  }
  
  if ('action' in config && config.action) {
    props.action = config.action;
  }
  
  if (className) {
    props.className = className;
  }
  
  return <EmptyState {...props} />;
};

// Vendor-specific empty states
export const EmptyVendors: React.FC<{
  variant?: 'all' | 'filtered' | 'active' | 'inactive' | 'category';
  category?: string;
  onAddVendor?: () => void;
  onClearFilters?: () => void;
  className?: string;
}> = ({ variant = 'all', category, onAddVendor, onClearFilters, className }) => {
  const configs = {
    all: {
      title: 'No vendors yet',
      description: 'Start building your vendor database by adding your first vendor. Track their performance, compliance, and contracts.',
      action: onAddVendor ? {
        label: 'Add First Vendor',
        onClick: onAddVendor,
        icon: Plus
      } : undefined
    },
    filtered: {
      title: 'No vendors match your criteria',
      description: 'Try adjusting your search or filter settings to find the vendors you\'re looking for.',
      action: onClearFilters ? {
        label: 'Clear Filters',
        onClick: onClearFilters,
        variant: 'outline' as const,
        icon: Filter
      } : undefined
    },
    active: {
      title: 'No active vendors',
      description: 'Active vendors with current contracts will appear here.',
    },
    inactive: {
      title: 'No inactive vendors',
      description: 'Vendors without active contracts will be listed here.',
    },
    category: {
      title: `No ${category} vendors`,
      description: `You haven't added any vendors in the ${category} category yet.`,
      action: onAddVendor ? {
        label: `Add ${category} Vendor`,
        onClick: onAddVendor,
        icon: Plus
      } : undefined
    }
  };

  const config = configs[variant];

  const props: EmptyStateProps & { className?: string } = {
    icon: Building,
    title: config.title,
    description: config.description,
  };
  
  if ('action' in config && config.action) {
    props.action = config.action;
  }
  
  if (className) {
    props.className = className;
  }
  
  return <EmptyState {...props} />;
};

// Search empty state
export const EmptySearchResults: React.FC<{
  query: string;
  suggestions?: string[];
  onClearSearch?: () => void;
  onSuggestionClick?: (suggestion: string) => void;
  className?: string;
}> = ({ query, suggestions = [], onClearSearch, onSuggestionClick, className }) => {
  const props: EmptyStateProps & { className?: string } = {
    icon: Search,
    title: `No results for "${query}"`,
    description: "We couldn't find anything matching your search. Try different keywords or check your spelling.",
  };
  
  if (onClearSearch) {
    props.action = {
      label: 'Clear Search',
      onClick: onClearSearch,
      variant: 'outline'
    };
  }
  
  if (className) {
    props.className = className;
  }
  
  return (
    <EmptyState {...props}>
    {suggestions.length > 0 && (
      <div className="mt-4 space-y-2">
        <p className="text-sm text-muted-foreground">Try searching for:</p>
        <div className="flex flex-wrap gap-2 justify-center">
          {suggestions.map((suggestion, index) => (
            <Badge
              key={index}
              variant="outline"
              className="cursor-pointer hover:bg-muted"
              onClick={() => onSuggestionClick?.(suggestion)}
            >
              {suggestion}
            </Badge>
          ))}
        </div>
      </div>
    )}
    </EmptyState>
  );
};

// Analytics empty state
export const EmptyAnalytics: React.FC<{
  type?: 'no-data' | 'loading' | 'error';
  onRefresh?: () => void;
  className?: string;
}> = ({ type = 'no-data', onRefresh, className }) => {
  const configs = {
    'no-data': {
      title: 'No data available',
      description: 'Analytics will appear here once you have contracts and vendor data to analyze.',
      icon: BarChart3
    },
    loading: {
      title: 'Generating analytics...',
      description: 'Please wait while we process your data to generate insights.',
      icon: Sparkles
    },
    error: {
      title: 'Unable to load analytics',
      description: 'There was an error loading your analytics data. Please try again.',
      icon: AlertTriangle,
      action: onRefresh ? {
        label: 'Retry',
        onClick: onRefresh,
        icon: ArrowRight
      } : undefined
    }
  };

  const config = configs[type];

  const props: EmptyStateProps & { className?: string } = {
    icon: config.icon,
    title: config.title,
    description: config.description,
  };
  
  if ('action' in config && config.action) {
    props.action = config.action;
  }
  
  if (className) {
    props.className = className;
  }
  
  return <EmptyState {...props} />;
};

// Notifications empty state
export const EmptyNotifications: React.FC<{
  variant?: 'all' | 'unread' | 'type';
  type?: string;
  className?: string;
}> = ({ variant = 'all', type, className }) => {
  const configs = {
    all: {
      title: 'No notifications',
      description: 'You\'re all caught up! Notifications about contracts, vendors, and system updates will appear here.',
      icon: CheckCircle
    },
    unread: {
      title: 'No unread notifications',
      description: 'You\'ve read all your notifications. Great job staying on top of things!',
      icon: CheckCircle
    },
    type: {
      title: `No ${type} notifications`,
      description: `You don't have any ${type} notifications at the moment.`,
      icon: Bell
    }
  };

  const config = configs[variant];

  const props: EmptyStateProps & { className?: string; size?: string; variant?: string } = {
    icon: config.icon,
    title: config.title,
    description: config.description,
    size: "sm",
    variant: "minimal",
  };
  
  if (className) {
    props.className = className;
  }
  
  return <EmptyState {...props} />;
};

// File upload empty state
export const EmptyFileUpload: React.FC<{
  onUpload?: () => void;
  acceptedTypes?: string[];
  maxSize?: string;
  className?: string;
}> = ({ onUpload, acceptedTypes = ['PDF', 'DOC', 'DOCX'], maxSize = '10MB', className }) => {
  const props: EmptyStateProps & { className?: string; variant?: string } = {
    icon: Upload,
    title: "Upload your contract",
    description: `Drag and drop your contract file here, or click to browse. Accepted formats: ${acceptedTypes.join(', ')}. Max size: ${maxSize}.`,
    variant: "card",
  };
  
  if (onUpload) {
    props.action = {
      label: 'Choose File',
      onClick: onUpload,
      icon: Upload
    };
  }
  
  if (className) {
    props.className = cn('border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors', className);
  }
  
  return <EmptyState {...props} />;
};

// Permission denied empty state
export const EmptyPermissions: React.FC<{
  resource: string;
  action?: string;
  onRequestAccess?: () => void;
  className?: string;
}> = ({ resource, action = 'access', onRequestAccess, className }) => {
  const props: EmptyStateProps & { className?: string; variant?: string } = {
    icon: AlertTriangle,
    title: "Access restricted",
    description: `You don't have permission to ${action} ${resource}. Contact your administrator if you need access.`,
  };
  
  if (onRequestAccess) {
    props.action = {
      label: 'Request Access',
      onClick: onRequestAccess,
      variant: 'outline'
    };
  }
  
  if (className) {
    props.className = className;
  }
  
  return <EmptyState {...props} />;
};

// Coming soon empty state
export const ComingSoon: React.FC<{
  feature: string;
  description?: string;
  timeline?: string;
  onNotifyMe?: () => void;
  className?: string;
}> = ({ feature, description, timeline, onNotifyMe, className }) => {
  const props: EmptyStateProps & { className?: string; children?: React.ReactNode } = {
    icon: Star,
    title: `${feature} coming soon`,
    description: description || `We're working hard to bring you ${feature}. ${timeline ? `Expected ${timeline}.` : ''}`,
  };
  
  if (onNotifyMe) {
    props.action = {
      label: 'Notify Me',
      onClick: onNotifyMe,
      variant: 'outline',
      icon: Bell
    };
  }
  
  if (className) {
    props.className = className;
  }
  
  if (timeline) {
    props.children = (
      <Badge variant="outline" className="mt-2">
        {timeline}
      </Badge>
    );
  }
  
  return <EmptyState {...props} />;
};

// Maintenance empty state
export const MaintenanceMode: React.FC<{
  title?: string;
  description?: string;
  expectedDuration?: string;
  onCheckStatus?: () => void;
  className?: string;
}> = ({ 
  title = 'System maintenance',
  description = 'We\'re performing scheduled maintenance to improve your experience.',
  expectedDuration,
  onCheckStatus,
  className 
}) => {
  const emptyStateProps: Partial<EmptyStateProps> = {
    icon: Settings,
    title,
    description: `${description} ${expectedDuration ? `Expected completion: ${expectedDuration}.` : ''}`,
    variant: "card",
    size: "lg",
  };
  
  if (onCheckStatus) {
    emptyStateProps.action = {
      label: 'Check Status',
      onClick: onCheckStatus,
      variant: 'outline' as const
    };
  }
  
  if (className) {
    emptyStateProps.className = className;
  }
  
  return (
    <EmptyState {...emptyStateProps}>
    {expectedDuration && (
      <div className="flex items-center gap-2 mt-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          Estimated completion: {expectedDuration}
        </span>
      </div>
    )}
    </EmptyState>
  );
};

export default EmptyState;
'use client';

import React, { useEffect, useState } from 'react';
import { Toaster, toast } from 'sonner';
import { 
  CheckCircle, 
  AlertCircle, 
  Info, 
  AlertTriangle, 
  X, 
  Loader2,
  ExternalLink,
  Copy,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Enhanced toast types
export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading' | 'promise';

export interface ToastAction {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'destructive' | 'outline';
}

export interface CustomToastOptions {
  title?: string ;
  description?: string  ;
  duration?: number ;
  action?: ToastAction;
  onDismiss?: () => void;
  dismissible?: boolean;
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  className?: string ;
  id?: string | number ;
  data?: Record<string, any>;
}

export interface PromiseToastOptions {
  loading: string;
  success: string | ((data: unknown) => string);
  error: string | ((error: unknown) => string);
  duration?: {
    loading?: number;
    success?: number;
    error?: number;
  };
}

// Custom toast component for enhanced functionality
const CustomToast = ({ 
  type, 
  title, 
  description, 
  action, 
  onDismiss, 
  dismissible = true,
  className,
  data 
}: {
  type: ToastType;
  title?: string;
  description?: string;
  action?: ToastAction;
  onDismiss?: () => void;
  dismissible?: boolean;
  className?: string;
  data?: Record<string, unknown>;
}) => {
  const iconMap = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
    loading: Loader2,
    promise: Info,
  };

  const colorMap = {
    success: 'text-green-600 bg-green-50 border-green-200',
    error: 'text-red-600 bg-red-50 border-red-200',
    warning: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    info: 'text-blue-600 bg-blue-50 border-blue-200',
    loading: 'text-blue-600 bg-blue-50 border-blue-200',
    promise: 'text-purple-600 bg-purple-50 border-purple-200',
  };

  const IconComponent = iconMap[type];

  return (
    <div className={cn(
      'flex items-start gap-3 p-4 border rounded-lg shadow-lg max-w-md',
      colorMap[type],
      className
    )}>
      <IconComponent 
        className={cn(
          'h-5 w-5 flex-shrink-0 mt-0.5',
          type === 'loading' && 'animate-spin'
        )} 
      />
      
      <div className="flex-1 min-w-0">
        {title && (
          <p className="font-medium text-sm mb-1">{title}</p>
        )}
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
        
        {action && (
          <div className="mt-3">
            <Button
              size="sm"
              variant={action.variant || 'default'}
              onClick={action.onClick}
              className="h-7"
            >
              {action.label}
            </Button>
          </div>
        )}
      </div>

      {dismissible && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="h-6 w-6 p-0 opacity-70 hover:opacity-100 flex-shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

// Enhanced toast functions
export const showToast = {
  success: (message: string, options: CustomToastOptions) => {
    return toast.custom(
      (t: string | number) => (
        <CustomToast
          type="success"
          {...(options?.title && { title: options.title })}
          description={message}
          {...(options?.action && { action: options.action })}
          onDismiss={() => { toast.dismiss(t); }}
          {...(options?.dismissible !== undefined && { dismissible: options.dismissible })}
          {...(options?.className && { className: options.className })}
          {...(options?.data && { data: options.data })}
        />
      ),
      {
        duration: options?.duration || 4000,
        ...(options?.id && { id: options.id }),
      }
    );
  },

  error: (message: string, options?: CustomToastOptions) => {
    return toast.custom(
      (t: string | number) => (
        <CustomToast
          type="error"
          title={options?.title || 'Error'}
          description={message}
          {...(options?.action && { action: options.action })}
          onDismiss={() => { toast.dismiss(t); }}
          {...(options?.dismissible !== undefined && { dismissible: options.dismissible })}
          {...(options?.className && { className: options.className })}
          {...(options?.data && { data: options.data })}
        />
      ),
      {
        duration: options?.duration || 6000,
        ...(options?.id && { id: options.id }),
      }
    );
  },

  warning: (message: string, options?: CustomToastOptions) => {
    return toast.custom(
      (t: string | number) => (
        <CustomToast
          type="warning"
          title={options?.title || 'Warning'}
          description={message}
          {...(options?.action && { action: options.action })}
          onDismiss={() => { toast.dismiss(t); }}
          {...(options?.dismissible !== undefined && { dismissible: options.dismissible })}
          {...(options?.className && { className: options.className })}
          {...(options?.data && { data: options.data })}
        />
      ),
      {
        duration: options?.duration || 5000,
        ...(options?.id && { id: options.id }),
      }
    );
  },

  info: (message: string, options?: CustomToastOptions) => {
    return toast.custom(
      (t: string | number) => (
        <CustomToast
          type="info"
          {...(options?.title && { title: options.title })}
          description={message}
          {...(options?.action && { action: options.action })}
          onDismiss={() => { toast.dismiss(t); }}
          {...(options?.dismissible !== undefined && { dismissible: options.dismissible })}
          {...(options?.className && { className: options.className })}
          {...(options?.data && { data: options.data })}
        />
      ),
      {
        duration: options?.duration || 4000,
        ...(options?.id && { id: options.id }),
      }
    );
  },

  loading: (message: string, options?: CustomToastOptions) => {
    return toast.custom(
      (t: string | number) => (
        <CustomToast
          type="loading"
          {...(options?.title && { title: options.title })}
          description={message}
          onDismiss={() => { toast.dismiss(t); }}
          dismissible={options?.dismissible !== false}
          {...(options?.className && { className: options.className })}
          {...(options?.data && { data: options.data })}
        />
      ),
      {
        duration: options?.duration || Infinity,
        ...(options?.id && { id: options.id }),
      }
    );
  },

  promise: <T,>(
    promise: Promise<T>,
    options: PromiseToastOptions
  ) => {
    return toast.promise(promise, {
      loading: options.loading,
      success: (data) => {
        return typeof options.success === 'function' 
          ? options.success(data) 
          : options.success;
      },
      error: (error) => {
        return typeof options.error === 'function' 
          ? options.error(error) 
          : options.error;
      },
    });
  },

  dismiss: (toastId?: string | number) => {
    toast.dismiss(toastId);
  },

  dismissAll: () => {
    toast.dismiss();
  },
};

// Specialized toast functions for common use cases
export const contractToasts = {
  created: (contractTitle: string) => {
    showToast.success('Contract created successfully', {
      title: 'Success',
      description: `"${contractTitle}" has been created and is ready for review.`,
      action: {
        label: 'View Contract',
        onClick: () => {
          // Navigate to contract details
          console.log('Navigate to contract');
        }
      }
    });
  },

  updated: (contractTitle: string) => {
    showToast.success('Contract updated', {
      description: `"${contractTitle}" has been saved.`,
    });
  },

  deleted: (contractTitle: string) => {
    showToast.info('Contract deleted', {
      description: `"${contractTitle}" has been moved to archive.`,
      action: {
        label: 'Undo',
        onClick: () => {
          // Implement undo functionality
          console.log('Undo delete');
        },
        variant: 'outline'
      }
    });
  },

  expiring: (contractTitle: string, daysLeft: number) => {
    showToast.warning('Contract expiring soon', {
      description: `"${contractTitle}" expires in ${daysLeft} days.`,
      action: {
        label: 'Review',
        onClick: () => {
          // Navigate to contract renewal
          console.log('Navigate to renewal');
        }
      },
      duration: 8000
    });
  },

  analysisComplete: (contractTitle: string) => {
    showToast.success('Analysis complete', {
      description: `AI analysis for "${contractTitle}" is ready.`,
      action: {
        label: 'View Results',
        onClick: () => {
          // Navigate to analysis results
          console.log('View analysis');
        }
      }
    });
  },

  uploadProgress: (fileName: string) => {
    return showToast.loading(`Uploading "${fileName}"...`, {
      title: 'Upload in progress',
      dismissible: false
    });
  },
};

export const vendorToasts = {
  created: (vendorName: string) => {
    showToast.success('Vendor added successfully', {
      description: `${vendorName} has been added to your vendor database.`,
    });
  },

  updated: (vendorName: string) => {
    showToast.success('Vendor updated', {
      description: `${vendorName} information has been saved.`,
    });
  },

  riskAlert: (vendorName: string, riskLevel: string) => {
    showToast.warning('Vendor risk alert', {
      description: `${vendorName} has been flagged as ${riskLevel} risk.`,
      action: {
        label: 'Review',
        onClick: () => {
          // Navigate to vendor risk assessment
          console.log('Review risk');
        }
      },
      duration: 10000
    });
  },

  complianceIssue: (vendorName: string) => {
    showToast.error('Compliance issue detected', {
      description: `${vendorName} has compliance issues that need attention.`,
      action: {
        label: 'View Details',
        onClick: () => {
          // Navigate to compliance details
          console.log('View compliance');
        }
      },
      duration: 0 // Persistent until dismissed
    });
  },
};

export const systemToasts = {
  offline: () => {
    showToast.error('Connection lost', {
      description: 'You are currently offline. Some features may not be available.',
      dismissible: false,
      id: 'offline-toast'
    });
  },

  online: () => {
    showToast.success('Connection restored', {
      description: 'You are back online.',
      id: 'online-toast'
    });
    showToast.dismiss('offline-toast');
  },

  maintenanceMode: (message: string) => {
    showToast.warning('Maintenance notice', {
      description: message,
      action: {
        label: 'Learn More',
        onClick: () => {
          window.open('/maintenance-info', '_blank');
        }
      },
      duration: 0 // Persistent
    });
  },

  sessionExpiring: (minutesLeft: number) => {
    showToast.warning('Session expiring', {
      description: `Your session will expire in ${minutesLeft} minutes.`,
      action: {
        label: 'Extend Session',
        onClick: () => {
          // Refresh session
          console.log('Extend session');
        }
      },
      duration: 30000 // 30 seconds
    });
  },

  autoSaved: () => {
    showToast.info('Draft saved', {
      description: 'Your changes have been automatically saved.',
      duration: 2000
    });
  },

  exportReady: (fileName: string, downloadUrl: string) => {
    showToast.success('Export completed', {
      description: `${fileName} is ready for download.`,
      action: {
        label: 'Download',
        onClick: () => {
          window.open(downloadUrl, '_blank');
        }
      },
      duration: 10000
    });
  },

  copyToClipboard: (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      showToast.success('Copied to clipboard', {
        duration: 2000
      });
    }).catch(() => {
      showToast.error('Failed to copy', {
        description: 'Please copy manually.',
        duration: 3000
      });
    });
  },
};

// Toast provider component
export const ToastProvider: React.FC<{
  children: React.ReactNode;
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  expand?: boolean;
  richColors?: boolean;
  closeButton?: boolean;
}> = ({ 
  children, 
  position = 'top-right',
  expand = true,
  richColors = true,
  closeButton = true 
}) => {
  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => systemToasts.online();
    const handleOffline = () => systemToasts.offline();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <>
      {children}
      <Toaster
        position={position}
        expand={expand}
        richColors={richColors}
        closeButton={closeButton}
        toastOptions={{
          duration: 4000,
          className: 'font-sans',
          style: {
            background: 'hsl(var(--background))',
            color: 'hsl(var(--foreground))',
            border: '1px solid hsl(var(--border))',
          },
        }}
      />
    </>
  );
};

export default ToastProvider;
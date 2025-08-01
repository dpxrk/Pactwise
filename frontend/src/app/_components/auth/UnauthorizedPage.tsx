'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { 
  Shield, 
  ArrowLeft, 
  Mail, 
  Home, 
  Users, 
  AlertTriangle,
  Lock,
  UserX,
  Building,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

// Different types of unauthorized scenarios
export type UnauthorizedReason = 
  | 'insufficient_permissions'
  | 'role_required'
  | 'enterprise_access'
  | 'resource_ownership'
  | 'feature_disabled'
  | 'maintenance_mode'
  | 'account_suspended'
  | 'subscription_required';

export interface UnauthorizedPageProps {
  reason?: UnauthorizedReason;
  requiredRole?: string;
  resource?: string;
  action?: string;
  enterprise?: string;
  customMessage?: string;
  customDescription?: string;
  showContactSupport?: boolean;
  showRequestAccess?: boolean;
  showGoBack?: boolean;
  onRequestAccess?: () => void;
  onContactSupport?: () => void;
  className?: string;
}

// Configuration for different unauthorized scenarios
const unauthorizedConfigs: Record<UnauthorizedReason, {
  icon: typeof Shield;
  title: string;
  defaultDescription: string;
  severity: 'error' | 'warning' | 'info';
  showRequestAccess?: boolean;
  showContactSupport?: boolean;
}> = {
  insufficient_permissions: {
    icon: Shield,
    title: 'Access Denied',
    defaultDescription: 'You don\'t have sufficient permissions to access this resource.',
    severity: 'error' as const,
    showRequestAccess: true,
  },
  role_required: {
    icon: Users,
    title: 'Higher Role Required',
    defaultDescription: 'This feature requires elevated permissions.',
    severity: 'warning' as const,
    showRequestAccess: true,
  },
  enterprise_access: {
    icon: Building,
    title: 'Enterprise Access Required',
    defaultDescription: 'You need to be a member of this enterprise to access this resource.',
    severity: 'error' as const,
    showContactSupport: true,
  },
  resource_ownership: {
    icon: Lock,
    title: 'Resource Access Restricted',
    defaultDescription: 'You can only access resources you created or have been granted access to.',
    severity: 'info' as const,
    showRequestAccess: true,
  },
  feature_disabled: {
    icon: AlertTriangle,
    title: 'Feature Unavailable',
    defaultDescription: 'This feature is currently disabled or not available for your account.',
    severity: 'warning' as const,
    showContactSupport: true,
  },
  maintenance_mode: {
    icon: RefreshCw,
    title: 'System Maintenance',
    defaultDescription: 'This feature is temporarily unavailable due to system maintenance.',
    severity: 'info' as const,
    showContactSupport: false,
  },
  account_suspended: {
    icon: UserX,
    title: 'Account Suspended',
    defaultDescription: 'Your account has been suspended. Please contact support for assistance.',
    severity: 'error' as const,
    showContactSupport: true,
  },
  subscription_required: {
    icon: Shield,
    title: 'Subscription Required',
    defaultDescription: 'This feature requires an active subscription or higher plan.',
    severity: 'info' as const,
    showContactSupport: true,
  },
};

export const UnauthorizedPage: React.FC<UnauthorizedPageProps> = ({
  reason = 'insufficient_permissions',
  requiredRole,
  resource,
  action = 'access',
  enterprise,
  customMessage,
  customDescription,
  showContactSupport = true,
  showRequestAccess = true,
  showGoBack = true,
  onRequestAccess,
  onContactSupport,
  className
}) => {
  const router = useRouter();
  const { user } = useUser();
  
  const config = unauthorizedConfigs[reason];
  const IconComponent = config.icon;

  // Build dynamic message
  const getTitle = () => {
    if (customMessage) return customMessage;
    
    if (reason === 'role_required' && requiredRole) {
      return `${requiredRole.charAt(0).toUpperCase() + requiredRole.slice(1)} Role Required`;
    }
    
    return config.title;
  };

  const getDescription = () => {
    if (customDescription) return customDescription;
    
    let description = config.defaultDescription;
    
    if (resource) {
      description = `You don't have permission to ${action} ${resource}.`;
    }
    
    if (requiredRole) {
      description += ` This action requires ${requiredRole} level access or higher.`;
    }
    
    if (enterprise) {
      description += ` You need to be a member of ${enterprise} enterprise.`;
    }

    return description;
  };

  // Handlers
  const handleGoBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/dashboard');
    }
  };

  const handleGoHome = () => {
    router.push('/dashboard');
  };

  const handleRequestAccess = () => {
    if (onRequestAccess) {
      onRequestAccess();
    } else {
      // Default request access behavior - could open a modal or send to a form
      const subject = `Access Request: ${resource || 'Feature'}`;
      const body = `I would like to request access to ${resource || 'this feature'}.\n\nUser: ${user?.emailAddresses[0]?.emailAddress}\nRequired Action: ${action}\nRequired Role: ${requiredRole || 'N/A'}`;
      const mailtoLink = `mailto:support@pactwise.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(mailtoLink, '_blank');
    }
  };

  const handleContactSupport = () => {
    if (onContactSupport) {
      onContactSupport();
    } else {
      // Default contact support behavior
      const subject = `Support Request: Access Issue`;
      const body = `I'm experiencing an access issue.\n\nUser: ${user?.emailAddresses[0]?.emailAddress}\nReason: ${reason}\nResource: ${resource || 'N/A'}\nAction: ${action}`;
      const mailtoLink = `mailto:support@pactwise.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(mailtoLink, '_blank');
    }
  };

  const severityColors = {
    error: 'text-red-600 bg-red-50 border-red-200',
    warning: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    info: 'text-blue-600 bg-blue-50 border-blue-200',
  };

  return (
    <div className={cn('min-h-[60vh] flex items-center justify-center p-4', className)}>
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className={cn(
              'w-16 h-16 rounded-full flex items-center justify-center',
              severityColors[config.severity]
            )}>
              <IconComponent className="h-8 w-8" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-2xl font-semibold mb-2">
                {getTitle()}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={cn(
                  'text-xs',
                  config.severity === 'error' && 'border-red-200 text-red-700',
                  config.severity === 'warning' && 'border-yellow-200 text-yellow-700',
                  config.severity === 'info' && 'border-blue-200 text-blue-700'
                )}>
                  {reason.replace(/_/g, ' ').toUpperCase()}
                </Badge>
                {requiredRole && (
                  <Badge variant="secondary">
                    {requiredRole.toUpperCase()} REQUIRED
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Main Alert */}
          <Alert className={cn(
            'border-2',
            config.severity === 'error' && 'border-red-200 bg-red-50/50',
            config.severity === 'warning' && 'border-yellow-200 bg-yellow-50/50',
            config.severity === 'info' && 'border-blue-200 bg-blue-50/50'
          )}>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Access Restricted</AlertTitle>
            <AlertDescription className="mt-2">
              {getDescription()}
            </AlertDescription>
          </Alert>

          {/* Additional Information */}
          {(user || enterprise || resource) && (
            <div className="bg-muted/50 p-4 rounded-lg space-y-3">
              <h4 className="font-medium text-sm">Access Details</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {user && (
                  <div>
                    <span className="text-muted-foreground">Current User:</span>
                    <p className="font-medium">{user.emailAddresses[0]?.emailAddress}</p>
                  </div>
                )}
                {resource && (
                  <div>
                    <span className="text-muted-foreground">Requested Resource:</span>
                    <p className="font-medium">{resource}</p>
                  </div>
                )}
                {action && (
                  <div>
                    <span className="text-muted-foreground">Requested Action:</span>
                    <p className="font-medium">{action}</p>
                  </div>
                )}
                {requiredRole && (
                  <div>
                    <span className="text-muted-foreground">Required Role:</span>
                    <p className="font-medium">{requiredRole}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Help Text */}
          <div className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-lg">
            <h4 className="font-medium mb-2">What can I do?</h4>
            <ul className="space-y-1 list-disc list-inside">
              {showRequestAccess && config.showRequestAccess && (
                <li>Request access from your administrator</li>
              )}
              {showContactSupport && config.showContactSupport && (
                <li>Contact support for assistance</li>
              )}
              <li>Check with your team lead about your account permissions</li>
              <li>Return to the dashboard and try a different action</li>
            </ul>
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between">
            <div className="flex gap-3">
              {showGoBack && (
                <Button variant="outline" onClick={handleGoBack}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Go Back
                </Button>
              )}
              <Button variant="outline" onClick={handleGoHome}>
                <Home className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
            </div>

            <div className="flex gap-3">
              {showRequestAccess && config.showRequestAccess && (
                <Button variant="default" onClick={handleRequestAccess}>
                  <Mail className="h-4 w-4 mr-2" />
                  Request Access
                </Button>
              )}
              {showContactSupport && config.showContactSupport && (
                <Button variant="outline" onClick={handleContactSupport}>
                  <Mail className="h-4 w-4 mr-2" />
                  Contact Support
                </Button>
              )}
            </div>
          </div>

          {/* Footer Information */}
          <div className="text-xs text-muted-foreground text-center pt-4 border-t">
            <p>
              If you believe this is an error, please contact your system administrator.
              <br />
              <strong>Error Code:</strong> {reason.toUpperCase()}_{Date.now().toString().slice(-6)}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Specialized unauthorized components for common scenarios
export const InsufficientPermissions: React.FC<{
  resource?: string;
  action?: string;
  requiredRole?: string;
  onRequestAccess?: () => void;
}> = ({ resource, action, requiredRole, onRequestAccess }) => {
  const props: UnauthorizedPageProps = {
    reason: "insufficient_permissions"
  };
  if (resource !== undefined) props.resource = resource;
  if (action !== undefined) props.action = action;
  if (requiredRole !== undefined) props.requiredRole = requiredRole;
  if (onRequestAccess !== undefined) props.onRequestAccess = onRequestAccess;
  
  return <UnauthorizedPage {...props} />;
};

export const RoleRequired: React.FC<{
  requiredRole: string;
  resource?: string;
  onRequestAccess?: () => void;
}> = ({ requiredRole, resource, onRequestAccess }) => {
  const props: UnauthorizedPageProps = {
    reason: "role_required",
    requiredRole
  };
  if (resource !== undefined) props.resource = resource;
  if (onRequestAccess !== undefined) props.onRequestAccess = onRequestAccess;
  
  return <UnauthorizedPage {...props} />;
};

export const EnterpriseAccessRequired: React.FC<{
  enterprise: string;
  onContactSupport?: () => void;
}> = ({ enterprise, onContactSupport }) => {
  const props: UnauthorizedPageProps = {
    reason: "enterprise_access",
    enterprise,
    showRequestAccess: false
  };
  if (onContactSupport !== undefined) props.onContactSupport = onContactSupport;
  
  return <UnauthorizedPage {...props} />;
};

export const ResourceOwnershipRequired: React.FC<{
  resource: string;
  action?: string;
  onRequestAccess?: () => void;
}> = ({ resource, action, onRequestAccess }) => {
  const props: UnauthorizedPageProps = {
    reason: "resource_ownership",
    resource
  };
  if (action !== undefined) props.action = action;
  if (onRequestAccess !== undefined) props.onRequestAccess = onRequestAccess;
  
  return <UnauthorizedPage {...props} />;
};

export const FeatureDisabled: React.FC<{
  feature: string;
  reason?: string;
  onContactSupport?: () => void;
}> = ({ feature, reason, onContactSupport }) => {
  const props: UnauthorizedPageProps = {
    reason: "feature_disabled",
    resource: feature,
    showRequestAccess: false
  };
  if (reason !== undefined) props.customDescription = reason;
  if (onContactSupport !== undefined) props.onContactSupport = onContactSupport;
  
  return <UnauthorizedPage {...props} />;
};

export default UnauthorizedPage;
'use client';

import React, { ReactNode } from 'react';

import type { Id } from '@/types/id.types';

import { AlertTriangle } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

// Using imported Id type from @/types/id.types

// User roles from the permission system
export type UserRole = 'owner' | 'admin' | 'manager' | 'user' | 'viewer';

// Permission types for different operations
export type Permission = 
  // Contract permissions
  | 'contracts:view'
  | 'contracts:create'
  | 'contracts:edit:own'
  | 'contracts:edit:all'
  | 'contracts:delete'
  | 'contracts:approve'
  
  // Vendor permissions
  | 'vendors:view'
  | 'vendors:create'
  | 'vendors:edit:own'
  | 'vendors:edit:all'
  | 'vendors:delete'
  
  // User management permissions
  | 'users:view'
  | 'users:add'
  | 'users:edit'
  | 'users:remove'
  
  // Agent system permissions
  | 'agents:view'
  | 'agents:control'
  | 'agents:insights'
  | 'agents:tasks'
  
  // Analytics permissions
  | 'analytics:view'
  | 'analytics:export'
  
  // Enterprise permissions
  | 'enterprise:settings'
  | 'enterprise:delete'
  
  // System permissions
  | 'system:audit'
  | 'system:maintenance';

// Role hierarchy levels (higher number = more permissions)
const roleHierarchy: Record<UserRole, number> = {
  viewer: 1,
  user: 2,
  manager: 3,
  admin: 4,
  owner: 5,
};

// Permission matrix - defines what permissions each role has
const permissionMatrix: Record<UserRole, Permission[]> = {
  owner: [
    // All permissions
    'contracts:view', 'contracts:create', 'contracts:edit:own', 'contracts:edit:all', 'contracts:delete', 'contracts:approve',
    'vendors:view', 'vendors:create', 'vendors:edit:own', 'vendors:edit:all', 'vendors:delete',
    'users:view', 'users:add', 'users:edit', 'users:remove',
    'agents:view', 'agents:control', 'agents:insights', 'agents:tasks',
    'analytics:view', 'analytics:export',
    'enterprise:settings', 'enterprise:delete',
    'system:audit', 'system:maintenance'
  ],
  admin: [
    // Almost all permissions (cannot modify owners or delete enterprise)
    'contracts:view', 'contracts:create', 'contracts:edit:own', 'contracts:edit:all', 'contracts:delete', 'contracts:approve',
    'vendors:view', 'vendors:create', 'vendors:edit:own', 'vendors:edit:all', 'vendors:delete',
    'users:view', 'users:add', 'users:edit', 'users:remove',
    'agents:view', 'agents:control', 'agents:insights', 'agents:tasks',
    'analytics:view', 'analytics:export',
    'enterprise:settings',
    'system:audit'
  ],
  manager: [
    // Operational management
    'contracts:view', 'contracts:create', 'contracts:edit:own', 'contracts:edit:all', 'contracts:delete', 'contracts:approve',
    'vendors:view', 'vendors:create', 'vendors:edit:own', 'vendors:edit:all', 'vendors:delete',
    'users:view',
    'agents:view', 'agents:insights', 'agents:tasks',
    'analytics:view', 'analytics:export'
  ],
  user: [
    // Standard business user
    'contracts:view', 'contracts:create', 'contracts:edit:own',
    'vendors:view', 'vendors:create', 'vendors:edit:own',
    'analytics:view'
  ],
  viewer: [
    // Read-only access
    'contracts:view',
    'vendors:view',
    'analytics:view'
  ]
};

// Resource ownership check interface
export interface ResourceOwnership {
  resourceType: 'contract' | 'vendor' | 'user';
  resourceId: Id<"contracts"> | Id<"vendors"> | Id<"users">;
  createdBy?: Id<"users">;
}

// Permission gate props
export interface PermissionGateProps {
  children: ReactNode;
  permission?: Permission;
  role?: UserRole;
  minimumRole?: UserRole;
  resource?: ResourceOwnership;
  fallback?: ReactNode;
  showFallback?: boolean;
  enterprise?: Id<"enterprises">;
  onAccessDenied?: () => void;
  loading?: ReactNode;
}

// Hook to get user permissions
export const usePermissions = () => {
  // TODO: Replace with Supabase user data
  const isLoading = false;
  const userRole: UserRole | null = 'admin' as UserRole; // Temporary placeholder
  const userData = { _id: 'temp-user-id', role: 'admin' }; // Temporary placeholder
  const enterpriseId = 'temp-enterprise-id'; // Temporary placeholder

  // Check if user has a specific permission
  const hasPermission = (permission: Permission, resourceOwnership?: ResourceOwnership): boolean => {
    if (!userRole) return false;

    const userPermissions = permissionMatrix[userRole] || [];

    // For ownership-based permissions, check if user owns the resource
    if (permission.includes(':own') && resourceOwnership) {
      if (resourceOwnership.createdBy === userData?._id) {
        return userPermissions.includes(permission);
      }
      // If they don't own it, check if they have 'all' permission
      const allPermission = permission.replace(':own', ':all') as Permission;
      return userPermissions.includes(allPermission);
    }

    return userPermissions.includes(permission);
  };

  // Check if user has minimum role level
  const hasMinimumRole = (minimumRole: UserRole): boolean => {
    if (!userRole) return false;
    return roleHierarchy[userRole] >= roleHierarchy[minimumRole];
  };

  // Check if user has exact role
  const hasRole = (role: UserRole): boolean => {
    return userRole === role;
  };

  // Check if user can modify another user (for user management)
  const canModifyUser = (targetUserRole: UserRole): boolean => {
    if (!userRole) return false;
    
    // Owners can modify anyone
    if (userRole === 'owner') return true;
    
    // Admins can modify anyone except owners
    if (userRole === 'admin' && targetUserRole !== 'owner') return true;
    
    return false;
  };

  return {
    isLoading,
    userRole,
    userData,
    enterpriseId,
    hasPermission,
    hasMinimumRole,
    hasRole,
    canModifyUser,
    permissions: userRole ? permissionMatrix[userRole] : [],
    hierarchyLevel: userRole ? roleHierarchy[userRole] : 0,
  };
};

// Permission check utility
export const checkPermission = (
  userRole: UserRole | undefined,
  permission: Permission,
  resourceOwnership?: ResourceOwnership,
  currentUserId?: Id<"users">
): boolean => {
  if (!userRole) return false;

  const userPermissions = permissionMatrix[userRole] || [];

  // For ownership-based permissions
  if (permission.includes(':own') && resourceOwnership) {
    if (resourceOwnership.createdBy === currentUserId) {
      return userPermissions.includes(permission);
    }
    // Check if they have 'all' permission
    const allPermission = permission.replace(':own', ':all') as Permission;
    return userPermissions.includes(allPermission);
  }

  return userPermissions.includes(permission);
};

// Main PermissionGate component
export const PermissionGate: React.FC<PermissionGateProps> = ({
  children,
  permission,
  role,
  minimumRole,
  resource,
  fallback,
  showFallback = true,
  enterprise,
  onAccessDenied,
  loading
}) => {
  const {
    isLoading,
    enterpriseId,
    hasPermission,
    hasMinimumRole,
    hasRole
  } = usePermissions();

  // Show loading state
  if (isLoading) {
    return <>{loading || <LoadingSpinner />}</>;
  }

  // Check enterprise access if specified
  if (enterprise && enterpriseId !== enterprise) {
    if (onAccessDenied) onAccessDenied();
    return showFallback ? (
      fallback || <EmptyPermissions resource="this enterprise" />
    ) : null;
  }

  // Check role-based access
  let hasAccess = true;

  if (permission) {
    hasAccess = hasPermission(permission, resource);
  } else if (role) {
    hasAccess = hasRole(role);
  } else if (minimumRole) {
    hasAccess = hasMinimumRole(minimumRole);
  }

  // Handle access denied
  if (!hasAccess) {
    if (onAccessDenied) onAccessDenied();
    
    if (!showFallback) return null;

    if (fallback) return <>{fallback}</>;

    // Default fallback based on what was checked
    let resourceName = 'this resource';
    if (permission) {
      const [resourceType] = permission.split(':');
      resourceName = resourceType || 'this resource';
    }

    return <EmptyPermissions resource={resourceName} />;
  }

  return <>{children}</>;
};

// Specialized permission gates for common use cases
export const ContractPermissionGate: React.FC<{
  children: ReactNode;
  action: 'view' | 'create' | 'edit' | 'delete' | 'approve';
  contractId?: Id<"contracts">;
  createdBy?: Id<"users">;
  fallback?: ReactNode;
}> = ({ children, action, contractId, createdBy, fallback }) => {
  const permissionMap = {
    view: 'contracts:view' as Permission,
    create: 'contracts:create' as Permission,
    edit: 'contracts:edit:own' as Permission,
    delete: 'contracts:delete' as Permission,
    approve: 'contracts:approve' as Permission,
  };

  return contractId && createdBy ? (
    <PermissionGate
      permission={permissionMap[action]}
      resource={{
        resourceType: 'contract' as const,
        resourceId: contractId,
        createdBy
      }}
      fallback={fallback}
    >
      {children}
    </PermissionGate>
  ) : (
    <PermissionGate
      permission={permissionMap[action]}
      fallback={fallback}
    >
      {children}
    </PermissionGate>
  );
};

export const VendorPermissionGate: React.FC<{
  children: ReactNode;
  action: 'view' | 'create' | 'edit' | 'delete';
  vendorId?: Id<"vendors">;
  createdBy?: Id<"users">;
  fallback?: ReactNode;
}> = ({ children, action, vendorId, createdBy, fallback }) => {
  const permissionMap = {
    view: 'vendors:view' as Permission,
    create: 'vendors:create' as Permission,
    edit: 'vendors:edit:own' as Permission,
    delete: 'vendors:delete' as Permission,
  };

  return vendorId && createdBy ? (
    <PermissionGate
      permission={permissionMap[action]}
      resource={{
        resourceType: 'vendor' as const,
        resourceId: vendorId,
        createdBy
      }}
      fallback={fallback}
    >
      {children}
    </PermissionGate>
  ) : (
    <PermissionGate
      permission={permissionMap[action]}
      fallback={fallback}
    >
      {children}
    </PermissionGate>
  );
};

export const AdminGate: React.FC<{
  children: ReactNode;
  fallback?: ReactNode;
}> = ({ children, fallback }) => (
  <PermissionGate minimumRole="admin" fallback={fallback}>
    {children}
  </PermissionGate>
);

export const ManagerGate: React.FC<{
  children: ReactNode;
  fallback?: ReactNode;
}> = ({ children, fallback }) => (
  <PermissionGate minimumRole="manager" fallback={fallback}>
    {children}
  </PermissionGate>
);

export const UserGate: React.FC<{
  children: ReactNode;
  fallback?: ReactNode;
}> = ({ children, fallback }) => (
  <PermissionGate minimumRole="user" fallback={fallback}>
    {children}
  </PermissionGate>
);

// Simple permission denied component
const EmptyPermissions: React.FC<{ resource: string }> = ({ resource }) => (
  <Alert variant="destructive" className="m-4">
    <AlertTriangle className="h-4 w-4" />
    <AlertTitle>Access Denied</AlertTitle>
    <AlertDescription>
      You don't have permission to access {resource}. Contact your administrator if you believe this is an error.
    </AlertDescription>
  </Alert>
);

// HOC for component-level permissions
export const withPermission = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  permission: Permission
) => {
  const WithPermissionComponent = (props: P) => (
    <PermissionGate permission={permission}>
      <WrappedComponent {...props} />
    </PermissionGate>
  );

  WithPermissionComponent.displayName = `withPermission(${WrappedComponent.displayName || WrappedComponent.name})`;

  return WithPermissionComponent;
};

export default PermissionGate;

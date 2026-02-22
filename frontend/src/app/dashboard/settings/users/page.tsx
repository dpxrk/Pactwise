'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Briefcase,
  Calendar,
  Clock,
  Crown,
  Edit,
  Eye,
  Filter,
  Loader2,
  Mail,
  MoreHorizontal,
  Power,
  PowerOff,
  Search,
  Settings,
  Shield,
  User,
  UserPlus,
  Users
} from 'lucide-react';
import React, { useCallback, useState } from 'react';
import { toast } from 'sonner';

import { PermissionGate } from '@/app/_components/auth/PermissionGate';
import LoadingSpinner from '@/app/_components/common/LoadingSpinner';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from '@/contexts/AuthContext';
import { format } from '@/lib/date';
import { createClient } from '@/utils/supabase/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EnterpriseUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  role: string;
  department: string | null;
  title: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

interface UsersApiResponse {
  data: Array<Record<string, unknown>>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const supabase = createClient();

/** Map a single snake_case user record from the API to camelCase. */
function mapUser(raw: Record<string, unknown>): EnterpriseUser {
  return {
    id: raw.id as string,
    email: raw.email as string,
    firstName: (raw.first_name as string | null) ?? null,
    lastName: (raw.last_name as string | null) ?? null,
    fullName: (raw.full_name as string | null) ?? null,
    role: (raw.role as string) ?? 'user',
    department: (raw.department as string | null) ?? null,
    title: (raw.title as string | null) ?? null,
    isActive: raw.is_active !== false,
    lastLoginAt: (raw.last_login as string | null) ?? (raw.last_login_at as string | null) ?? null,
    createdAt: (raw.created_at as string) ?? '',
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const UserManagementPage = () => {
  const { userProfile, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Invite dialog
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<string>('user');

  // Get enterpriseId from user profile
  const enterpriseId = userProfile?.enterprise_id;

  // ---------- Fetch users ----------
  const {
    data: usersData,
    isLoading: isDataLoading,
    error,
  } = useQuery<EnterpriseUser[]>({
    queryKey: ['enterprise-users', enterpriseId],
    queryFn: async () => {
      const { data: responseData, error: fnError } = await supabase.functions.invoke('users', {
        method: 'GET',
      });

      if (fnError) throw fnError;

      // The edge function returns { data: [...], pagination: {...} }
      const payload = responseData as UsersApiResponse;
      const rawUsers = payload?.data ?? (Array.isArray(responseData) ? responseData : []);
      return rawUsers.map(mapUser);
    },
    enabled: !!enterpriseId,
  });

  const users = usersData ?? [];

  // ---------- Invite user ----------
  const inviteMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      const { data: responseData, error: fnError } = await supabase.functions.invoke(
        'users/invite',
        {
          method: 'POST',
          body: { email, role },
        },
      );

      if (fnError) throw fnError;
      return responseData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enterprise-users', enterpriseId] });
      toast.success('Invitation sent successfully');
      setIsInviteOpen(false);
      setInviteEmail('');
      setInviteRole('user');
    },
    onError: (err: Error) => {
      toast.error(`Failed to send invitation: ${err.message}`);
    },
  });

  // ---------- Update role ----------
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { data: responseData, error: fnError } = await supabase.functions.invoke(
        `users/${userId}/role`,
        {
          method: 'PATCH',
          body: { role },
        },
      );

      if (fnError) throw fnError;
      return responseData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enterprise-users', enterpriseId] });
      toast.success('User role updated');
    },
    onError: (err: Error) => {
      toast.error(`Failed to update role: ${err.message}`);
    },
  });

  // ---------- Deactivate user ----------
  const deactivateMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data: responseData, error: fnError } = await supabase.functions.invoke(
        `users/${userId}/deactivate`,
        { method: 'POST' },
      );

      if (fnError) throw fnError;
      return responseData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enterprise-users', enterpriseId] });
      toast.success('User deactivated');
    },
    onError: (err: Error) => {
      toast.error(`Failed to deactivate user: ${err.message}`);
    },
  });

  // ---------- Activate user ----------
  const activateMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data: responseData, error: fnError } = await supabase.functions.invoke(
        `users/${userId}/activate`,
        { method: 'POST' },
      );

      if (fnError) throw fnError;
      return responseData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enterprise-users', enterpriseId] });
      toast.success('User activated');
    },
    onError: (err: Error) => {
      toast.error(`Failed to activate user: ${err.message}`);
    },
  });

  // ---------- Handlers ----------
  const handleInvite = useCallback(() => {
    if (!inviteEmail.trim()) {
      toast.error('Email is required');
      return;
    }
    inviteMutation.mutate({ email: inviteEmail.trim(), role: inviteRole });
  }, [inviteEmail, inviteRole, inviteMutation]);

  const handleToggleActive = useCallback(
    (user: EnterpriseUser) => {
      if (user.isActive) {
        deactivateMutation.mutate(user.id);
      } else {
        activateMutation.mutate(user.id);
      }
    },
    [activateMutation, deactivateMutation],
  );

  const handleRoleChange = useCallback(
    (userId: string, newRole: string) => {
      updateRoleMutation.mutate({ userId, role: newRole });
    },
    [updateRoleMutation],
  );

  // ---------- Role config ----------
  const roleConfig = {
    owner: { label: 'Owner', icon: Crown, color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/70 dark:text-purple-300' },
    admin: { label: 'Admin', icon: Shield, color: 'bg-red-100 text-red-800 dark:bg-red-900/70 dark:text-red-300' },
    manager: { label: 'Manager', icon: Settings, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/70 dark:text-blue-300' },
    user: { label: 'User', icon: User, color: 'bg-green-100 text-green-800 dark:bg-green-900/70 dark:text-green-300' },
    viewer: { label: 'Viewer', icon: Eye, color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
  };

  // ---------- Date helpers ----------
  const formatDate = (dateString?: string | null): string => {
    if (!dateString) return 'Never';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  const formatLastLogin = (dateString?: string | null): string => {
    if (!dateString) return 'Never';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

      if (diffInDays === 0) return 'Today';
      if (diffInDays === 1) return 'Yesterday';
      if (diffInDays < 7) return `${diffInDays} days ago`;
      return format(date, 'MMM dd, yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  // ---------- Filtering ----------
  const filteredUsers = users.filter(u => {
    const matchesSearch =
      !searchQuery ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${u.firstName ?? ''} ${u.lastName ?? ''}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.title?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && u.isActive) ||
      (statusFilter === 'inactive' && !u.isActive);

    return matchesSearch && matchesRole && matchesStatus;
  });

  // ---------- Loading / Error states ----------
  if (authLoading || isDataLoading) {
    return (
      <div className="p-6">
        <LoadingSpinner />
      </div>
    );
  }

  if (!enterpriseId) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Configuration Error</AlertTitle>
          <AlertDescription>
            Enterprise information is missing for your user account. Please contact support.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You don&apos;t have permission to view user management. Only owners and admins can access this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // ---------- Render ----------
  return (
    <PermissionGate role="admin">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">User Management</h1>
            <p className="text-muted-foreground">Manage users, roles, and permissions for your enterprise</p>
          </div>
          <Button className="flex items-center gap-2" onClick={() => setIsInviteOpen(true)}>
            <UserPlus className="h-4 w-4" />
            Invite User
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{users.length}</p>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Shield className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{users.filter(u => u.isActive).length}</p>
                  <p className="text-sm text-muted-foreground">Active Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Crown className="h-8 w-8 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{users.filter(u => ['owner', 'admin'].includes(u.role)).length}</p>
                  <p className="text-sm text-muted-foreground">Admins</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">{users.filter(u => u.lastLoginAt && new Date(u.lastLoginAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length}</p>
                  <p className="text-sm text-muted-foreground">Active This Week</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users by name, email, department, or title..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Users ({filteredUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredUsers.map((u) => {
                const roleInfo = roleConfig[u.role as keyof typeof roleConfig] ?? roleConfig.user;
                const RoleIcon = roleInfo.icon;
                const isMutating =
                  deactivateMutation.isPending ||
                  activateMutation.isPending ||
                  updateRoleMutation.isPending;

                return (
                  <div key={u.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-semibold">
                            {(u.firstName?.[0] || u.email[0] || '').toUpperCase()}
                            {(u.lastName?.[0] || u.email[1] || '').toUpperCase()}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">
                              {u.firstName && u.lastName
                                ? `${u.firstName} ${u.lastName}`
                                : u.email}
                            </h3>
                            <Badge className={roleInfo.color}>
                              <RoleIcon className="h-3 w-3 mr-1" />
                              {roleInfo.label}
                            </Badge>
                            {u.isActive ? (
                              <Badge variant="outline" className="text-green-600 border-green-200">
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-red-600 border-red-200">
                                Inactive
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {u.email}
                            </div>
                            {u.department && (
                              <div className="flex items-center gap-1">
                                <Briefcase className="h-3 w-3" />
                                {u.department}
                              </div>
                            )}
                            {u.title && (
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {u.title}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Joined {formatDate(u.createdAt)}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Last login {formatLastLogin(u.lastLoginAt)}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Role change select */}
                        <Select
                          value={u.role}
                          onValueChange={(newRole) => handleRoleChange(u.id, newRole)}
                          disabled={u.role === 'owner' || isMutating}
                        >
                          <SelectTrigger className="w-[130px]" aria-label="Change role">
                            <Edit className="h-3 w-3 mr-1" />
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>

                        {/* Activate / Deactivate */}
                        {u.role !== 'owner' && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isMutating}
                            onClick={() => handleToggleActive(u)}
                            title={u.isActive ? 'Deactivate user' : 'Activate user'}
                          >
                            {u.isActive ? (
                              <PowerOff className="h-4 w-4" />
                            ) : (
                              <Power className="h-4 w-4" />
                            )}
                          </Button>
                        )}

                        <Button variant="outline" size="sm" disabled>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredUsers.length === 0 && (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground">No users found</h3>
                  <p className="text-sm text-muted-foreground">
                    {searchQuery || roleFilter !== 'all' || statusFilter !== 'all'
                      ? 'Try adjusting your search or filters'
                      : 'No users have been added to this enterprise yet'}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Invite User Dialog */}
        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite User</DialogTitle>
              <DialogDescription>
                Send an invitation to add a new user to your enterprise.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email address</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  disabled={inviteMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-role">Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole} disabled={inviteMutation.isPending}>
                  <SelectTrigger id="invite-role">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsInviteOpen(false)} disabled={inviteMutation.isPending}>
                Cancel
              </Button>
              <Button onClick={handleInvite} disabled={inviteMutation.isPending}>
                {inviteMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Send Invitation
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGate>
  );
};

export default UserManagementPage;

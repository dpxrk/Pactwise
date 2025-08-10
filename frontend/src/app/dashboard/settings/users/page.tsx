'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
// import { api } from '../../../../../convex/_generated/api';
// import { Id } from '../../../../../convex/_generated/dataModel';
import { format } from 'date-fns';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { PermissionGate } from '@/app/_components/auth/PermissionGate';

// Icons
import {
  Users,
  Search,
  Filter,
  UserPlus,
  Mail,
  Crown,
  Shield,
  User,
  Eye,
  Settings,
  AlertCircle,
  Calendar,
  Clock,
  Briefcase,
  Phone,
  MoreHorizontal,
  Edit,
  UserMinus
} from 'lucide-react';
import LoadingSpinner from '@/app/_components/common/LoadingSpinner';

const UserManagementPage = () => {
  const { user, userProfile, isLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Get enterpriseId from user profile
  const enterpriseId = userProfile?.enterprise_id;

  // Fetch users data
    const data = null;
  const isLoading = false;
  const error = null;
//     api.users.getEnterpriseUsers,
    enterpriseId ? { enterpriseId } : "skip"
  );

  // Role configuration
  const roleConfig = {
    owner: { label: 'Owner', icon: Crown, color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/70 dark:text-purple-300' },
    admin: { label: 'Admin', icon: Shield, color: 'bg-red-100 text-red-800 dark:bg-red-900/70 dark:text-red-300' },
    manager: { label: 'Manager', icon: Settings, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/70 dark:text-blue-300' },
    user: { label: 'User', icon: User, color: 'bg-green-100 text-green-800 dark:bg-green-900/70 dark:text-green-300' },
    viewer: { label: 'Viewer', icon: Eye, color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Never';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch (e) {
      return 'Invalid date';
    }
  };

  const formatLastLogin = (dateString?: string): string => {
    if (!dateString) return 'Never';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffInDays === 0) return 'Today';
      if (diffInDays === 1) return 'Yesterday';
      if (diffInDays < 7) return `${diffInDays} days ago`;
      return format(date, 'MMM dd, yyyy');
    } catch (e) {
      return 'Invalid date';
    }
  };

  // Filter users based on search and filters
  const filteredUsers = users?.filter(user => {
    const matchesSearch = !searchQuery || 
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.title?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && user.isActive) ||
      (statusFilter === 'inactive' && !user.isActive);

    return matchesSearch && matchesRole && matchesStatus;
  }) || [];

  if (isLoading) {
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
            You don't have permission to view user management. Only owners and admins can access this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <PermissionGate role="admin">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">User Management</h1>
            <p className="text-muted-foreground">Manage users, roles, and permissions for your enterprise</p>
          </div>
          <Button className="flex items-center gap-2">
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
                  <p className="text-2xl font-bold">{users?.length || 0}</p>
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
                  <p className="text-2xl font-bold">{users?.filter(u => u.isActive).length || 0}</p>
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
                  <p className="text-2xl font-bold">{users?.filter(u => ['owner', 'admin'].includes(u.role)).length || 0}</p>
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
                  <p className="text-2xl font-bold">{users?.filter(u => u.lastLoginAt && new Date(u.lastLoginAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length || 0}</p>
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
              {filteredUsers.map((user) => {
                const roleInfo = roleConfig[user.role as keyof typeof roleConfig];
                const RoleIcon = roleInfo.icon;
                
                return (
                  <div key={user._id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-semibold">
                            {(user.firstName?.[0] || user.email[0] || '').toUpperCase()}
                            {(user.lastName?.[0] || user.email[1] || '').toUpperCase()}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">
                              {user.firstName && user.lastName 
                                ? `${user.firstName} ${user.lastName}` 
                                : user.email}
                            </h3>
                            <Badge className={roleInfo.color}>
                              <RoleIcon className="h-3 w-3 mr-1" />
                              {roleInfo.label}
                            </Badge>
                            {user.isActive ? (
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
                              {user.email}
                            </div>
                            {user.department && (
                              <div className="flex items-center gap-1">
                                <Briefcase className="h-3 w-3" />
                                {user.department}
                              </div>
                            )}
                            {user.title && (
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {user.title}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Joined {formatDate(user.createdAt)}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Last login {formatLastLogin(user.lastLoginAt)}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm">
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
      </div>
    </PermissionGate>
  );
};

export default UserManagementPage;
'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
// import { api } from '../../../../convex/_generated/api';
// import { Id } from '../../../../convex/_generated/dataModel';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

// Icons
import {
  Settings,
  Building,
  User,
  Mail,
  Phone,
  MapPin,
  Globe,
  Save,
  AlertCircle,
  CheckCircle,
  Edit,
  Camera,
  Shield,
  Clock,
  Users
} from 'lucide-react';
import LoadingSpinner from '@/app/_components/common/LoadingSpinner';
import { DemoDataManager } from '@/app/_components/demo/DemoDataManager';

const GeneralSettingsPage = () => {
  const { user, userProfile, isLoading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Get enterpriseId from user profile
  const enterpriseId = userProfile?.enterprise_id;

  // Fetch current user context
    const data = null;
  const isDataLoading = false;
  const error = null;
  // api.users.getUserContext,
  // {}
  // );

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    department: '',
    title: '',
  });

  // Mock userContext for now - will be replaced with actual API call
  const userContext = data as any;
  const isLoadingUser = isDataLoading;
  
  React.useEffect(() => {
    if (userProfile) {
      setFormData({
        firstName: userProfile.first_name || '',
        lastName: userProfile.last_name || '',
        email: userProfile.email || '',
        phoneNumber: '', // Phone number would need to be added to the user context
        department: '', // Department would need to be added to the user context
        title: '', // Title would need to be added to the user context
      });
    }
  }, [userProfile]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // In a real implementation, this would call a mutation to update the user profile
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/70 dark:text-purple-300';
      case 'admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900/70 dark:text-red-300';
      case 'manager':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/70 dark:text-blue-300';
      case 'user':
        return 'bg-green-100 text-green-800 dark:bg-green-900/70 dark:text-green-300';
      case 'viewer':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  if (isLoadingUser) {
    return (
      <div className="p-6">
        <LoadingSpinner />
      </div>
    );
  }

  if (!userProfile) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Unable to load user information. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your personal information and account settings
            </p>
          </div>
          <Button
            variant={isEditing ? "outline" : "default"}
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
          >
            <Edit className="h-4 w-4 mr-2" />
            {isEditing ? 'Cancel' : 'Edit'}
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Profile Picture */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-2xl font-semibold">
                  {userProfile.first_name?.[0] || userProfile.email[0]}
                  {userProfile.last_name?.[0] || userProfile.email[1] || ''}
                </span>
              </div>
              {isEditing && (
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                >
                  <Camera className="h-3 w-3" />
                </Button>
              )}
            </div>
            <div>
              <h3 className="font-medium">
                {userProfile.first_name && userProfile.last_name
                  ? `${userProfile.first_name} ${userProfile.last_name}`
                  : userProfile.email}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={getRoleBadgeColor(userProfile.role || 'user')}>
                  {(userProfile.role || 'user').charAt(0).toUpperCase() + (userProfile.role || 'user').slice(1)}
                </Badge>
                {userProfile.is_active !== false ? (
                  <Badge variant="outline" className="text-green-600 border-green-200">
                    Active
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-red-600 border-red-200">
                    Inactive
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Personal Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed here. Update it in your account settings.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                disabled={!isEditing}
                placeholder="Enter phone number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                disabled={!isEditing}
                placeholder="e.g. Engineering, Sales, Marketing"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Job Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                disabled={!isEditing}
                placeholder="e.g. Software Engineer, Sales Manager"
              />
            </div>
          </div>

          {isEditing && (
            <>
              <Separator />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-current mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Enterprise Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Enterprise Information
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Information about your enterprise. Contact an admin to make changes.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {userProfile?.enterprise_id ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Enterprise Name</Label>
                <p className="text-sm font-medium mt-1">{userProfile.enterprise_id}</p>
              </div>
              <div>
                <Label>Domain</Label>
                <p className="text-sm font-medium mt-1">Not set</p>
              </div>
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Enterprise information is not available.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Demo Data Manager */}
      {enterpriseId && (userProfile?.role === 'owner' || userProfile?.role === 'admin') && (
        <DemoDataManager enterpriseId={enterpriseId as any} />
      )}

      {/* Account Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Account Security
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Manage your account security settings
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium">Two-Factor Authentication</h4>
              <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
            </div>
            <Button variant="outline" size="sm">
              Configure
            </Button>
          </div>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium">Password</h4>
              <p className="text-sm text-muted-foreground">Change your account password</p>
            </div>
            <Button variant="outline" size="sm">
              Change Password
            </Button>
          </div>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium">Active Sessions</h4>
              <p className="text-sm text-muted-foreground">Manage devices that are signed into your account</p>
            </div>
            <Button variant="outline" size="sm">
              View Sessions
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GeneralSettingsPage;
'use client';

import { User, Edit, Camera, Save, Building, Shield, AlertCircle } from 'lucide-react';
import React, { useState, useCallback } from 'react';

// UI Components
import { DemoDataManager } from '@/app/_components/demo/DemoDataManager';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from '@/contexts/AuthContext';

// Helper function moved outside component to prevent recreation
const getRoleBadgeColor = (role: string) => {
  switch (role) {
    case 'owner':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/70 dark:text-purple-300';
    case 'admin':
      return 'bg-error-100 text-error-800 dark:bg-error-900/70 dark:text-error-300';
    case 'manager':
      return 'bg-info-100 text-info-800 dark:bg-info-900/70 dark:text-info-300';
    case 'user':
      return 'bg-success-100 text-success-800 dark:bg-success-900/70 dark:text-success-300';
    case 'viewer':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  }
};

const GeneralSettingsPage = () => {
  const { userProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Get enterpriseId from user profile
  const enterpriseId = userProfile?.enterprise_id;

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    department: '',
    title: '',
  });

  const isLoadingUser = false;
  
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

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      // In a real implementation, this would call a mutation to update the user profile
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      setIsEditing(false);
    } catch (_error) {
      console.error('Failed to save settings:', _error);
    } finally {
      setIsSaving(false);
    }
  }, []);

  if (isLoadingUser) {
    return (
      <div className="flex items-center justify-center p-8 min-h-screen bg-ghost-100">
        <div className="border border-ghost-300 bg-white p-8 text-center" role="status" aria-label="Loading">
          <div className="w-10 h-10 border-t-2 border-purple-900 animate-spin mx-auto mb-2" aria-hidden="true" />
          <p className="font-mono text-xs uppercase text-ghost-700">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-ghost-100 p-6">
        <div className="border-l-4 border-error-600 bg-white border border-ghost-300 p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-error-600" />
            <div>
              <div className="font-mono text-xs uppercase text-ghost-700 mb-1">ERROR</div>
              <div className="text-sm text-ghost-900">
                Unable to load user information. Please try refreshing the page.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ghost-100">
      {/* Top Status Bar */}
      <div className="border-b border-ghost-300 bg-white px-6 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-success-500 animate-pulse" />
              <span className="font-mono text-xs text-ghost-700 uppercase">USER SETTINGS</span>
            </div>
            <div className="font-mono text-xs text-ghost-600">
              LAST UPDATED: {new Date().toLocaleTimeString()}
            </div>
          </div>
          <div className="flex items-center gap-6 font-mono text-xs">
            <div className="flex items-center gap-2">
              <span className="text-ghost-600 uppercase">User ID:</span>
              <span className="font-semibold text-purple-900">{userProfile?.id?.slice(0, 8) || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-ghost-600 uppercase">Role:</span>
              <span className="font-semibold text-purple-900">{userProfile?.role?.toUpperCase() || 'USER'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Profile Section */}
        <div className="border border-ghost-300 bg-white">
          <div className="border-b border-ghost-300 px-6 py-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <User className="h-4 w-4 text-purple-900" />
                <h2 className="font-mono text-xs uppercase text-ghost-700">PROFILE INFORMATION</h2>
              </div>
              <p className="font-mono text-xs text-ghost-600">
                Manage your personal information and account settings
              </p>
            </div>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`border ${isEditing ? 'border-ghost-300 bg-white' : 'border-purple-900 bg-purple-900 text-white'} px-4 py-2 font-mono text-xs hover:bg-ghost-50 hover:border-purple-900 flex items-center gap-2`}
            >
              <Edit className="h-3 w-3" />
              {isEditing ? 'CANCEL' : 'EDIT'}
            </button>
          </div>
          <div className="p-6 space-y-6">
            {/* Profile Picture */}
            <div className="flex items-center gap-4 pb-6 border-b border-ghost-200">
              <div className="relative">
                <div className="w-20 h-20 border-2 border-purple-900 flex items-center justify-center bg-purple-50">
                  <span className="text-2xl font-bold text-purple-900 font-mono">
                    {userProfile.first_name?.[0] || userProfile.email[0]}
                    {userProfile.last_name?.[0] || userProfile.email[1] || ''}
                  </span>
                </div>
                {isEditing && (
                  <button className="absolute -bottom-2 -right-2 h-8 w-8 border border-ghost-300 bg-white p-0 flex items-center justify-center hover:border-purple-900">
                    <Camera className="h-3 w-3" />
                  </button>
                )}
              </div>
              <div>
                <h3 className="font-bold text-purple-900">
                  {userProfile.first_name && userProfile.last_name
                    ? `${userProfile.first_name} ${userProfile.last_name}`
                    : userProfile.email}
                </h3>
                <div className="flex items-center gap-2 mt-2">
                  <span className="font-mono text-xs px-2 py-1 border border-purple-900 text-purple-900 bg-purple-50">
                    {(userProfile.role || 'user').toUpperCase()}
                  </span>
                  {true ? (
                    <span className="font-mono text-xs px-2 py-1 border border-success-600 text-success-600">
                      ACTIVE
                    </span>
                  ) : (
                    <span className="font-mono text-xs px-2 py-1 border border-error-600 text-error-600">
                      INACTIVE
                    </span>
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
              <div className="pt-6 border-t border-ghost-200">
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="border border-ghost-300 bg-white px-4 py-2 font-mono text-xs text-ghost-700 hover:bg-ghost-50 hover:border-purple-900"
                  >
                    CANCEL
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="border border-purple-900 bg-purple-900 text-white px-4 py-2 font-mono text-xs hover:bg-purple-800 flex items-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <div className="animate-spin h-3 w-3 border-t-2 border-b-2 border-white" aria-hidden="true"></div>
                        <span className="sr-only">Saving...</span>
                        SAVING...
                      </>
                    ) : (
                      <>
                        <Save className="h-3 w-3" />
                        SAVE CHANGES
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Enterprise Information */}
        <div className="border border-ghost-300 bg-white">
          <div className="border-b border-ghost-300 px-6 py-4">
            <div className="flex items-center gap-2 mb-1">
              <Building className="h-4 w-4 text-purple-900" />
              <h2 className="font-mono text-xs uppercase text-ghost-700">ENTERPRISE INFORMATION</h2>
            </div>
            <p className="font-mono text-xs text-ghost-600">
              Information about your enterprise. Contact an admin to make changes.
            </p>
          </div>
          <div className="p-6 space-y-4">
            {userProfile?.enterprise_id ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="font-mono text-xs uppercase text-ghost-600 block mb-1">ENTERPRISE NAME</label>
                  <p className="font-mono text-sm text-purple-900 font-semibold">{userProfile.enterprise_id}</p>
                </div>
                <div>
                  <label className="font-mono text-xs uppercase text-ghost-600 block mb-1">DOMAIN</label>
                  <p className="font-mono text-sm text-ghost-700">Not set</p>
                </div>
              </div>
            ) : (
              <div className="border-l-4 border-purple-900 bg-purple-50 border border-ghost-300 p-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-4 w-4 text-purple-900" />
                  <p className="font-mono text-xs text-ghost-900">Enterprise information is not available.</p>
                </div>
              </div>
            )}
          </div>
        </div>

      {/* Demo Data Manager */}
      {enterpriseId && (userProfile?.role === 'owner' || userProfile?.role === 'admin') && (
        <DemoDataManager enterpriseId={enterpriseId as any} />
      )}

        {/* Account Security */}
        <div className="border border-ghost-300 bg-white">
          <div className="border-b border-ghost-300 px-6 py-4">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-4 w-4 text-purple-900" />
              <h2 className="font-mono text-xs uppercase text-ghost-700">ACCOUNT SECURITY</h2>
            </div>
            <p className="font-mono text-xs text-ghost-600">
              Manage your account security settings
            </p>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between p-4 border border-ghost-300 bg-ghost-50">
              <div>
                <h4 className="font-mono text-xs uppercase text-ghost-900 mb-1">TWO-FACTOR AUTHENTICATION</h4>
                <p className="font-mono text-xs text-ghost-600">Add an extra layer of security to your account</p>
              </div>
              <button className="border border-ghost-300 bg-white px-4 py-2 font-mono text-xs text-ghost-700 hover:bg-ghost-50 hover:border-purple-900">
                CONFIGURE
              </button>
            </div>
            <div className="flex items-center justify-between p-4 border border-ghost-300 bg-ghost-50">
              <div>
                <h4 className="font-mono text-xs uppercase text-ghost-900 mb-1">PASSWORD</h4>
                <p className="font-mono text-xs text-ghost-600">Change your account password</p>
              </div>
              <button className="border border-ghost-300 bg-white px-4 py-2 font-mono text-xs text-ghost-700 hover:bg-ghost-50 hover:border-purple-900">
                CHANGE PASSWORD
              </button>
            </div>
            <div className="flex items-center justify-between p-4 border border-ghost-300 bg-ghost-50">
              <div>
                <h4 className="font-mono text-xs uppercase text-ghost-900 mb-1">ACTIVE SESSIONS</h4>
                <p className="font-mono text-xs text-ghost-600">Manage devices that are signed into your account</p>
              </div>
              <button className="border border-ghost-300 bg-white px-4 py-2 font-mono text-xs text-ghost-700 hover:bg-ghost-50 hover:border-purple-900">
                VIEW SESSIONS
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeneralSettingsPage;
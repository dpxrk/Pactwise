'use client';

import { AlertCircle, Bell, Briefcase, Building, CheckCircle, Loader2, Mail, Save, Settings, Shield, User } from 'lucide-react';
import React, { useState, useEffect } from 'react';


// UI Components
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';

// Icons

interface UserProfileData {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  department?: string;
  title?: string;
  email?: string;
}

interface NotificationPreferencesData {
  inAppEnabled: boolean;
  emailEnabled: boolean;
  contractNotifications: boolean;
  approvalNotifications: boolean;
  paymentNotifications: boolean; // Added based on schema
  vendorNotifications: boolean; // Added based on schema
  complianceNotifications: boolean; // Added based on schema
  systemNotifications: boolean;
  // Add other preferences from your schema if needed
  // e.g., quietHoursEnabled, emailFrequency etc.
}

function UserProfilePage() {
  const { user, userProfile, isLoading: isAuthLoading } = useAuth();

  
  // const { data: notificationPrefs, isLoading: isLoadingNotifPrefs } = 
  const notificationPrefs = null;

  const updateUserProfileMutation = { execute: async (data: UserProfileData) => { console.log('Updating user profile:', data) }, isLoading: false };
  const updateNotificationPrefsMutation = { execute: async (data: { preferences: NotificationPreferencesData }) => { console.log('Updating notification preferences:', data) }, isLoading: false };


  const [profileData, setProfileData] = useState<UserProfileData>({});
  const [
    notificationPreferencesData,
    setNotificationPreferencesData,
  ] = useState<NotificationPreferencesData>({
    inAppEnabled: true,
    emailEnabled: true,
    contractNotifications: true,
    approvalNotifications: true,
    paymentNotifications: true,
    vendorNotifications: true,
    complianceNotifications: true,
    systemNotifications: true,
  });

  const [activeTab, setActiveTab] = useState<string>('details');
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    // TODO: Load user profile data from Supabase
    // For now, use mock data
    setProfileData({
      firstName: userProfile?.full_name?.split(' ')[0] || '',
      lastName: userProfile?.full_name?.split(' ')[1] || '',
      email: user?.email || '',
      phoneNumber: '',
      department: '',
      title: '',
    });
  }, [user, userProfile]);

  useEffect(() => {
    if (notificationPrefs) {
      setNotificationPreferencesData({
        inAppEnabled: (notificationPrefs as any).inAppEnabled,
        emailEnabled: (notificationPrefs as any).emailEnabled,
        contractNotifications: (notificationPrefs as any).contractNotifications,
        approvalNotifications: (notificationPrefs as any).approvalNotifications,
        paymentNotifications: (notificationPrefs as any).paymentNotifications ?? true, // Default if not in schema
        vendorNotifications: (notificationPrefs as any).vendorNotifications ?? true,   // Default if not in schema
        complianceNotifications: (notificationPrefs as any).complianceNotifications ?? true, // Default if not in schema
        systemNotifications: (notificationPrefs as any).systemNotifications,
      });
    }
  }, [notificationPrefs]);

  const handleProfileInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNotificationPrefChange = (
    name: keyof NotificationPreferencesData,
    checked: boolean
  ) => {
    setNotificationPreferencesData((prev) => ({ ...prev, [name]: checked }));
  };

  const handleSaveProfile = async () => {
    setStatusMessage(null);
    try {
      await updateUserProfileMutation.execute(profileData);
      setStatusMessage({
        type: 'success',
        message: 'Profile updated successfully!',
      });
    } catch (error) {
      setStatusMessage({
        type: 'error',
        message: (error as { data?: { message?: string }; message?: string }).data?.message || (error as Error).message || 'Failed to update profile.',
      });
    }
  };

  const handleSaveNotificationPrefs = async () => {
    setStatusMessage(null);
    try {
      await updateNotificationPrefsMutation.execute({
        preferences: notificationPreferencesData,
      });
      setStatusMessage({
        type: 'success',
        message: 'Notification preferences updated successfully!',
      });
    } catch (error) {
      setStatusMessage({
        type: 'error',
        message: (error as { data?: { message?: string }; message?: string }).data?.message || (error as Error).message || 'Failed to update preferences.',
      });
    }
  };


  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <LoadingSpinner text="Loading profile..." size="lg" />
      </div>
    );
  }

  if (!user) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          User data could not be loaded. Please try again or contact support.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="min-h-screen bg-ghost-100">
      {/* Header Bar */}
      <div className="border-b border-ghost-300 bg-white px-6 py-3">
        <div className="flex items-center gap-3">
          <User className="h-5 w-5 text-purple-900" />
          <div>
            <h1 className="font-mono text-xs uppercase tracking-wider text-ghost-700">
              User Profile
            </h1>
            <p className="text-xs text-ghost-700 mt-0.5">
              Manage your personal information, preferences, and security settings
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8 max-w-5xl">
        <div className="bg-white border border-ghost-300">

          <div className="p-6">
            {statusMessage && (
              <Alert
                variant={statusMessage.type === 'error' ? 'destructive' : 'default'}
                className="mb-6 border-2"
              >
                {statusMessage.type === 'error' ? (
                  <AlertCircle className="h-4 w-4" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                <AlertTitle className="font-mono text-xs uppercase tracking-wider">
                  {statusMessage.type === 'error' ? 'Error' : 'Success'}
                </AlertTitle>
                <AlertDescription className="text-sm">{statusMessage.message}</AlertDescription>
              </Alert>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3 mb-6 bg-ghost-100 p-1 border border-ghost-300">
                <TabsTrigger value="details" className="font-mono text-xs uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:border data-[state=active]:border-ghost-300">
                  <User className="mr-2 h-4 w-4" /> Details
                </TabsTrigger>
                <TabsTrigger value="notifications" className="font-mono text-xs uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:border data-[state=active]:border-ghost-300">
                  <Bell className="mr-2 h-4 w-4" /> Notifications
                </TabsTrigger>
                <TabsTrigger value="security" className="font-mono text-xs uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:border data-[state=active]:border-ghost-300">
                  <Shield className="mr-2 h-4 w-4" /> Security
                </TabsTrigger>
              </TabsList>

              {/* Profile Details Tab */}
              <TabsContent value="details" className="space-y-6">
                <div className="border border-ghost-300 bg-white">
                  <div className="border-b border-ghost-300 px-6 py-3">
                    <h3 className="font-mono text-xs uppercase tracking-wider text-ghost-700">
                      Personal Information
                    </h3>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <Label htmlFor="firstName" className="font-mono text-xs uppercase tracking-wider text-ghost-700">
                          First Name
                        </Label>
                        <Input
                          id="firstName"
                          name="firstName"
                          value={profileData.firstName || ''}
                          onChange={handleProfileInputChange}
                          placeholder="Your first name"
                          className="border-ghost-300"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="lastName" className="font-mono text-xs uppercase tracking-wider text-ghost-700">
                          Last Name
                        </Label>
                        <Input
                          id="lastName"
                          name="lastName"
                          value={profileData.lastName || ''}
                          onChange={handleProfileInputChange}
                          placeholder="Your last name"
                          className="border-ghost-300"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="font-mono text-xs uppercase tracking-wider text-ghost-700">
                        Email
                      </Label>
                      <div className="flex items-center">
                        <Mail className="mr-2 h-4 w-4 text-ghost-700" />
                        <Input
                          id="email"
                          type="email"
                          value={profileData.email || ''}
                          readOnly
                          className="bg-ghost-100 border-ghost-300 cursor-not-allowed font-mono text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="phoneNumber" className="font-mono text-xs uppercase tracking-wider text-ghost-700">
                        Phone Number
                      </Label>
                      <Input
                        id="phoneNumber"
                        name="phoneNumber"
                        type="tel"
                        value={profileData.phoneNumber || ''}
                        onChange={handleProfileInputChange}
                        placeholder="Your phone number (optional)"
                        className="border-ghost-300"
                      />
                    </div>
                  </div>
                </div>

                <div className="border border-ghost-300 bg-white">
                  <div className="border-b border-ghost-300 px-6 py-3">
                    <h3 className="font-mono text-xs uppercase tracking-wider text-ghost-700">
                      Work Information
                    </h3>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <Label htmlFor="title" className="font-mono text-xs uppercase tracking-wider text-ghost-700">
                          Job Title
                        </Label>
                        <Input
                          id="title"
                          name="title"
                          value={profileData.title || ''}
                          onChange={handleProfileInputChange}
                          placeholder="e.g., Contract Manager (optional)"
                          className="border-ghost-300"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="department" className="font-mono text-xs uppercase tracking-wider text-ghost-700">
                          Department
                        </Label>
                        <Input
                          id="department"
                          name="department"
                          value={profileData.department || ''}
                          onChange={handleProfileInputChange}
                          placeholder="e.g., Legal, Sales (optional)"
                          className="border-ghost-300"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="enterpriseName" className="font-mono text-xs uppercase tracking-wider text-ghost-700">
                        Enterprise
                      </Label>
                      <div className="flex items-center">
                        <Building className="mr-2 h-4 w-4 text-ghost-700" />
                        <Input
                          id="enterpriseName"
                          value={userProfile?.enterprise_id || 'N/A'}
                          readOnly
                          className="bg-ghost-100 border-ghost-300 cursor-not-allowed font-mono text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="userRole" className="font-mono text-xs uppercase tracking-wider text-ghost-700">
                        Role
                      </Label>
                      <div className="flex items-center">
                        <Briefcase className="mr-2 h-4 w-4 text-ghost-700" />
                        <Input
                          id="userRole"
                          value={userProfile?.role || ''}
                          readOnly
                          className="bg-ghost-100 border-ghost-300 cursor-not-allowed font-mono text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end pt-6">
                  <Button
                    onClick={handleSaveProfile}
                    disabled={updateUserProfileMutation.isLoading}
                    className="bg-purple-900 hover:bg-purple-800 text-white border-0 font-mono text-xs uppercase tracking-wider"
                  >
                    {updateUserProfileMutation.isLoading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    <Save className="mr-2 h-4 w-4" />
                    Save Profile
                  </Button>
                </div>
              </TabsContent>

              {/* Notification Preferences Tab */}
              <TabsContent value="notifications" className="space-y-6">
                <div className="border border-ghost-300 bg-white">
                  <div className="border-b border-ghost-300 px-6 py-3">
                    <h3 className="font-mono text-xs uppercase tracking-wider text-ghost-700">
                      Notification Settings
                    </h3>
                    <p className="text-xs text-ghost-700 mt-1">
                      Choose how you want to be notified
                    </p>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between p-3 border border-ghost-300 hover:border-purple-500 transition-colors">
                      <Label htmlFor="inAppEnabled" className="flex-grow cursor-pointer font-mono text-xs uppercase tracking-wider text-ghost-700">
                        In-App Notifications
                      </Label>
                      <Switch
                        id="inAppEnabled"
                        checked={notificationPreferencesData.inAppEnabled}
                        onCheckedChange={(checked) =>
                          handleNotificationPrefChange('inAppEnabled', checked)
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 border border-ghost-300 hover:border-purple-500 transition-colors">
                      <Label htmlFor="emailEnabled" className="flex-grow cursor-pointer font-mono text-xs uppercase tracking-wider text-ghost-700">
                        Email Notifications
                      </Label>
                      <Switch
                        id="emailEnabled"
                        checked={notificationPreferencesData.emailEnabled}
                        onCheckedChange={(checked) =>
                          handleNotificationPrefChange('emailEnabled', checked)
                        }
                      />
                    </div>
                    <div className="border-t border-ghost-300 my-4"></div>
                    <h4 className="font-mono text-xs uppercase tracking-wider text-ghost-700 mb-3">
                      Notification Types
                    </h4>
                    {[
                      { id: 'contractNotifications', label: 'Contract Updates (Expiry, Status Changes)' },
                      { id: 'approvalNotifications', label: 'Approval Requests & Updates' },
                      { id: 'paymentNotifications', label: 'Payment Reminders & Confirmations' },
                      { id: 'vendorNotifications', label: 'Vendor Onboarding & Risk Alerts' },
                      { id: 'complianceNotifications', label: 'Compliance & Audit Notifications' },
                      { id: 'systemNotifications', label: 'System Alerts & Announcements' },
                    ].map(pref => (
                      <div key={pref.id} className="flex items-center justify-between p-3 border border-ghost-300 hover:border-purple-500 transition-colors">
                        <Label htmlFor={pref.id} className="flex-grow cursor-pointer text-sm text-ghost-700">
                          {pref.label}
                        </Label>
                        <Switch
                          id={pref.id}
                          checked={notificationPreferencesData[pref.id as keyof NotificationPreferencesData]}
                          onCheckedChange={(checked) =>
                            handleNotificationPrefChange(pref.id as keyof NotificationPreferencesData, checked)
                          }
                        />
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-ghost-300 px-6 py-4 flex justify-end">
                    <Button
                      onClick={handleSaveNotificationPrefs}
                      disabled={updateNotificationPrefsMutation.isLoading}
                      className="bg-purple-900 hover:bg-purple-800 text-white border-0 font-mono text-xs uppercase tracking-wider"
                    >
                      {updateNotificationPrefsMutation.isLoading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      <Save className="mr-2 h-4 w-4" />
                      Save Preferences
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* Security Settings Tab */}
              <TabsContent value="security" className="space-y-6">
                <div className="border border-ghost-300 bg-white">
                  <div className="border-b border-ghost-300 px-6 py-3">
                    <h3 className="font-mono text-xs uppercase tracking-wider text-ghost-700">
                      Account Security
                    </h3>
                    <p className="text-xs text-ghost-700 mt-1">
                      Manage your account security settings through Clerk
                    </p>
                  </div>
                  <div className="p-6 space-y-4">
                    <p className="text-sm text-ghost-700 border-l-2 border-purple-500 pl-4">
                      Your password, multi-factor authentication (MFA), and connected accounts
                      are managed securely by Clerk.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => window.open("https://clerk.com/dashboard", "_blank")}
                      className="w-full sm:w-auto border-ghost-300 hover:bg-ghost-100 hover:border-purple-500 font-mono text-xs uppercase tracking-wider"
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      Manage Security Settings
                    </Button>
                    <Alert variant="default" className="mt-4 border-2 border-purple-500 bg-purple-50">
                      <AlertCircle className="h-4 w-4 text-purple-900" />
                      <AlertTitle className="text-purple-900 font-mono text-xs uppercase tracking-wider">
                        Note
                      </AlertTitle>
                      <AlertDescription className="text-purple-900 text-sm">
                        You will be redirected to your Clerk user profile to manage these settings.
                      </AlertDescription>
                    </Alert>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserProfilePage;
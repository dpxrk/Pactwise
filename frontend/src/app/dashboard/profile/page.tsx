'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LoadingSpinner } from '@/app/_components/common/LoadingSpinner';

// Icons

interface UserProfileData {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  department?: string;
  title?: string;
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
  const isLoadingNotifPrefs = false;

  const placeholder = { execute: async () => ({}), isLoading: false };
  // const updatePreferences = useMutation(api.notifications.updatePreferences);

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
      firstName: '',
      lastName: '',
      email: user?.email || '',
      phone: '',
      department: '',
      title: '',
    });
  }, [user]);

  useEffect(() => {
    if (notificationPrefs) {
      setNotificationPreferencesData({
        inAppEnabled: notificationPrefs.inAppEnabled,
        emailEnabled: notificationPrefs.emailEnabled,
        contractNotifications: notificationPrefs.contractNotifications,
        approvalNotifications: notificationPrefs.approvalNotifications,
        paymentNotifications: notificationPrefs.paymentNotifications ?? true, // Default if not in schema
        vendorNotifications: notificationPrefs.vendorNotifications ?? true,   // Default if not in schema
        complianceNotifications: notificationPrefs.complianceNotifications ?? true, // Default if not in schema
        systemNotifications: notificationPrefs.systemNotifications,
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


  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <LoadingSpinner text="Loading profile..." size="lg" />
      </div>
    );
  }

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
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8 max-w-5xl">
      <Card className="shadow-xl border-border/20 bg-card">
        <CardHeader className="pb-4 border-b border-border/10">
          <div className="flex items-center space-x-4">
            <User className="h-10 w-10 text-gold" />
            <div>
              <CardTitle className="text-3xl font-sans text-primary">
                User Profile
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Manage your personal information, preferences, and security
                settings.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {statusMessage && (
            <Alert
              variant={statusMessage.type === 'error' ? 'destructive' : 'default'}
              className="mb-6"
            >
              {statusMessage.type === 'error' ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              <AlertTitle>
                {statusMessage.type === 'error' ? 'Error' : 'Success'}
              </AlertTitle>
              <AlertDescription>{statusMessage.message}</AlertDescription>
            </Alert>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 mb-6 bg-muted/50 p-1 rounded-lg">
              <TabsTrigger value="details">
                <User className="mr-2 h-4 w-4" /> Profile Details
              </TabsTrigger>
              <TabsTrigger value="notifications">
                <Bell className="mr-2 h-4 w-4" /> Notifications
              </TabsTrigger>
              <TabsTrigger value="security">
                <Shield className="mr-2 h-4 w-4" /> Security
              </TabsTrigger>
            </TabsList>

            {/* Profile Details Tab */}
            <TabsContent value="details" className="space-y-6">
              <Card className="border-border/20">
                <CardHeader>
                  <CardTitle className="text-xl text-primary font-sans">
                    Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        value={profileData.firstName || ''}
                        onChange={handleProfileInputChange}
                        placeholder="Your first name"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        value={profileData.lastName || ''}
                        onChange={handleProfileInputChange}
                        placeholder="Your last name"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <div className="flex items-center">
                      <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        readOnly
                        className="bg-muted/30 cursor-not-allowed"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phoneNumber">Phone Number</Label>
                    <Input
                      id="phoneNumber"
                      name="phoneNumber"
                      type="tel"
                      value={profileData.phoneNumber || ''}
                      onChange={handleProfileInputChange}
                      placeholder="Your phone number (optional)"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/20">
                <CardHeader>
                  <CardTitle className="text-xl text-primary font-sans">
                    Work Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <Label htmlFor="title">Job Title</Label>
                      <Input
                        id="title"
                        name="title"
                        value={profileData.title || ''}
                        onChange={handleProfileInputChange}
                        placeholder="e.g., Contract Manager (optional)"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="department">Department</Label>
                      <Input
                        id="department"
                        name="department"
                        value={profileData.department || ''}
                        onChange={handleProfileInputChange}
                        placeholder="e.g., Legal, Sales (optional)"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="enterpriseName">Enterprise</Label>
                    <div className="flex items-center">
                       <Building className="mr-2 h-4 w-4 text-muted-foreground" />
                       <Input
                        id="enterpriseName"
                        readOnly
                        className="bg-muted/30 cursor-not-allowed"
                       />
                    </div>
                  </div>
                   <div className="space-y-1.5">
                    <Label htmlFor="userRole">Role</Label>
                     <div className="flex items-center">
                        <Briefcase className="mr-2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="userRole"
                          readOnly
                          className="bg-muted/30 cursor-not-allowed"
                        />
                     </div>
                  </div>
                </CardContent>
              </Card>
              <div className="flex justify-end">
                <Button
                  onClick={handleSaveProfile}
                  disabled={updateUserProfileMutation.isLoading}
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
              <Card className="border-border/20">
                <CardHeader>
                  <CardTitle className="text-xl text-primary font-sans">
                    Notification Settings
                  </CardTitle>
                  <CardDescription>
                    Choose how you want to be notified.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-md border border-border/10 bg-card hover:bg-muted/30 transition-colors">
                    <Label htmlFor="inAppEnabled" className="flex-grow cursor-pointer">
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
                  <div className="flex items-center justify-between p-3 rounded-md border border-border/10 bg-card hover:bg-muted/30 transition-colors">
                    <Label htmlFor="emailEnabled" className="flex-grow cursor-pointer">
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
                  <Separator className="my-4" />
                  <h4 className="text-md font-medium text-foreground">
                    Notification Types:
                  </h4>
                  {[
                    { id: 'contractNotifications', label: 'Contract Updates (Expiry, Status Changes)' },
                    { id: 'approvalNotifications', label: 'Approval Requests & Updates' },
                    { id: 'paymentNotifications', label: 'Payment Reminders & Confirmations' },
                    { id: 'vendorNotifications', label: 'Vendor Onboarding & Risk Alerts' },
                    { id: 'complianceNotifications', label: 'Compliance & Audit Notifications' },
                    { id: 'systemNotifications', label: 'System Alerts & Announcements' },
                  ].map(pref => (
                    <div key={pref.id} className="flex items-center justify-between p-3 rounded-md border border-border/10 bg-card hover:bg-muted/30 transition-colors">
                      <Label htmlFor={pref.id} className="flex-grow cursor-pointer">
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
                </CardContent>
                 <CardFooter className="border-t border-border/10 pt-4">
                    <Button
                      onClick={handleSaveNotificationPrefs}
                      disabled={updateNotificationPrefsMutation.isLoading}
                      className="ml-auto"
                    >
                      {updateNotificationPrefsMutation.isLoading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      <Save className="mr-2 h-4 w-4" />
                      Save Preferences
                    </Button>
                  </CardFooter>
              </Card>
            </TabsContent>

            {/* Security Settings Tab */}
            <TabsContent value="security" className="space-y-6">
             <Card className="border-border/20">
                <CardHeader>
                    <CardTitle className="text-xl text-primary font-sans">Account Security</CardTitle>
                    <CardDescription>
                        Manage your account security settings through Clerk.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Your password, multi-factor authentication (MFA), and connected accounts
                        are managed securely by Clerk.
                    </p>
                    <Button
                        variant="outline"
                        onClick={() => window.open("https://clerk.com/dashboard", "_blank")}
                        className="w-full sm:w-auto"
                    >
                        <Settings className="mr-2 h-4 w-4" />
                        Manage Security Settings in Clerk
                    </Button>
                     <Alert variant="default" className="mt-4 border-blue-200 bg-blue-50 dark:bg-blue-900/20">
                        <AlertCircle className="h-4 w-4 text-blue-600" />
                        <AlertTitle className="text-blue-700">Note</AlertTitle>
                        <AlertDescription className="text-blue-600">
                            You will be redirected to your Clerk user profile to manage these settings.
                        </AlertDescription>
                    </Alert>
                </CardContent>
              </Card>

              {/* Placeholder for future application-specific security settings */}
              {/* <Card className="border-border/20">
                <CardHeader>
                  <CardTitle className="text-xl text-primary font-sans">
                    Application Security
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    (Placeholder for future application-specific security settings,
                    e.g., API key management, session timeouts if managed by the app itself)
                  </p>
                </CardContent>
              </Card>
              */}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default UserProfilePage;

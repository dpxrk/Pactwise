'use client';

import { useState } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Shield, Key, Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function SecuritySettingsPage() {
  const { user } = useUser();
  const { signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  
  // Security settings state
  const [settings, setSettings] = useState({
    twoFactorEnabled: false,
    sessionTimeout: '24',
    loginNotifications: true,
    apiKeyAccess: true,
    passwordChangeRequired: false,
    allowedIpAddresses: '',
    securityQuestions: false
  });

  // Recent security events mock data
  const securityEvents = [
    {
      id: 1,
      type: 'login',
      description: 'Successful login from Chrome on Windows',
      location: 'New York, NY',
      timestamp: new Date('2024-01-15T10:30:00'),
      status: 'success'
    },
    {
      id: 2,
      type: 'password_change',
      description: 'Password changed',
      location: 'New York, NY',
      timestamp: new Date('2024-01-10T14:22:00'),
      status: 'success'
    },
    {
      id: 3,
      type: 'failed_login',
      description: 'Failed login attempt',
      location: 'Unknown location',
      timestamp: new Date('2024-01-08T09:15:00'),
      status: 'warning'
    }
  ];

  const handleSettingChange = (key: string, value: boolean | string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Security settings updated successfully');
    } catch (error) {
      toast.error('Failed to update security settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOutAllDevices = async () => {
    try {
      // Sign out from all devices
      await signOut();
      toast.success('Signed out from all devices');
    } catch (error) {
      toast.error('Failed to sign out from all devices');
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'login':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'password_change':
        return <Key className="h-4 w-4 text-blue-500" />;
      case 'failed_login':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getEventBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-100 text-green-800">Success</Badge>;
      case 'warning':
        return <Badge variant="destructive">Warning</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Security Settings</h1>
        <p className="text-muted-foreground">
          Manage your account security and privacy settings.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Account Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Account Security
            </CardTitle>
            <CardDescription>
              Configure your account security settings and authentication methods.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Two-Factor Authentication */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="two-factor">Two-Factor Authentication</Label>
                <p className="text-sm text-muted-foreground">
                  Add an extra layer of security to your account
                </p>
              </div>
              <Switch
                id="two-factor"
                checked={settings.twoFactorEnabled}
                onCheckedChange={(checked) => handleSettingChange('twoFactorEnabled', checked)}
              />
            </div>

            <Separator />

            {/* Password Requirements */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="password-change">Require Password Change</Label>
                <p className="text-sm text-muted-foreground">
                  Force password change every 90 days
                </p>
              </div>
              <Switch
                id="password-change"
                checked={settings.passwordChangeRequired}
                onCheckedChange={(checked) => handleSettingChange('passwordChangeRequired', checked)}
              />
            </div>

            <Separator />

            {/* Session Timeout */}
            <div className="space-y-2">
              <Label htmlFor="session-timeout">Session Timeout</Label>
              <Select
                value={settings.sessionTimeout}
                onValueChange={(value) => handleSettingChange('sessionTimeout', value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select timeout duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 hour</SelectItem>
                  <SelectItem value="8">8 hours</SelectItem>
                  <SelectItem value="24">24 hours</SelectItem>
                  <SelectItem value="168">1 week</SelectItem>
                  <SelectItem value="720">30 days</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Automatically sign out after this period of inactivity
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Login & Access Control */}
        <Card>
          <CardHeader>
            <CardTitle>Login & Access Control</CardTitle>
            <CardDescription>
              Manage login notifications and access restrictions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Login Notifications */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="login-notifications">Login Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when someone signs in to your account
                </p>
              </div>
              <Switch
                id="login-notifications"
                checked={settings.loginNotifications}
                onCheckedChange={(checked) => handleSettingChange('loginNotifications', checked)}
              />
            </div>

            <Separator />

            {/* IP Address Restrictions */}
            <div className="space-y-2">
              <Label htmlFor="allowed-ips">Allowed IP Addresses</Label>
              <Input
                id="allowed-ips"
                placeholder="192.168.1.1, 10.0.0.1 (optional)"
                value={settings.allowedIpAddresses}
                onChange={(e) => handleSettingChange('allowedIpAddresses', e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Restrict access to specific IP addresses (leave empty to allow all)
              </p>
            </div>

            <Separator />

            {/* Sign Out All Devices */}
            <div className="space-y-2">
              <Label>Device Management</Label>
              <p className="text-sm text-muted-foreground">
                Sign out from all devices except this one
              </p>
              <Button
                variant="outline"
                onClick={handleSignOutAllDevices}
                className="w-full sm:w-auto"
              >
                Sign Out All Devices
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Security Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Security Activity
            </CardTitle>
            <CardDescription>
              Review recent security events and login activity.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {securityEvents.map((event) => (
                <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg border">
                  {getEventIcon(event.type)}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{event.description}</p>
                      {getEventBadge(event.status)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {event.location} • {event.timestamp.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Security Recommendations */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Security Recommendations</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>To keep your account secure:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Enable two-factor authentication</li>
              <li>Use a strong, unique password</li>
              <li>Review login activity regularly</li>
              <li>Keep your email address up to date</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSaveSettings} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
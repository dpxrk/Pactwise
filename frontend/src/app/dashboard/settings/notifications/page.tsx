'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Bell, Mail, MessageSquare, Smartphone, Calendar, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function NotificationsSettingsPage() {
  const [isLoading, setIsLoading] = useState(false);
  
  // Notification preferences state
  const [notifications, setNotifications] = useState({
    // Email notifications
    contractExpiring: true,
    contractSigned: true,
    vendorUpdates: false,
    systemMaintenance: true,
    securityAlerts: true,
    weeklyDigest: true,
    
    // In-app notifications
    inAppNotifications: true,
    browserNotifications: false,
    
    // Mobile notifications
    mobileNotifications: true,
    
    // Frequency settings
    digestFrequency: 'weekly',
    reminderTiming: '7', // days before contract expiry
    
    // Contact preferences
    emailAddress: 'user@example.com',
    phoneNumber: '+1 (555) 123-4567',
    
    // Notification channels
    channels: {
      email: true,
      sms: false,
      slack: false,
      teams: false
    }
  });

  // Recent notifications mock data
  const recentNotifications = [
    {
      id: 1,
      type: 'contract_expiring',
      title: 'Contract Expiring Soon',
      message: 'Software License Agreement with TechCorp expires in 5 days',
      timestamp: new Date('2024-01-15T10:30:00'),
      read: false,
      channel: 'email'
    },
    {
      id: 2,
      type: 'vendor_update',
      title: 'Vendor Information Updated',
      message: 'Supplier ABC updated their contact information',
      timestamp: new Date('2024-01-14T14:22:00'),
      read: true,
      channel: 'in-app'
    },
    {
      id: 3,
      type: 'system',
      title: 'System Maintenance Complete',
      message: 'Scheduled maintenance completed successfully',
      timestamp: new Date('2024-01-13T09:15:00'),
      read: true,
      channel: 'email'
    }
  ];

  const handleNotificationChange = (key: string, value: boolean | string) => {
    setNotifications(prev => ({ ...prev, [key]: value }));
  };

  const handleChannelChange = (channel: string, enabled: boolean) => {
    setNotifications(prev => ({
      ...prev,
      channels: { ...prev.channels, [channel]: enabled }
    }));
  };

  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Notification settings updated successfully');
    } catch (error) {
      toast.error('Failed to update notification settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      toast.success('Test notification sent successfully');
    } catch (error) {
      toast.error('Failed to send test notification');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'contract_expiring':
        return <Calendar className="h-4 w-4 text-orange-500" />;
      case 'vendor_update':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'system':
        return <AlertTriangle className="h-4 w-4 text-green-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'sms':
        return <Smartphone className="h-4 w-4" />;
      case 'in-app':
        return <Bell className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notification Settings</h1>
        <p className="text-muted-foreground">
          Manage how and when you receive notifications.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Email Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Notifications
            </CardTitle>
            <CardDescription>
              Choose which email notifications you want to receive.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="contract-expiring">Contract Expiration Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when contracts are about to expire
                </p>
              </div>
              <Switch
                id="contract-expiring"
                checked={notifications.contractExpiring}
                onCheckedChange={(checked) => handleNotificationChange('contractExpiring', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="contract-signed">Contract Signed</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when contracts are signed
                </p>
              </div>
              <Switch
                id="contract-signed"
                checked={notifications.contractSigned}
                onCheckedChange={(checked) => handleNotificationChange('contractSigned', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="vendor-updates">Vendor Updates</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when vendor information changes
                </p>
              </div>
              <Switch
                id="vendor-updates"
                checked={notifications.vendorUpdates}
                onCheckedChange={(checked) => handleNotificationChange('vendorUpdates', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="security-alerts">Security Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Important security notifications (recommended)
                </p>
              </div>
              <Switch
                id="security-alerts"
                checked={notifications.securityAlerts}
                onCheckedChange={(checked) => handleNotificationChange('securityAlerts', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="weekly-digest">Weekly Digest</Label>
                <p className="text-sm text-muted-foreground">
                  Summary of activity from the past week
                </p>
              </div>
              <Switch
                id="weekly-digest"
                checked={notifications.weeklyDigest}
                onCheckedChange={(checked) => handleNotificationChange('weeklyDigest', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notification Channels */}
        <Card>
          <CardHeader>
            <CardTitle>Notification Channels</CardTitle>
            <CardDescription>
              Select your preferred notification channels.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-blue-500" />
                  <div>
                    <Label>Email</Label>
                    <p className="text-sm text-muted-foreground">Primary notifications</p>
                  </div>
                </div>
                <Switch
                  checked={notifications.channels.email}
                  onCheckedChange={(checked) => handleChannelChange('email', checked)}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Smartphone className="h-5 w-5 text-green-500" />
                  <div>
                    <Label>SMS</Label>
                    <p className="text-sm text-muted-foreground">Critical alerts only</p>
                  </div>
                </div>
                <Switch
                  checked={notifications.channels.sms}
                  onCheckedChange={(checked) => handleChannelChange('sms', checked)}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-purple-500" />
                  <div>
                    <Label>Slack</Label>
                    <p className="text-sm text-muted-foreground">Team notifications</p>
                  </div>
                </div>
                <Switch
                  checked={notifications.channels.slack}
                  onCheckedChange={(checked) => handleChannelChange('slack', checked)}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                  <div>
                    <Label>Microsoft Teams</Label>
                    <p className="text-sm text-muted-foreground">Team notifications</p>
                  </div>
                </div>
                <Switch
                  checked={notifications.channels.teams}
                  onCheckedChange={(checked) => handleChannelChange('teams', checked)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Timing */}
        <Card>
          <CardHeader>
            <CardTitle>Notification Timing</CardTitle>
            <CardDescription>
              Configure when and how often you receive notifications.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="reminder-timing">Contract Expiry Reminders</Label>
              <Select
                value={notifications.reminderTiming}
                onValueChange={(value) => handleNotificationChange('reminderTiming', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select reminder timing" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 day before</SelectItem>
                  <SelectItem value="3">3 days before</SelectItem>
                  <SelectItem value="7">1 week before</SelectItem>
                  <SelectItem value="14">2 weeks before</SelectItem>
                  <SelectItem value="30">1 month before</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="digest-frequency">Digest Frequency</Label>
              <Select
                value={notifications.digestFrequency}
                onValueChange={(value) => handleNotificationChange('digestFrequency', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="never">Never</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
            <CardDescription>
              Update your contact details for notifications.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={notifications.emailAddress}
                onChange={(e) => handleNotificationChange('emailAddress', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={notifications.phoneNumber}
                onChange={(e) => handleNotificationChange('phoneNumber', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Recent Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Recent Notifications
            </CardTitle>
            <CardDescription>
              View your recent notification history.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentNotifications.map((notification) => (
                <div key={notification.id} className="flex items-start gap-3 p-3 rounded-lg border">
                  {getNotificationIcon(notification.type)}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{notification.title}</p>
                      <div className="flex items-center gap-2">
                        {getChannelIcon(notification.channel)}
                        {!notification.read && (
                          <Badge variant="secondary" className="text-xs">New</Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{notification.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {notification.timestamp.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Test Notifications */}
        <Card>
          <CardHeader>
            <CardTitle>Test Notifications</CardTitle>
            <CardDescription>
              Send a test notification to verify your settings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleTestNotification} variant="outline">
              Send Test Notification
            </Button>
          </CardContent>
        </Card>

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
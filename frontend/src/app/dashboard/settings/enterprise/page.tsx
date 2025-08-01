'use client';

import React, { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useConvexQuery } from '@/lib/api-client';
// import { api } from '../../../../../convex/_generated/api';
// import { Id } from '../../../../../convex/_generated/dataModel';

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
import { Switch } from "@/components/ui/switch";
import { PermissionGate } from '@/app/_components/auth/PermissionGate';

// Icons
import {
  Building,
  Save,
  AlertCircle,
  CheckCircle,
  Edit,
  Globe,
  Users,
  Calendar,
  FileText,
  Shield,
  Database,
  Settings,
  Trash2,
  AlertTriangle,
  Info,
  Clock,
  TrendingUp
} from 'lucide-react';
import LoadingSpinner from '@/app/_components/common/LoadingSpinner';

const EnterpriseSettingsPage = () => {
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Get enterpriseId from Clerk user's public metadata
  const enterpriseId = clerkUser?.publicMetadata?.enterpriseId as Id<"enterprises"> | undefined;

  // Fetch current user context
  const { data: userContext, isLoading: isLoadingUser } = useConvexQuery(
    api.users.getUserContext,
    {}
  );

  // Mock data for enterprise settings (in real app, this would come from API)
  const [enterpriseData, setEnterpriseData] = useState({
    name: userContext?.enterprise?.name || '',
    domain: userContext?.enterprise?.domain || '',
    industry: '',
    size: '',
    contractVolume: '',
    primaryUseCase: [] as string[],
    address: '',
    phone: '',
    website: '',
    description: '',
    timezone: 'UTC',
    dateFormat: 'MM/DD/YYYY',
    currency: 'USD',
    fiscalYearStart: 'January',
  });

  React.useEffect(() => {
    if (userContext?.enterprise) {
      setEnterpriseData(prev => ({
        ...prev,
        name: userContext.enterprise?.name || '',
        domain: userContext.enterprise?.domain || '',
      }));
    }
  }, [userContext]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // In a real implementation, this would call a mutation to update enterprise settings
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save enterprise settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isClerkLoaded || isLoadingUser) {
    return (
      <div className="p-6">
        <LoadingSpinner />
      </div>
    );
  }

  if (!userContext?.enterprise) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Unable to load enterprise information. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <PermissionGate role="admin">
      <div className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Basic Information
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Manage your enterprise's basic information and branding
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="enterpriseName">Enterprise Name *</Label>
                <Input
                  id="enterpriseName"
                  value={enterpriseData.name}
                  onChange={(e) => setEnterpriseData({ ...enterpriseData, name: e.target.value })}
                  disabled={!isEditing}
                  placeholder="Your enterprise name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="domain">Domain</Label>
                <Input
                  id="domain"
                  value={enterpriseData.domain}
                  onChange={(e) => setEnterpriseData({ ...enterpriseData, domain: e.target.value })}
                  disabled={!isEditing}
                  placeholder="company.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Select
                  value={enterpriseData.industry}
                  onValueChange={(value) => setEnterpriseData({ ...enterpriseData, industry: value })}
                  disabled={!isEditing}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technology">Technology</SelectItem>
                    <SelectItem value="healthcare">Healthcare</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="manufacturing">Manufacturing</SelectItem>
                    <SelectItem value="retail">Retail</SelectItem>
                    <SelectItem value="education">Education</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="size">Enterprise Size</Label>
                <Select
                  value={enterpriseData.size}
                  onValueChange={(value) => setEnterpriseData({ ...enterpriseData, size: value })}
                  disabled={!isEditing}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-10">1-10 employees</SelectItem>
                    <SelectItem value="11-50">11-50 employees</SelectItem>
                    <SelectItem value="51-200">51-200 employees</SelectItem>
                    <SelectItem value="201-500">201-500 employees</SelectItem>
                    <SelectItem value="501-1000">501-1000 employees</SelectItem>
                    <SelectItem value="1000+">1000+ employees</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={enterpriseData.website}
                  onChange={(e) => setEnterpriseData({ ...enterpriseData, website: e.target.value })}
                  disabled={!isEditing}
                  placeholder="https://company.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={enterpriseData.phone}
                  onChange={(e) => setEnterpriseData({ ...enterpriseData, phone: e.target.value })}
                  disabled={!isEditing}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={enterpriseData.address}
                onChange={(e) => setEnterpriseData({ ...enterpriseData, address: e.target.value })}
                disabled={!isEditing}
                placeholder="Enterprise address"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={enterpriseData.description}
                onChange={(e) => setEnterpriseData({ ...enterpriseData, description: e.target.value })}
                disabled={!isEditing}
                placeholder="Brief description of your enterprise"
                rows={3}
              />
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

        {/* Contract Management Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Contract Management
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Configure contract management preferences and workflows
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contractVolume">Expected Contract Volume</Label>
                <Select
                  value={enterpriseData.contractVolume}
                  onValueChange={(value) => setEnterpriseData({ ...enterpriseData, contractVolume: value })}
                  disabled={!isEditing}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select volume" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low (1-50 contracts/year)</SelectItem>
                    <SelectItem value="medium">Medium (51-200 contracts/year)</SelectItem>
                    <SelectItem value="high">High (201-500 contracts/year)</SelectItem>
                    <SelectItem value="enterprise">Enterprise (500+ contracts/year)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fiscalYear">Fiscal Year Start</Label>
                <Select
                  value={enterpriseData.fiscalYearStart}
                  onValueChange={(value) => setEnterpriseData({ ...enterpriseData, fiscalYearStart: value })}
                  disabled={!isEditing}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="January">January</SelectItem>
                    <SelectItem value="April">April</SelectItem>
                    <SelectItem value="July">July</SelectItem>
                    <SelectItem value="October">October</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <Label>Contract Workflow Settings</Label>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">Auto-analysis for new contracts</p>
                    <p className="text-xs text-muted-foreground">Automatically analyze contracts when uploaded</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">Expiration notifications</p>
                    <p className="text-xs text-muted-foreground">Send alerts before contracts expire</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">Renewal reminders</p>
                    <p className="text-xs text-muted-foreground">Remind users about upcoming renewals</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Regional Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Regional Settings
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Configure regional preferences for dates, currency, and timezone
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  value={enterpriseData.timezone}
                  onValueChange={(value) => setEnterpriseData({ ...enterpriseData, timezone: value })}
                  disabled={!isEditing}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="America/New_York">Eastern Time</SelectItem>
                    <SelectItem value="America/Chicago">Central Time</SelectItem>
                    <SelectItem value="America/Denver">Mountain Time</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                    <SelectItem value="Europe/London">London</SelectItem>
                    <SelectItem value="Europe/Paris">Paris</SelectItem>
                    <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateFormat">Date Format</Label>
                <Select
                  value={enterpriseData.dateFormat}
                  onValueChange={(value) => setEnterpriseData({ ...enterpriseData, dateFormat: value })}
                  disabled={!isEditing}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    <SelectItem value="MMM DD, YYYY">MMM DD, YYYY</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={enterpriseData.currency}
                  onValueChange={(value) => setEnterpriseData({ ...enterpriseData, currency: value })}
                  disabled={!isEditing}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                    <SelectItem value="GBP">GBP - British Pound</SelectItem>
                    <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                    <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                    <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Irreversible and destructive actions for your enterprise
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>
                These actions are permanent and cannot be undone. Please proceed with caution.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 border border-destructive rounded-lg">
                <div>
                  <h4 className="font-medium text-destructive">Export All Data</h4>
                  <p className="text-sm text-muted-foreground">Download all enterprise data before deletion</p>
                </div>
                <Button variant="outline" size="sm">
                  Export Data
                </Button>
              </div>
              
              <div className="flex items-center justify-between p-4 border border-destructive rounded-lg">
                <div>
                  <h4 className="font-medium text-destructive">Delete Enterprise</h4>
                  <p className="text-sm text-muted-foreground">Permanently delete this enterprise and all associated data</p>
                </div>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Enterprise
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PermissionGate>
  );
};

export default EnterpriseSettingsPage;
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  AlertTriangle,
  Building,
  Edit,
  FileText,
  Globe,
  Save,
  Trash2
} from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';

// UI Components
import { PermissionGate } from '@/app/_components/auth/PermissionGate';
import LoadingSpinner from '@/app/_components/common/LoadingSpinner';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

const EnterpriseSettingsPage = () => {
  const { userProfile, isLoading: authLoading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const queryClient = useQueryClient();

  // Get enterpriseId from user profile
  const enterpriseId = userProfile?.enterprise_id;

  // Fetch enterprise data from Supabase
  const { data: enterpriseQueryData, isLoading: isDataLoading, error: _error } = useQuery({
    queryKey: ['enterprise', enterpriseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enterprises')
        .select('*')
        .eq('id', enterpriseId!)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!enterpriseId,
  });

  // Mutation to update enterprise
  const updateEnterpriseMutation = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const { error } = await (supabase as any)
        .from('enterprises')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', enterpriseId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enterprise', enterpriseId] });
      toast.success('Enterprise settings updated successfully');
      setIsEditing(false);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  // Local state for form editing
  const [enterpriseData, setEnterpriseData] = useState({
    name: '',
    domain: '',
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

  // Sync enterprise data from query
  useEffect(() => {
    if (enterpriseQueryData) {
      // Cast to any to access additional properties that may be in metadata or extended schema
      const data = enterpriseQueryData as any;
      setEnterpriseData({
        name: data.name || '',
        domain: data.domain || '',
        industry: data.industry || '',
        size: data.size || '',
        contractVolume: data.contract_volume || '',
        primaryUseCase: data.primary_use_case || [],
        address: data.address || data.metadata?.address || '',
        phone: data.phone || data.metadata?.phone || '',
        website: data.website || data.metadata?.website || '',
        description: data.description || data.metadata?.description || '',
        timezone: data.timezone || data.metadata?.timezone || 'UTC',
        dateFormat: data.date_format || data.metadata?.date_format || 'MM/DD/YYYY',
        currency: data.currency || data.metadata?.currency || 'USD',
        fiscalYearStart: data.fiscal_year_start || data.metadata?.fiscal_year_start || 'January',
      });
    }
  }, [enterpriseQueryData]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateEnterpriseMutation.mutateAsync({
        name: enterpriseData.name,
        domain: enterpriseData.domain,
        industry: enterpriseData.industry,
        size: enterpriseData.size,
        contract_volume: enterpriseData.contractVolume,
        address: enterpriseData.address,
        phone: enterpriseData.phone,
        website: enterpriseData.website,
        description: enterpriseData.description,
        timezone: enterpriseData.timezone,
        date_format: enterpriseData.dateFormat,
        currency: enterpriseData.currency,
        fiscal_year_start: enterpriseData.fiscalYearStart,
      });
    } catch (_error) {
      // Error is handled by the mutation
    } finally {
      setIsSaving(false);
    }
  };

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
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Unable to load enterprise information. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      </div>
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
                Manage your enterprise&apos;s basic information and branding
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
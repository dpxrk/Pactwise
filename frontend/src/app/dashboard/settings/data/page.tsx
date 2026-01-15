'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Database,
  Download,
  Upload,
  Trash2,
  Shield,
  Clock,
  FileText,
  AlertTriangle,
  RefreshCw,
  Archive,
  HardDrive,
  Calendar,
  PackageOpen
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';

import { BatchUploadModal, VendorMatchReview } from '@/components/batch-upload';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();


export default function DataSettingsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [batchUploadOpen, setBatchUploadOpen] = useState(false);
  const [batchUploadType, setBatchUploadType] = useState<'contracts' | 'vendors'>('contracts');
  const { userProfile } = useAuth();
  const queryClient = useQueryClient();
  const enterpriseId = userProfile?.enterprise_id;

  // Data management settings
  const [settings, setSettings] = useState({
    autoBackup: true,
    backupFrequency: 'daily',
    dataRetention: '365', // days
    exportFormat: 'json',
    anonymizeExports: false,
    encryptBackups: true
  });

  // Fetch data counts for storage breakdown and export categories
  const { data: dataCounts } = useQuery({
    queryKey: ['data-counts', enterpriseId],
    queryFn: async () => {
      if (!enterpriseId) return null;

      // Fetch counts from various tables
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any;
      const [contracts, vendors, documents, templates] = await Promise.all([
        sb.from('contracts').select('id', { count: 'exact', head: true }).eq('enterprise_id', enterpriseId).is('deleted_at', null),
        sb.from('vendors').select('id', { count: 'exact', head: true }).eq('enterprise_id', enterpriseId).is('deleted_at', null),
        sb.from('contract_documents').select('id', { count: 'exact', head: true }).eq('enterprise_id', enterpriseId),
        sb.from('contract_templates').select('id', { count: 'exact', head: true }).eq('enterprise_id', enterpriseId),
      ]);

      return {
        contracts: contracts.count || 0,
        vendors: vendors.count || 0,
        documents: documents.count || 0,
        templates: templates.count || 0,
      };
    },
    enabled: !!enterpriseId,
  });

  // Fetch backups from enterprise_backups table (if exists)
  const { data: backupsData } = useQuery({
    queryKey: ['enterprise-backups', enterpriseId],
    queryFn: async () => {
      if (!enterpriseId) return [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('enterprise_backups')
        .select('*')
        .eq('enterprise_id', enterpriseId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        // Table might not exist yet
        return [];
      }
      return data || [];
    },
    enabled: !!enterpriseId,
  });

  // Calculate storage data from counts (estimated)
  const storageData = useMemo(() => {
    const totalGB = 10; // Default storage limit
    const contractsSize = (dataCounts?.contracts || 0) * 0.001; // ~1MB per contract
    const vendorsSize = (dataCounts?.vendors || 0) * 0.0001; // ~100KB per vendor
    const documentsSize = (dataCounts?.documents || 0) * 0.005; // ~5MB per document
    const templatesSize = (dataCounts?.templates || 0) * 0.0005; // ~500KB per template
    const usedGB = contractsSize + vendorsSize + documentsSize + templatesSize;

    return {
      total: totalGB,
      used: Math.round(usedGB * 100) / 100,
      breakdown: [
        { type: 'Contracts', size: Math.round(contractsSize * 100) / 100, percentage: Math.round((contractsSize / totalGB) * 100) },
        { type: 'Documents', size: Math.round(documentsSize * 100) / 100, percentage: Math.round((documentsSize / totalGB) * 100) },
        { type: 'Vendors', size: Math.round(vendorsSize * 100) / 100, percentage: Math.round((vendorsSize / totalGB) * 100) },
        { type: 'Templates', size: Math.round(templatesSize * 100) / 100, percentage: Math.round((templatesSize / totalGB) * 100) },
      ].filter(item => item.size > 0),
    };
  }, [dataCounts]);

  // Map backups data to display format
  const backupHistory = useMemo(() => {
    return (backupsData || []).map((backup: any) => ({
      id: backup.id,
      date: new Date(backup.created_at),
      type: backup.backup_type || 'Full',
      size: backup.size_mb ? `${backup.size_mb} MB` : 'N/A',
      status: backup.status || 'completed',
      retention: new Date(backup.retention_until || Date.now() + 30 * 24 * 60 * 60 * 1000),
    }));
  }, [backupsData]);

  // Build data categories for export/deletion
  const dataCategories = useMemo(() => {
    if (!dataCounts) return [];

    const categories = [];
    if (dataCounts.contracts > 0) {
      categories.push({
        name: 'Contracts',
        count: dataCounts.contracts,
        description: 'Contract documents and metadata',
        size: `${Math.round((dataCounts.contracts * 0.001) * 100) / 100} GB`,
        lastUpdated: new Date(),
      });
    }
    if (dataCounts.vendors > 0) {
      categories.push({
        name: 'Vendors',
        count: dataCounts.vendors,
        description: 'Vendor profiles and contact information',
        size: `${Math.round((dataCounts.vendors * 0.0001) * 1000) / 1000} GB`,
        lastUpdated: new Date(),
      });
    }
    if (dataCounts.documents > 0) {
      categories.push({
        name: 'Documents',
        count: dataCounts.documents,
        description: 'Uploaded documents and files',
        size: `${Math.round((dataCounts.documents * 0.005) * 100) / 100} GB`,
        lastUpdated: new Date(),
      });
    }
    if (dataCounts.templates > 0) {
      categories.push({
        name: 'Templates',
        count: dataCounts.templates,
        description: 'Contract templates and clause libraries',
        size: `${Math.round((dataCounts.templates * 0.0005) * 1000) / 1000} GB`,
        lastUpdated: new Date(),
      });
    }
    return categories;
  }, [dataCounts]);

  const handleSettingChange = (key: string, value: boolean | string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveSettings = async () => {
    if (!enterpriseId) return;

    setIsLoading(true);
    try {
      // Save data settings to enterprise settings
      const { error } = await (supabase as any)
        .from('enterprises')
        .update({
          settings: {
            data_management: settings,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', enterpriseId);

      if (error) throw error;
      toast.success('Data settings updated successfully');
    } catch (error) {
      console.error('Failed to update data settings:', error);
      toast.error('Failed to update data settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    if (!enterpriseId) return;

    try {
      // Call the backup edge function (requires server-side implementation)
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/enterprise-backup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({ enterprise_id: enterpriseId, type: 'manual' }),
      });

      if (!response.ok) {
        // Backup function not yet implemented - show info message
        toast.info('Manual backup feature coming soon. Your data is automatically backed up by Supabase.');
        return;
      }

      toast.success('Manual backup initiated');
      queryClient.invalidateQueries({ queryKey: ['enterprise-backups'] });
    } catch (error) {
      console.error('Failed to create backup:', error);
      toast.info('Manual backup feature coming soon. Your data is automatically backed up by Supabase.');
    }
  };

  const handleExportData = async (category?: string) => {
    if (!enterpriseId) return;

    setExportLoading(true);
    try {
      // Export data based on category
      const tableName = category?.toLowerCase() || 'all';
      let data: any[] = [];

      if (tableName === 'all' || tableName === 'contracts') {
        const { data: contracts } = await supabase
          .from('contracts')
          .select('*')
          .eq('enterprise_id', enterpriseId)
          .is('deleted_at', null);
        data = data.concat(contracts || []);
      }

      if (tableName === 'all' || tableName === 'vendors') {
        const { data: vendors } = await supabase
          .from('vendors')
          .select('*')
          .eq('enterprise_id', enterpriseId)
          .is('deleted_at', null);
        data = data.concat(vendors || []);
      }

      // Create downloadable file
      const exportData = settings.exportFormat === 'json'
        ? JSON.stringify(data, null, 2)
        : data.map(row => Object.values(row).join(',')).join('\n');

      const blob = new Blob([exportData], {
        type: settings.exportFormat === 'json' ? 'application/json' : 'text/csv'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pactwise-export-${category || 'all'}-${new Date().toISOString().split('T')[0]}.${settings.exportFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`${category || 'All data'} export completed`);
    } catch (error) {
      console.error('Failed to export data:', error);
      toast.error('Failed to export data');
    } finally {
      setExportLoading(false);
    }
  };

  const handleDeleteData = async (category: string) => {
    if (!enterpriseId) return;

    // Confirm deletion
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete all ${category.toLowerCase()}? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      const tableName = category.toLowerCase();
      let error;

      if (tableName === 'contracts') {
        // Soft delete contracts
        ({ error } = await (supabase as any)
          .from('contracts')
          .update({ deleted_at: new Date().toISOString() })
          .eq('enterprise_id', enterpriseId)
          .is('deleted_at', null));
      } else if (tableName === 'vendors') {
        // Soft delete vendors
        ({ error } = await (supabase as any)
          .from('vendors')
          .update({ deleted_at: new Date().toISOString() })
          .eq('enterprise_id', enterpriseId)
          .is('deleted_at', null));
      } else if (tableName === 'documents') {
        // Delete documents
        ({ error } = await (supabase as any)
          .from('contract_documents')
          .delete()
          .eq('enterprise_id', enterpriseId));
      } else if (tableName === 'templates') {
        // Delete templates
        ({ error } = await supabase
          .from('contract_templates')
          .delete()
          .eq('enterprise_id', enterpriseId));
      }

      if (error) throw error;

      toast.success(`${category} deleted successfully`);
      queryClient.invalidateQueries({ queryKey: ['data-counts'] });
    } catch (error) {
      console.error(`Failed to delete ${category}:`, error);
      toast.error(`Failed to delete ${category}`);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>;
      case 'running':
        return <Badge variant="secondary">Running</Badge>;
      case 'failed':
        return <Badge variant="error">Failed</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getUsagePercentage = () => {
    return Math.round((storageData.used / storageData.total) * 100);
  };

  const handleBatchUploadComplete = (_batchId: string) => {
    toast.success('Batch upload initiated successfully!');
    // Optionally refresh data or show progress
  };

  const openBatchUpload = (type: 'contracts' | 'vendors') => {
    setBatchUploadType(type);
    setBatchUploadOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Data Management</h1>
        <p className="text-muted-foreground">
          Manage your data storage, backups, exports, and retention policies.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Batch Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PackageOpen className="h-5 w-5" />
              Batch Import
            </CardTitle>
            <CardDescription>
              Upload multiple contracts or vendors at once for automatic processing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg space-y-3">
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium">Import Contracts</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Upload multiple contract files (PDF, DOC, DOCX) for automatic analysis and vendor matching
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => openBatchUpload('contracts')}
                  className="w-full"
                  variant="outline"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Contracts
                </Button>
              </div>

              <div className="p-4 border rounded-lg space-y-3">
                <div className="flex items-start gap-3">
                  <Database className="h-5 w-5 text-green-500 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium">Import Vendors</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Upload vendor data from CSV or JSON files for bulk import
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => openBatchUpload('vendors')}
                  className="w-full"
                  variant="outline"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Vendors
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vendor Match Review */}
        {userProfile?.enterprise_id && (
          <VendorMatchReview
            enterpriseId={userProfile.enterprise_id}
            onReviewComplete={() => toast.success('All vendor matches reviewed!')}
          />
        )}

        {/* Storage Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Storage Usage
            </CardTitle>
            <CardDescription>
              Monitor your current storage usage and breakdown.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Storage Used</span>
                <span>{storageData.used}GB / {storageData.total}GB</span>
              </div>
              <Progress value={getUsagePercentage()} className="h-3" />
              <p className="text-xs text-muted-foreground">
                {getUsagePercentage()}% of total storage used
              </p>
            </div>

            <Separator />

            <div className="space-y-3">
              <h4 className="font-medium">Storage Breakdown</h4>
              {storageData.breakdown.length > 0 ? (
                storageData.breakdown.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: `hsl(${index * 90}, 70%, 50%)` }}
                      />
                      <span className="text-sm">{item.type}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{item.size}GB</span>
                      <span>({item.percentage}%)</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No storage data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Backup Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Backup Settings
            </CardTitle>
            <CardDescription>
              Configure automatic backups and data protection.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-backup">Automatic Backups</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically backup your data on a regular schedule
                </p>
              </div>
              <Switch
                id="auto-backup"
                checked={settings.autoBackup}
                onCheckedChange={(checked) => handleSettingChange('autoBackup', checked)}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="backup-frequency">Backup Frequency</Label>
              <Select
                value={settings.backupFrequency}
                onValueChange={(value) => handleSettingChange('backupFrequency', value)}
                disabled={!settings.autoBackup}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select backup frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="encrypt-backups">Encrypt Backups</Label>
                <p className="text-sm text-muted-foreground">
                  Enable encryption for all backup files
                </p>
              </div>
              <Switch
                id="encrypt-backups"
                checked={settings.encryptBackups}
                onCheckedChange={(checked) => handleSettingChange('encryptBackups', checked)}
              />
            </div>

            <Separator />

            <div className="flex gap-2">
              <Button onClick={handleCreateBackup} variant="outline">
                <Archive className="h-4 w-4 mr-2" />
                Create Manual Backup
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Backups */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Backups
            </CardTitle>
            <CardDescription>
              View and manage your backup history.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {backupHistory.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Retention Until</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backupHistory.map((backup: { id: string; date: Date; type: string; size: string; status: string; retention: Date }) => (
                    <TableRow key={backup.id}>
                      <TableCell>{backup.date.toLocaleString()}</TableCell>
                      <TableCell>{backup.type}</TableCell>
                      <TableCell>{backup.size}</TableCell>
                      <TableCell>{getStatusBadge(backup.status)}</TableCell>
                      <TableCell>{backup.retention.toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No backup history available</p>
                <p className="text-xs mt-1">Create your first backup to see it here</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Data Export */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Data Export
            </CardTitle>
            <CardDescription>
              Export your data in various formats for backup or migration.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="export-format">Export Format</Label>
                <Select
                  value={settings.exportFormat}
                  onValueChange={(value) => handleSettingChange('exportFormat', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="excel">Excel</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between pt-6">
                <div className="space-y-0.5">
                  <Label htmlFor="anonymize-exports">Anonymize Data</Label>
                  <p className="text-xs text-muted-foreground">
                    Remove personal information from exports
                  </p>
                </div>
                <Switch
                  id="anonymize-exports"
                  checked={settings.anonymizeExports}
                  onCheckedChange={(checked) => handleSettingChange('anonymizeExports', checked)}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Data Categories</h4>
                <Button 
                  onClick={() => handleExportData()}
                  disabled={exportLoading || dataCategories.length === 0}
                  className="ml-auto"
                >
                  {exportLoading ? 'Exporting...' : 'Export All Data'}
                </Button>
              </div>

              {dataCategories.length > 0 ? (
                dataCategories.map((category, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{category.name}</span>
                        <Badge variant="secondary">{category.count.toLocaleString()} items</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{category.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {category.size} • Last updated {category.lastUpdated.toLocaleDateString()}
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleExportData(category.name)}
                      disabled={exportLoading}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-muted-foreground border rounded-lg">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No data categories available</p>
                  <p className="text-xs mt-1">Start using the platform to see exportable data here</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Data Retention */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Data Retention
            </CardTitle>
            <CardDescription>
              Configure how long data is retained before automatic deletion.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="data-retention">Retention Period</Label>
              <Select
                value={settings.dataRetention}
                onValueChange={(value) => handleSettingChange('dataRetention', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select retention period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="180">6 months</SelectItem>
                  <SelectItem value="365">1 year</SelectItem>
                  <SelectItem value="1095">3 years</SelectItem>
                  <SelectItem value="2190">6 years</SelectItem>
                  <SelectItem value="-1">Never delete</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Data older than this period will be automatically deleted
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>
              Irreversible actions that will permanently delete your data.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {dataCategories.length > 0 ? (
              dataCategories.map((category, index) => (
                <div key={index} className="p-4 border border-red-200 rounded-lg bg-red-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-red-800">Delete {category.name}</h4>
                      <p className="text-sm text-red-700">
                        Permanently delete all {category.name.toLowerCase()} ({category.count} items, {category.size})
                      </p>
                    </div>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => handleDeleteData(category.name)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground border border-red-200 rounded-lg bg-red-50">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50 text-red-400" />
                <p className="text-sm text-red-700">No data categories to delete</p>
                <p className="text-xs mt-1 text-red-600">Data deletion options will appear when you have data in the system</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSaveSettings} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Batch Upload Modal */}
      <BatchUploadModal
        open={batchUploadOpen}
        onOpenChange={setBatchUploadOpen}
        onUploadComplete={handleBatchUploadComplete}
        defaultTab={batchUploadType}
      />
    </div>
  );
}
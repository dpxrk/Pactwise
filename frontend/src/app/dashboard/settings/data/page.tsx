'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';

export default function DataSettingsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  
  // Data management settings
  const [settings, setSettings] = useState({
    autoBackup: true,
    backupFrequency: 'daily',
    dataRetention: '365', // days
    exportFormat: 'json',
    anonymizeExports: false,
    encryptBackups: true
  });

  // Storage usage data - TODO: Replace with actual API calls
  const storageData: {
    total: number;
    used: number;
    breakdown: Array<{ type: string; size: number; percentage: number }>;
  } = {
    total: 0,
    used: 0,
    breakdown: []
  };

  // Recent backups - TODO: Replace with actual API calls
  const backupHistory: Array<{
    id: string;
    date: Date;
    type: string;
    size: string;
    status: string;
    retention: Date;
  }> = [];

  // Data categories for export/deletion - TODO: Replace with actual API calls
  const dataCategories: Array<{
    name: string;
    count: number;
    description: string;
    size: string;
    lastUpdated: Date;
  }> = [];

  const handleSettingChange = (key: string, value: boolean | string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      // TODO: Implement actual API call to save settings
      // await api.settings.updateDataSettings(settings);
      toast.success('Data settings updated successfully');
    } catch (error) {
      console.error('Failed to update data settings:', error);
      toast.error('Failed to update data settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      // TODO: Implement actual API call to create backup
      // await api.backups.create();
      toast.success('Manual backup initiated');
    } catch (error) {
      console.error('Failed to create backup:', error);
      toast.error('Failed to create backup');
    }
  };

  const handleExportData = async (category?: string) => {
    setExportLoading(true);
    try {
      // TODO: Implement actual API call to export data
      // const exportUrl = await api.exports.create({ category, format: settings.exportFormat });
      // window.open(exportUrl, '_blank');
      toast.success(`${category || 'All data'} export completed`);
    } catch (error) {
      console.error('Failed to export data:', error);
      toast.error('Failed to export data');
    } finally {
      setExportLoading(false);
    }
  };

  const handleDeleteData = async (category: string) => {
    try {
      // TODO: Implement actual API call to delete data with confirmation
      // const confirmed = await confirmDeletion(category);
      // if (confirmed) {
      //   await api.data.delete({ category });
      //   toast.success(`${category} deletion completed`);
      // }
      toast.success(`${category} deletion initiated`);
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
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getUsagePercentage = () => {
    return Math.round((storageData.used / storageData.total) * 100);
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
                  {backupHistory.map((backup) => (
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
    </div>
  );
}
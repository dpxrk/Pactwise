'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Key,
  Copy,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  AlertTriangle,
  Settings,
  Activity,
  Code,
  RefreshCw,
  Clock,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';

export default function ApiSettingsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [showKey, setShowKey] = useState<{ [key: string]: boolean }>({});
  
  // API settings
  const [settings, setSettings] = useState({
    enableApi: true,
    requireAuth: true,
    rateLimitPerMinute: 100,
    allowedOrigins: 'https://app.pactwise.com',
    logRequests: true,
    cacheResponses: true
  });

  // API Keys data
  const apiKeys = [
    {
      id: 'pk_live_1234567890',
      name: 'Production API Key',
      type: 'live',
      permissions: ['read', 'write'],
      lastUsed: new Date('2024-01-15T10:30:00'),
      requests: 15420,
      created: new Date('2023-12-01'),
      status: 'active'
    },
    {
      id: 'pk_test_9876543210',
      name: 'Development API Key',
      type: 'test',
      permissions: ['read'],
      lastUsed: new Date('2024-01-14T14:22:00'),
      requests: 3247,
      created: new Date('2024-01-01'),
      status: 'active'
    },
    {
      id: 'pk_live_0987654321',
      name: 'Legacy Integration',
      type: 'live',
      permissions: ['read'],
      lastUsed: new Date('2023-11-20T09:15:00'),
      requests: 892,
      created: new Date('2023-06-15'),
      status: 'inactive'
    }
  ];

  // API usage statistics
  const usageStats = {
    totalRequests: 19559,
    successRate: 99.2,
    avgResponseTime: 145, // ms
    monthlyLimit: 50000,
    dailyUsage: [
      { date: '2024-01-15', requests: 1420 },
      { date: '2024-01-14', requests: 1367 },
      { date: '2024-01-13', requests: 1523 },
      { date: '2024-01-12', requests: 1189 },
      { date: '2024-01-11', requests: 1445 }
    ]
  };

  // Recent API activity
  const recentActivity = [
    {
      id: 1,
      endpoint: '/api/contracts',
      method: 'GET',
      statusCode: 200,
      responseTime: 142,
      timestamp: new Date('2024-01-15T10:30:00'),
      keyId: 'pk_live_1234567890'
    },
    {
      id: 2,
      endpoint: '/api/vendors',
      method: 'POST',
      statusCode: 201,
      responseTime: 287,
      timestamp: new Date('2024-01-15T10:28:00'),
      keyId: 'pk_live_1234567890'
    },
    {
      id: 3,
      endpoint: '/api/contracts/123',
      method: 'PUT',
      statusCode: 200,
      responseTime: 195,
      timestamp: new Date('2024-01-15T10:25:00'),
      keyId: 'pk_test_9876543210'
    }
  ];

  const handleSettingChange = (key: string, value: boolean | string | number) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('API settings updated successfully');
    } catch (error) {
      toast.error('Failed to update API settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateApiKey = () => {
    toast.success('API key creation dialog would open here');
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success('API key copied to clipboard');
  };

  const handleToggleKeyVisibility = (keyId: string) => {
    setShowKey(prev => ({ ...prev, [keyId]: !prev[keyId] }));
  };

  const handleRevokeKey = (keyId: string) => {
    toast.success(`API key ${keyId} revoked`);
  };

  const handleRegenerateKey = (keyId: string) => {
    toast.success(`API key ${keyId} regenerated`);
  };

  const maskApiKey = (key: string) => {
    return key.slice(0, 8) + '...' + key.slice(-4);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>;
      case 'revoked':
        return <Badge variant="destructive">Revoked</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getMethodBadge = (method: string) => {
    const colors = {
      GET: 'bg-blue-100 text-blue-800',
      POST: 'bg-green-100 text-green-800',
      PUT: 'bg-yellow-100 text-yellow-800',
      DELETE: 'bg-red-100 text-red-800'
    };
    return <Badge className={colors[method as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>{method}</Badge>;
  };

  const getStatusColor = (code: number) => {
    if (code >= 200 && code < 300) return 'text-green-600';
    if (code >= 400 && code < 500) return 'text-yellow-600';
    if (code >= 500) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">API Settings</h1>
        <p className="text-muted-foreground">
          Manage API keys, configure access controls, and monitor API usage.
        </p>
      </div>

      <Tabs defaultValue="keys" className="space-y-6">
        <TabsList>
          <TabsTrigger value="keys">API Keys</TabsTrigger>
          <TabsTrigger value="settings">Configuration</TabsTrigger>
          <TabsTrigger value="usage">Usage & Analytics</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="keys" className="space-y-6">
          {/* API Keys Management */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    API Keys
                  </CardTitle>
                  <CardDescription>
                    Manage your API keys for accessing the Pactwise API.
                  </CardDescription>
                </div>
                <Button onClick={handleCreateApiKey}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create API Key
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {apiKeys.map((key) => (
                  <div key={key.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{key.name}</h4>
                          {getStatusBadge(key.status)}
                          <Badge variant="outline" className={key.type === 'live' ? 'border-red-200 text-red-700' : 'border-blue-200 text-blue-700'}>
                            {key.type === 'live' ? 'Live' : 'Test'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Created: {key.created.toLocaleDateString()}</span>
                          <span>Last used: {key.lastUsed.toLocaleDateString()}</span>
                          <span>{key.requests.toLocaleString()} requests</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleKeyVisibility(key.id)}
                        >
                          {showKey[key.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyKey(key.id)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRegenerateKey(key.id)}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevokeKey(key.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 font-mono text-sm">
                        <span className="text-muted-foreground">Key:</span>
                        <code className="bg-muted px-2 py-1 rounded">
                          {showKey[key.id] ? key.id : maskApiKey(key.id)}
                        </code>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Permissions:</span>
                        {key.permissions.map((permission) => (
                          <Badge key={permission} variant="outline" className="text-xs">
                            {permission}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          {/* API Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                API Configuration
              </CardTitle>
              <CardDescription>
                Configure API access controls and security settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enable-api">Enable API Access</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow API access to your account
                  </p>
                </div>
                <Switch
                  id="enable-api"
                  checked={settings.enableApi}
                  onCheckedChange={(checked) => handleSettingChange('enableApi', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="require-auth">Require Authentication</Label>
                  <p className="text-sm text-muted-foreground">
                    All API requests must include valid authentication
                  </p>
                </div>
                <Switch
                  id="require-auth"
                  checked={settings.requireAuth}
                  onCheckedChange={(checked) => handleSettingChange('requireAuth', checked)}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="rate-limit">Rate Limit (requests per minute)</Label>
                <Input
                  id="rate-limit"
                  type="number"
                  value={settings.rateLimitPerMinute}
                  onChange={(e) => handleSettingChange('rateLimitPerMinute', parseInt(e.target.value))}
                  className="w-full"
                />
                <p className="text-sm text-muted-foreground">
                  Maximum number of API requests per minute per API key
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="allowed-origins">Allowed Origins</Label>
                <Input
                  id="allowed-origins"
                  value={settings.allowedOrigins}
                  onChange={(e) => handleSettingChange('allowedOrigins', e.target.value)}
                  placeholder="https://example.com, https://app.example.com"
                  className="w-full"
                />
                <p className="text-sm text-muted-foreground">
                  Comma-separated list of allowed CORS origins
                </p>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="log-requests">Log API Requests</Label>
                  <p className="text-sm text-muted-foreground">
                    Store detailed logs of all API requests
                  </p>
                </div>
                <Switch
                  id="log-requests"
                  checked={settings.logRequests}
                  onCheckedChange={(checked) => handleSettingChange('logRequests', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="cache-responses">Cache Responses</Label>
                  <p className="text-sm text-muted-foreground">
                    Cache API responses to improve performance
                  </p>
                </div>
                <Switch
                  id="cache-responses"
                  checked={settings.cacheResponses}
                  onCheckedChange={(checked) => handleSettingChange('cacheResponses', checked)}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSaveSettings} disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="usage" className="space-y-6">
          {/* Usage Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{usageStats.totalRequests.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {Math.round((usageStats.totalRequests / usageStats.monthlyLimit) * 100)}% of monthly limit
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{usageStats.successRate}%</div>
                <p className="text-xs text-muted-foreground">
                  <TrendingUp className="inline h-3 w-3 mr-1" />
                  +0.3% from last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{usageStats.avgResponseTime}ms</div>
                <p className="text-xs text-muted-foreground">
                  -12ms from last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Monthly Limit</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{usageStats.monthlyLimit.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  Resets in 16 days
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Daily Usage
              </CardTitle>
              <CardDescription>
                API request volume over the past 5 days.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {usageStats.dailyUsage.map((day, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm">{new Date(day.date).toLocaleDateString()}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-muted h-2 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${(day.requests / Math.max(...usageStats.dailyUsage.map(d => d.requests))) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-16 text-right">{day.requests.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          {/* Recent API Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent API Activity
              </CardTitle>
              <CardDescription>
                Monitor recent API requests and responses.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Endpoint</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Response Time</TableHead>
                    <TableHead>API Key</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentActivity.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell className="text-sm">
                        {activity.timestamp.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {getMethodBadge(activity.method)}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {activity.endpoint}
                      </TableCell>
                      <TableCell className={getStatusColor(activity.statusCode)}>
                        {activity.statusCode}
                      </TableCell>
                      <TableCell>{activity.responseTime}ms</TableCell>
                      <TableCell className="font-mono text-xs">
                        {maskApiKey(activity.keyId)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* API Documentation Link */}
      <Alert>
        <Code className="h-4 w-4" />
        <AlertTitle>API Documentation</AlertTitle>
        <AlertDescription>
          Need help getting started? Check out our comprehensive API documentation with examples and interactive testing.
          <Button variant="link" className="p-0 h-auto ml-2">
            View Documentation →
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
}
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Webhook,
  Plus,
  Edit,
  Trash2,
  Play,
  Pause,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Settings,
  Activity,
  Code
} from 'lucide-react';
import { toast } from 'sonner';

export default function WebhooksSettingsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<string | null>(null);
  
  // Webhook configuration
  const [newWebhook, setNewWebhook] = useState({
    name: '',
    url: '',
    events: [] as string[],
    secret: '',
    enabled: true,
    retryOnFailure: true,
    maxRetries: 3
  });

  // Existing webhooks
  const [webhooks, setWebhooks] = useState([
    {
      id: 'wh_1234567890',
      name: 'Contract Updates',
      url: 'https://api.example.com/webhooks/contracts',
      events: ['contract.created', 'contract.updated', 'contract.signed'],
      enabled: true,
      lastTriggered: new Date('2024-01-15T10:30:00'),
      successRate: 98.5,
      totalDeliveries: 2847,
      created: new Date('2023-12-01')
    },
    {
      id: 'wh_0987654321',
      name: 'Vendor Notifications',
      url: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX',
      events: ['vendor.created', 'vendor.updated'],
      enabled: true,
      lastTriggered: new Date('2024-01-14T14:22:00'),
      successRate: 100,
      totalDeliveries: 156,
      created: new Date('2024-01-01')
    },
    {
      id: 'wh_5432109876',
      name: 'Legacy Integration',
      url: 'https://legacy-system.company.com/api/webhook',
      events: ['contract.expired'],
      enabled: false,
      lastTriggered: new Date('2023-11-20T09:15:00'),
      successRate: 85.2,
      totalDeliveries: 89,
      created: new Date('2023-06-15')
    }
  ]);

  // Available webhook events
  const availableEvents = [
    { value: 'contract.created', label: 'Contract Created', description: 'Triggered when a new contract is created' },
    { value: 'contract.updated', label: 'Contract Updated', description: 'Triggered when a contract is modified' },
    { value: 'contract.signed', label: 'Contract Signed', description: 'Triggered when a contract is signed' },
    { value: 'contract.expired', label: 'Contract Expired', description: 'Triggered when a contract expires' },
    { value: 'vendor.created', label: 'Vendor Created', description: 'Triggered when a new vendor is added' },
    { value: 'vendor.updated', label: 'Vendor Updated', description: 'Triggered when vendor information is modified' },
    { value: 'user.created', label: 'User Created', description: 'Triggered when a new user is added' },
    { value: 'billing.invoice', label: 'Billing Invoice', description: 'Triggered when a new invoice is generated' }
  ];

  // Recent webhook deliveries
  const recentDeliveries = [
    {
      id: 1,
      webhookId: 'wh_1234567890',
      event: 'contract.created',
      url: 'https://api.example.com/webhooks/contracts',
      status: 'success',
      responseCode: 200,
      responseTime: 145,
      timestamp: new Date('2024-01-15T10:30:00'),
      attempts: 1
    },
    {
      id: 2,
      webhookId: 'wh_0987654321',
      event: 'vendor.updated',
      url: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX',
      status: 'success',
      responseCode: 200,
      responseTime: 287,
      timestamp: new Date('2024-01-15T10:28:00'),
      attempts: 1
    },
    {
      id: 3,
      webhookId: 'wh_1234567890',
      event: 'contract.updated',
      url: 'https://api.example.com/webhooks/contracts',
      status: 'failed',
      responseCode: 500,
      responseTime: 5000,
      timestamp: new Date('2024-01-15T10:25:00'),
      attempts: 3
    }
  ];

  const handleCreateWebhook = async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const webhook = {
        id: `wh_${Date.now()}`,
        name: newWebhook.name,
        url: newWebhook.url,
        events: newWebhook.events,
        enabled: newWebhook.enabled,
        lastTriggered: new Date(),
        successRate: 0,
        totalDeliveries: 0,
        created: new Date()
      };
      
      setWebhooks(prev => [...prev, webhook]);
      setNewWebhook({
        name: '',
        url: '',
        events: [],
        secret: '',
        enabled: true,
        retryOnFailure: true,
        maxRetries: 3
      });
      
      toast.success('Webhook created successfully');
    } catch (error) {
      toast.error('Failed to create webhook');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleWebhook = (id: string) => {
    setWebhooks(prev => prev.map(webhook => 
      webhook.id === id ? { ...webhook, enabled: !webhook.enabled } : webhook
    ));
    toast.success('Webhook status updated');
  };

  const handleDeleteWebhook = (id: string) => {
    setWebhooks(prev => prev.filter(webhook => webhook.id !== id));
    toast.success('Webhook deleted');
  };

  const handleTestWebhook = async (id: string) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Test webhook sent successfully');
    } catch (error) {
      toast.error('Failed to send test webhook');
    }
  };

  const handleEventToggle = (eventValue: string) => {
    setNewWebhook(prev => ({
      ...prev,
      events: prev.events.includes(eventValue)
        ? prev.events.filter(e => e !== eventValue)
        : [...prev.events, eventValue]
    }));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-100 text-green-800">Success</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 95) return 'text-green-600';
    if (rate >= 85) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Webhooks</h1>
        <p className="text-muted-foreground">
          Configure webhooks to receive real-time notifications about events in your account.
        </p>
      </div>

      <Tabs defaultValue="webhooks" className="space-y-6">
        <TabsList>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="create">Create Webhook</TabsTrigger>
          <TabsTrigger value="deliveries">Recent Deliveries</TabsTrigger>
          <TabsTrigger value="events">Available Events</TabsTrigger>
        </TabsList>

        <TabsContent value="webhooks" className="space-y-6">
          {/* Existing Webhooks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="h-5 w-5" />
                Your Webhooks
              </CardTitle>
              <CardDescription>
                Manage your existing webhook endpoints and their configurations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {webhooks.map((webhook) => (
                  <div key={webhook.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{webhook.name}</h4>
                          {webhook.enabled ? (
                            <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground font-mono">{webhook.url}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Created: {webhook.created.toLocaleDateString()}</span>
                          {webhook.lastTriggered && (
                            <span>Last triggered: {webhook.lastTriggered.toLocaleDateString()}</span>
                          )}
                          <span className={getSuccessRateColor(webhook.successRate)}>
                            {webhook.successRate}% success rate
                          </span>
                          <span>{webhook.totalDeliveries} deliveries</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTestWebhook(webhook.id)}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingWebhook(webhook.id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleWebhook(webhook.id)}
                        >
                          {webhook.enabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteWebhook(webhook.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Events:</span>
                        <div className="flex flex-wrap gap-1">
                          {webhook.events.map((event) => (
                            <Badge key={event} variant="outline" className="text-xs">
                              {event}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {webhooks.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Webhook className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No webhooks configured yet.</p>
                    <p className="text-sm">Create your first webhook to start receiving notifications.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create" className="space-y-6">
          {/* Create New Webhook */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create New Webhook
              </CardTitle>
              <CardDescription>
                Set up a new webhook endpoint to receive event notifications.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="webhook-name">Webhook Name</Label>
                  <Input
                    id="webhook-name"
                    placeholder="e.g., Contract Updates"
                    value={newWebhook.name}
                    onChange={(e) => setNewWebhook(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="webhook-url">Endpoint URL</Label>
                  <Input
                    id="webhook-url"
                    placeholder="https://api.example.com/webhook"
                    value={newWebhook.url}
                    onChange={(e) => setNewWebhook(prev => ({ ...prev, url: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Events to Subscribe</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {availableEvents.map((event) => (
                    <div key={event.value} className="flex items-center space-x-2 p-2 border rounded">
                      <input
                        type="checkbox"
                        id={event.value}
                        checked={newWebhook.events.includes(event.value)}
                        onChange={() => handleEventToggle(event.value)}
                        className="rounded"
                      />
                      <div className="flex-1">
                        <label htmlFor={event.value} className="text-sm font-medium cursor-pointer">
                          {event.label}
                        </label>
                        <p className="text-xs text-muted-foreground">{event.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="webhook-secret">Secret (Optional)</Label>
                <Input
                  id="webhook-secret"
                  placeholder="Your webhook signing secret"
                  value={newWebhook.secret}
                  onChange={(e) => setNewWebhook(prev => ({ ...prev, secret: e.target.value }))}
                />
                <p className="text-sm text-muted-foreground">
                  Used to verify webhook authenticity. We'll include this in the X-Webhook-Secret header.
                </p>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Configuration</h4>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="enabled">Enable Webhook</Label>
                    <p className="text-sm text-muted-foreground">
                      Start receiving events immediately after creation
                    </p>
                  </div>
                  <Switch
                    id="enabled"
                    checked={newWebhook.enabled}
                    onCheckedChange={(checked) => setNewWebhook(prev => ({ ...prev, enabled: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="retry">Retry on Failure</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically retry failed webhook deliveries
                    </p>
                  </div>
                  <Switch
                    id="retry"
                    checked={newWebhook.retryOnFailure}
                    onCheckedChange={(checked) => setNewWebhook(prev => ({ ...prev, retryOnFailure: checked }))}
                  />
                </div>

                {newWebhook.retryOnFailure && (
                  <div className="space-y-2">
                    <Label htmlFor="max-retries">Maximum Retries</Label>
                    <Select
                      value={newWebhook.maxRetries.toString()}
                      onValueChange={(value) => setNewWebhook(prev => ({ ...prev, maxRetries: parseInt(value) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 retry</SelectItem>
                        <SelectItem value="3">3 retries</SelectItem>
                        <SelectItem value="5">5 retries</SelectItem>
                        <SelectItem value="10">10 retries</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <Button 
                  onClick={handleCreateWebhook} 
                  disabled={isLoading || !newWebhook.name || !newWebhook.url || newWebhook.events.length === 0}
                >
                  {isLoading ? 'Creating...' : 'Create Webhook'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deliveries" className="space-y-6">
          {/* Recent Deliveries */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Deliveries
              </CardTitle>
              <CardDescription>
                Monitor webhook delivery attempts and their outcomes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Webhook</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Response</TableHead>
                    <TableHead>Response Time</TableHead>
                    <TableHead>Attempts</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentDeliveries.map((delivery) => (
                    <TableRow key={delivery.id}>
                      <TableCell className="text-sm">
                        {delivery.timestamp.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {delivery.event}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {delivery.webhookId}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(delivery.status)}
                      </TableCell>
                      <TableCell className={delivery.responseCode >= 200 && delivery.responseCode < 300 ? 'text-green-600' : 'text-red-600'}>
                        {delivery.responseCode}
                      </TableCell>
                      <TableCell>{delivery.responseTime}ms</TableCell>
                      <TableCell>{delivery.attempts}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-6">
          {/* Available Events Documentation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Available Events
              </CardTitle>
              <CardDescription>
                Complete list of webhook events you can subscribe to.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {availableEvents.map((event) => (
                  <div key={event.value} className="p-4 border rounded-lg">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                          {event.value}
                        </code>
                      </div>
                      <h4 className="font-medium">{event.label}</h4>
                      <p className="text-sm text-muted-foreground">{event.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Webhook Security Information */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Webhook Security</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>To ensure webhook authenticity:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Always use HTTPS endpoints</li>
                <li>Verify the X-Webhook-Secret header if you provided a secret</li>
                <li>Validate the request payload structure</li>
                <li>Implement idempotency to handle duplicate deliveries</li>
              </ul>
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    </div>
  );
}
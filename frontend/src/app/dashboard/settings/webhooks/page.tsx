'use client';

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
  Code,
  Loader2
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useWebhookList,
  useCreateWebhook,
  useDeleteWebhook,
  useTestWebhook,
  useEnableWebhook,
  useDisableWebhook,
  useWebhookDeliveries,
  type WebhookEvent,
  type CreateWebhookPayload,
} from '@/hooks/queries/useWebhooks';

export default function WebhooksSettingsPage() {
  const [selectedWebhookId, setSelectedWebhookId] = useState<string | null>(null);

  // Webhook form state
  const [newWebhook, setNewWebhook] = useState<CreateWebhookPayload>({
    name: '',
    url: '',
    events: [],
    secret: '',
    is_active: true,
  });

  // Fetch webhooks from API
  const { data: webhooks, isLoading, error } = useWebhookList();

  // Fetch deliveries for selected webhook
  const { data: deliveryData } = useWebhookDeliveries(selectedWebhookId || '', 50);

  // Mutations
  const createWebhook = useCreateWebhook();
  const deleteWebhook = useDeleteWebhook();
  const testWebhook = useTestWebhook();
  const enableWebhook = useEnableWebhook();
  const disableWebhook = useDisableWebhook();

  // Available webhook events
  const availableEvents: { value: WebhookEvent; label: string; description: string }[] = [
    { value: 'contract.created', label: 'Contract Created', description: 'Triggered when a new contract is created' },
    { value: 'contract.updated', label: 'Contract Updated', description: 'Triggered when a contract is modified' },
    { value: 'contract.approved', label: 'Contract Approved', description: 'Triggered when a contract is approved' },
    { value: 'contract.expiring', label: 'Contract Expiring', description: 'Triggered when a contract is about to expire' },
    { value: 'vendor.created', label: 'Vendor Created', description: 'Triggered when a new vendor is added' },
    { value: 'vendor.updated', label: 'Vendor Updated', description: 'Triggered when vendor information is modified' },
    { value: 'approval.requested', label: 'Approval Requested', description: 'Triggered when approval is requested' },
    { value: 'approval.completed', label: 'Approval Completed', description: 'Triggered when approval is completed' },
    { value: 'budget.threshold_reached', label: 'Budget Threshold', description: 'Triggered when budget threshold is reached' },
    { value: 'user.invited', label: 'User Invited', description: 'Triggered when a new user is invited' },
    { value: 'analysis.completed', label: 'Analysis Complete', description: 'Triggered when AI analysis is completed' },
    { value: 'alert.triggered', label: 'Alert Triggered', description: 'Triggered when a system alert fires' },
  ];

  const handleCreateWebhook = async () => {
    if (!newWebhook.name || !newWebhook.url || newWebhook.events.length === 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await createWebhook.mutateAsync(newWebhook);
      setNewWebhook({
        name: '',
        url: '',
        events: [],
        secret: '',
        is_active: true,
      });
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleToggleWebhook = async (id: string, currentlyEnabled: boolean) => {
    try {
      if (currentlyEnabled) {
        await disableWebhook.mutateAsync(id);
      } else {
        await enableWebhook.mutateAsync(id);
      }
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    if (!confirm('Are you sure you want to delete this webhook?')) return;

    try {
      await deleteWebhook.mutateAsync(id);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleTestWebhook = async (id: string) => {
    try {
      await testWebhook.mutateAsync({ webhookId: id });
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleEventToggle = (eventValue: WebhookEvent) => {
    setNewWebhook(prev => ({
      ...prev,
      events: prev.events.includes(eventValue)
        ? prev.events.filter(e => e !== eventValue)
        : [...prev.events, eventValue]
    }));
  };

  const getStatusBadge = (success: boolean) => {
    if (success) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Success</Badge>;
    }
    return <Badge variant="destructive">Failed</Badge>;
  };

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 95) return 'text-green-600';
    if (rate >= 85) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return <WebhooksPageSkeleton />;
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Loading Webhooks</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'Failed to load webhooks. You may need admin permissions.'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

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
                {webhooks && webhooks.length > 0 ? (
                  webhooks.map((webhook) => (
                    <div key={webhook.id} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{webhook.name}</h4>
                            {webhook.is_active ? (
                              <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>
                            ) : (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground font-mono">{webhook.url}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>Created: {new Date(webhook.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleTestWebhook(webhook.id)}
                            disabled={testWebhook.isPending}
                          >
                            {testWebhook.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleWebhook(webhook.id, webhook.is_active)}
                          >
                            {webhook.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteWebhook(webhook.id)}
                            disabled={deleteWebhook.isPending}
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
                  ))
                ) : (
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
                  <Label htmlFor="webhook-name">Webhook Name *</Label>
                  <Input
                    id="webhook-name"
                    placeholder="e.g., Contract Updates"
                    value={newWebhook.name}
                    onChange={(e) => setNewWebhook(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="webhook-url">Endpoint URL *</Label>
                  <Input
                    id="webhook-url"
                    placeholder="https://your-endpoint.com/webhook"
                    value={newWebhook.url}
                    onChange={(e) => setNewWebhook(prev => ({ ...prev, url: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Events to Subscribe *</Label>
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
                  placeholder="Leave blank to auto-generate"
                  value={newWebhook.secret || ''}
                  onChange={(e) => setNewWebhook(prev => ({ ...prev, secret: e.target.value }))}
                />
                <p className="text-sm text-muted-foreground">
                  Used to verify webhook authenticity. If left blank, a secure secret will be generated for you.
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
                    checked={newWebhook.is_active}
                    onCheckedChange={(checked) => setNewWebhook(prev => ({ ...prev, is_active: checked }))}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleCreateWebhook}
                  disabled={createWebhook.isPending || !newWebhook.name || !newWebhook.url || newWebhook.events.length === 0}
                >
                  {createWebhook.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Webhook'
                  )}
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
                {webhooks && webhooks.length > 0 && (
                  <div className="mt-2">
                    <Select
                      value={selectedWebhookId || ''}
                      onValueChange={setSelectedWebhookId}
                    >
                      <SelectTrigger className="w-64">
                        <SelectValue placeholder="Select a webhook" />
                      </SelectTrigger>
                      <SelectContent>
                        {webhooks.map((webhook) => (
                          <SelectItem key={webhook.id} value={webhook.id}>
                            {webhook.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedWebhookId && deliveryData?.deliveries ? (
                <>
                  {deliveryData.stats && (
                    <div className="mb-4 p-3 bg-muted rounded-lg">
                      <div className="flex gap-6 text-sm">
                        <span>Total: {deliveryData.stats.total}</span>
                        <span className="text-green-600">Successful: {deliveryData.stats.successful}</span>
                        <span className="text-red-600">Failed: {deliveryData.stats.failed}</span>
                        <span className={getSuccessRateColor(deliveryData.stats.success_rate)}>
                          Success Rate: {deliveryData.stats.success_rate}%
                        </span>
                      </div>
                    </div>
                  )}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Event</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Response</TableHead>
                        <TableHead>Duration</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deliveryData.deliveries.length > 0 ? (
                        deliveryData.deliveries.map((delivery) => (
                          <TableRow key={delivery.id}>
                            <TableCell className="text-sm">
                              {new Date(delivery.created_at).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {delivery.event}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(delivery.success)}
                            </TableCell>
                            <TableCell className={delivery.status_code && delivery.status_code >= 200 && delivery.status_code < 300 ? 'text-green-600' : 'text-red-600'}>
                              {delivery.status_code || 'N/A'}
                            </TableCell>
                            <TableCell>{delivery.duration_ms}ms</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            No deliveries yet for this webhook.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a webhook to view its delivery history.</p>
                </div>
              )}
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
                <li>Verify the X-Webhook-Signature header using your secret</li>
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

function WebhooksPageSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-32 mb-2" />
        <Skeleton className="h-5 w-64" />
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-6 w-48 mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

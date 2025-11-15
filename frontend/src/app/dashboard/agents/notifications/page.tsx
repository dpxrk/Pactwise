'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCircle,
  Calendar,
  AlertOctagon,
  BarChart2,
  ArrowLeft,
  Play,
  Download,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Mail,
  MessageSquare,
  Smartphone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { agentsAPI } from '@/lib/api/agents';
import { useAuth } from '@/hooks/useAuth';

interface ProcessingResult {
  status: 'success' | 'error' | 'processing';
  data?: any;
  error?: string;
  processingTime?: number;
}

interface NotificationItem {
  id: string;
  type: string;
  subject: string;
  recipients: string[];
  channels: ('email' | 'slack' | 'in-app')[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'sent' | 'pending' | 'failed';
  scheduledFor?: string;
  sentAt?: string;
}

interface DeliveryMetrics {
  channel: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  failed: number;
  deliveryRate: number;
  openRate: number;
}

interface EscalationPath {
  level: number;
  role: string;
  recipients: string[];
  timeframe: string;
  status: 'pending' | 'notified' | 'acknowledged';
}

export default function NotificationsAgentPage() {
  const router = useRouter();
  const { userProfile } = useAuth();
  const [notificationQuery, setNotificationQuery] = useState<string>('');
  const [activeCapability, setActiveCapability] = useState<string>('contract-expiry');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ProcessingResult | null>(null);

  const capabilities = [
    {
      id: 'contract-expiry',
      name: 'Contract Expiry Alerts',
      icon: Bell,
      description: 'Send notifications for upcoming contract expirations',
    },
    {
      id: 'approval-notifications',
      name: 'Approval Notifications',
      icon: CheckCircle,
      description: 'Alert stakeholders about pending approvals',
    },
    {
      id: 'automated-reminders',
      name: 'Automated Reminders',
      icon: Calendar,
      description: 'Schedule recurring reminders for key dates and actions',
    },
    {
      id: 'critical-escalations',
      name: 'Critical Escalations',
      icon: AlertOctagon,
      description: 'Escalate urgent issues to appropriate stakeholders',
    },
    {
      id: 'notification-analytics',
      name: 'Notification Analytics',
      icon: BarChart2,
      description: 'Track delivery and engagement metrics',
    },
  ];

  const activeCapabilityData = capabilities.find((c) => c.id === activeCapability);

  const handleProcess = async () => {
    if (!notificationQuery.trim()) {
      toast.error('Please enter a notification query or parameter');
      return;
    }

    if (!userProfile?.id || !userProfile?.enterprise_id) {
      toast.error('User profile not loaded');
      return;
    }

    setProcessing(true);
    setResult({ status: 'processing' });

    try {
      const task = await agentsAPI.createAgentTask({
        type: 'notifications',
        data: {
          capability: activeCapability,
          query: notificationQuery.trim(),
        },
        priority: 8,
        userId: userProfile.id,
        enterpriseId: userProfile.enterprise_id,
      });

      toast.success('Notification task created');

      const pollInterval = setInterval(async () => {
        try {
          const status = await agentsAPI.getTaskStatus(task.id);

          if (status.status === 'completed') {
            clearInterval(pollInterval);
            setResult({
              status: 'success',
              data: status.result,
              processingTime: status.processing_time_ms,
            });
            setProcessing(false);
            toast.success('Notification task completed');
          } else if (status.status === 'failed') {
            clearInterval(pollInterval);
            setResult({
              status: 'error',
              error: status.error || 'Notification task failed',
            });
            setProcessing(false);
            toast.error('Notification task failed');
          }
        } catch (error) {
          console.error('Polling error:', error);
        }
      }, 2000);

      setTimeout(() => {
        if (processing) {
          clearInterval(pollInterval);
          setProcessing(false);
          setResult({
            status: 'error',
            error: 'Task timeout - taking longer than expected',
          });
          toast.error('Task timeout');
        }
      }, 120000);
    } catch (error) {
      console.error('Notification error:', error);
      setProcessing(false);
      setResult({
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to process notification',
      });
      toast.error('Failed to start notification task');
    }
  };

  const handleDownload = () => {
    if (!result?.data) return;

    const blob = new Blob([JSON.stringify(result.data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notifications-${activeCapability}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email':
        return <Mail className="w-3 h-3" />;
      case 'slack':
        return <MessageSquare className="w-3 h-3" />;
      case 'in-app':
        return <Smartphone className="w-3 h-3" />;
      default:
        return <Bell className="w-3 h-3" />;
    }
  };

  const renderNotificationList = (notifications: NotificationItem[]) => (
    <div className="space-y-3 mb-6">
      <h4 className="text-sm font-semibold text-purple-900 font-mono mb-3">
        NOTIFICATIONS
      </h4>
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className="border border-ghost-300 bg-white p-4"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h5 className="font-semibold text-purple-900 mb-1">{notification.subject}</h5>
              <div className="text-xs text-ghost-600 font-mono">
                Type: {notification.type}
              </div>
            </div>
            <Badge
              variant="outline"
              className={`text-xs ${
                notification.priority === 'critical'
                  ? 'border-red-500 text-red-700 bg-red-50'
                  : notification.priority === 'high'
                  ? 'border-orange-500 text-orange-700 bg-orange-50'
                  : notification.priority === 'medium'
                  ? 'border-yellow-500 text-yellow-700 bg-yellow-50'
                  : 'border-blue-500 text-blue-700 bg-blue-50'
              }`}
            >
              {notification.priority.toUpperCase()}
            </Badge>
          </div>

          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center gap-1">
              {notification.channels.map((channel, idx) => (
                <span
                  key={idx}
                  className="flex items-center justify-center w-6 h-6 rounded-full bg-ghost-100 text-ghost-600"
                  title={channel}
                >
                  {getChannelIcon(channel)}
                </span>
              ))}
            </div>
            <Badge
              variant="outline"
              className={`text-xs ${
                notification.status === 'sent'
                  ? 'border-green-500 text-green-700'
                  : notification.status === 'pending'
                  ? 'border-yellow-500 text-yellow-700'
                  : 'border-red-500 text-red-700'
              }`}
            >
              {notification.status.toUpperCase()}
            </Badge>
          </div>

          <div className="text-xs text-ghost-600 space-y-1">
            <div>Recipients: {notification.recipients.join(', ')}</div>
            {notification.scheduledFor && (
              <div>Scheduled: {new Date(notification.scheduledFor).toLocaleString()}</div>
            )}
            {notification.sentAt && (
              <div>Sent: {new Date(notification.sentAt).toLocaleString()}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  const renderDeliveryMetrics = (metrics: DeliveryMetrics[]) => (
    <div className="space-y-4 mb-6">
      <h4 className="text-sm font-semibold text-purple-900 font-mono mb-3">
        DELIVERY METRICS BY CHANNEL
      </h4>
      {metrics.map((metric, index) => (
        <div
          key={index}
          className="border border-ghost-300 bg-white p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {getChannelIcon(metric.channel)}
              <h5 className="font-semibold text-purple-900 capitalize">{metric.channel}</h5>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <div className="text-xs text-ghost-600 font-mono mb-1">SENT</div>
              <div className="text-lg font-bold text-purple-900 font-mono">{metric.sent}</div>
            </div>
            <div>
              <div className="text-xs text-ghost-600 font-mono mb-1">DELIVERED</div>
              <div className="text-lg font-bold text-green-700 font-mono">
                {metric.delivered}
              </div>
            </div>
            <div>
              <div className="text-xs text-ghost-600 font-mono mb-1">FAILED</div>
              <div className="text-lg font-bold text-red-700 font-mono">{metric.failed}</div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-ghost-200 grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-ghost-600 font-mono mb-1">DELIVERY RATE</div>
              <div className="text-base font-bold text-purple-900 font-mono">
                {metric.deliveryRate}%
              </div>
            </div>
            <div>
              <div className="text-xs text-ghost-600 font-mono mb-1">OPEN RATE</div>
              <div className="text-base font-bold text-purple-900 font-mono">
                {metric.openRate}%
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderEscalationPath = (escalations: EscalationPath[]) => (
    <div className="space-y-3 mb-6">
      <h4 className="text-sm font-semibold text-purple-900 font-mono mb-3">
        ESCALATION PATH
      </h4>
      {escalations.map((escalation, index) => (
        <div
          key={index}
          className="border border-ghost-300 bg-white p-4"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-900 font-bold font-mono">
                {escalation.level}
              </div>
              <div>
                <h5 className="font-semibold text-purple-900">{escalation.role}</h5>
                <div className="text-xs text-ghost-600 font-mono">
                  Timeframe: {escalation.timeframe}
                </div>
              </div>
            </div>
            <Badge
              variant="outline"
              className={`text-xs ${
                escalation.status === 'acknowledged'
                  ? 'border-green-500 text-green-700 bg-green-50'
                  : escalation.status === 'notified'
                  ? 'border-yellow-500 text-yellow-700 bg-yellow-50'
                  : 'border-ghost-400 text-ghost-600'
              }`}
            >
              {escalation.status.toUpperCase()}
            </Badge>
          </div>
          <div className="text-xs text-ghost-600 mt-2">
            Recipients: {escalation.recipients.join(', ')}
          </div>
        </div>
      ))}
    </div>
  );

  const renderReminders = (reminders: any[]) => (
    <div className="space-y-3 mb-6">
      <h4 className="text-sm font-semibold text-purple-900 font-mono mb-3">
        SCHEDULED REMINDERS
      </h4>
      {reminders.map((reminder, index) => (
        <div
          key={index}
          className="border border-ghost-300 bg-white p-4"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h5 className="font-semibold text-purple-900 mb-1">{reminder.title}</h5>
              <p className="text-sm text-ghost-600 mb-2">{reminder.description}</p>
            </div>
            <Calendar className="w-5 h-5 text-purple-500 flex-shrink-0" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
            <div>
              <span className="text-ghost-600">Schedule: </span>
              <span className="text-purple-900">{reminder.schedule}</span>
            </div>
            <div>
              <span className="text-ghost-600">Next Trigger: </span>
              <span className="text-purple-900">
                {new Date(reminder.nextTrigger).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-ghost-600">Recipients: </span>
              <span className="text-purple-900">{reminder.recipients?.length || 0}</span>
            </div>
            <div>
              <span className="text-ghost-600">Channel: </span>
              <span className="text-purple-900 capitalize">{reminder.channel}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderResults = () => {
    if (!result) return null;

    if (result.status === 'processing') {
      return (
        <div className="border border-ghost-300 bg-white p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-4" />
          <p className="text-ghost-600 font-mono text-sm">Processing notification task...</p>
        </div>
      );
    }

    if (result.status === 'error') {
      return (
        <div className="border border-red-300 bg-red-50 p-6">
          <div className="flex items-center gap-2 text-red-700 mb-2">
            <XCircle className="w-5 h-5" />
            <span className="font-semibold">Task Failed</span>
          </div>
          <p className="text-sm text-red-600">{result.error}</p>
        </div>
      );
    }

    if (result.status === 'success' && result.data) {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-green-300 bg-green-50">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-semibold">Task Completed</span>
            </div>
            {result.processingTime && (
              <div className="flex items-center gap-1 text-xs text-green-600 font-mono">
                <Clock className="w-3 h-3" />
                {result.processingTime}ms
              </div>
            )}
          </div>

          <div className="border border-ghost-300 bg-ghost-50 p-6">
            {/* Contract Expiry Results */}
            {activeCapability === 'contract-expiry' && result.data.notifications && (
              <>
                <h3 className="text-lg font-bold text-purple-900 mb-4">
                  Contract Expiry Alerts
                </h3>
                {result.data.summary && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="border border-ghost-300 bg-white p-4">
                      <div className="text-xs text-ghost-600 font-mono mb-1">
                        CONTRACTS EXPIRING
                      </div>
                      <div className="text-2xl font-bold text-purple-900 font-mono">
                        {result.data.summary.total || 0}
                      </div>
                    </div>
                    <div className="border border-orange-300 bg-orange-50 p-4">
                      <div className="text-xs text-orange-600 font-mono mb-1">WITHIN 30 DAYS</div>
                      <div className="text-2xl font-bold text-orange-700 font-mono">
                        {result.data.summary.within30Days || 0}
                      </div>
                    </div>
                    <div className="border border-green-300 bg-green-50 p-4">
                      <div className="text-xs text-green-600 font-mono mb-1">ALERTS SENT</div>
                      <div className="text-2xl font-bold text-green-700 font-mono">
                        {result.data.summary.alertsSent || 0}
                      </div>
                    </div>
                  </div>
                )}
                {renderNotificationList(result.data.notifications)}
              </>
            )}

            {/* Approval Notifications Results */}
            {activeCapability === 'approval-notifications' && result.data.notifications && (
              <>
                <h3 className="text-lg font-bold text-purple-900 mb-4">
                  Approval Notifications
                </h3>
                {result.data.summary && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="border border-ghost-300 bg-white p-4">
                      <div className="text-xs text-ghost-600 font-mono mb-1">
                        PENDING APPROVALS
                      </div>
                      <div className="text-2xl font-bold text-purple-900 font-mono">
                        {result.data.summary.pending || 0}
                      </div>
                    </div>
                    <div className="border border-red-300 bg-red-50 p-4">
                      <div className="text-xs text-red-600 font-mono mb-1">OVERDUE</div>
                      <div className="text-2xl font-bold text-red-700 font-mono">
                        {result.data.summary.overdue || 0}
                      </div>
                    </div>
                    <div className="border border-green-300 bg-green-50 p-4">
                      <div className="text-xs text-green-600 font-mono mb-1">
                        NOTIFICATIONS SENT
                      </div>
                      <div className="text-2xl font-bold text-green-700 font-mono">
                        {result.data.summary.notificationsSent || 0}
                      </div>
                    </div>
                  </div>
                )}
                {renderNotificationList(result.data.notifications)}
              </>
            )}

            {/* Automated Reminders Results */}
            {activeCapability === 'automated-reminders' && result.data.reminders && (
              <>
                <h3 className="text-lg font-bold text-purple-900 mb-4">
                  Automated Reminders
                </h3>
                {result.data.summary && (
                  <div className="border border-purple-300 bg-purple-50 p-4 mb-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-xs text-purple-600 font-mono mb-1">
                          ACTIVE REMINDERS
                        </div>
                        <div className="text-xl font-bold text-purple-900 font-mono">
                          {result.data.summary.active || 0}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-purple-600 font-mono mb-1">
                          SCHEDULED TODAY
                        </div>
                        <div className="text-xl font-bold text-purple-900 font-mono">
                          {result.data.summary.today || 0}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-purple-600 font-mono mb-1">THIS WEEK</div>
                        <div className="text-xl font-bold text-purple-900 font-mono">
                          {result.data.summary.thisWeek || 0}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-purple-600 font-mono mb-1">THIS MONTH</div>
                        <div className="text-xl font-bold text-purple-900 font-mono">
                          {result.data.summary.thisMonth || 0}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {renderReminders(result.data.reminders)}
              </>
            )}

            {/* Critical Escalations Results */}
            {activeCapability === 'critical-escalations' && result.data.escalations && (
              <>
                <h3 className="text-lg font-bold text-purple-900 mb-4">
                  Critical Escalations
                </h3>
                {result.data.issue && (
                  <div className="border border-red-300 bg-red-50 p-4 mb-6">
                    <div className="flex items-start gap-3">
                      <AlertOctagon className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-red-900 mb-1">
                          {result.data.issue.title}
                        </h4>
                        <p className="text-sm text-red-700 mb-2">
                          {result.data.issue.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs font-mono">
                          <span className="text-red-600">
                            Severity: {result.data.issue.severity?.toUpperCase()}
                          </span>
                          <span className="text-red-600">
                            Detected: {new Date(result.data.issue.detectedAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {renderEscalationPath(result.data.escalations)}
              </>
            )}

            {/* Notification Analytics Results */}
            {activeCapability === 'notification-analytics' && result.data.metrics && (
              <>
                <h3 className="text-lg font-bold text-purple-900 mb-4">
                  Notification Analytics
                </h3>
                {result.data.summary && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="border border-ghost-300 bg-white p-4">
                      <div className="text-xs text-ghost-600 font-mono mb-1">TOTAL SENT</div>
                      <div className="text-2xl font-bold text-purple-900 font-mono">
                        {result.data.summary.totalSent?.toLocaleString() || 0}
                      </div>
                    </div>
                    <div className="border border-green-300 bg-green-50 p-4">
                      <div className="text-xs text-green-600 font-mono mb-1">DELIVERED</div>
                      <div className="text-2xl font-bold text-green-700 font-mono">
                        {result.data.summary.totalDelivered?.toLocaleString() || 0}
                      </div>
                    </div>
                    <div className="border border-blue-300 bg-blue-50 p-4">
                      <div className="text-xs text-blue-600 font-mono mb-1">OPENED</div>
                      <div className="text-2xl font-bold text-blue-700 font-mono">
                        {result.data.summary.totalOpened?.toLocaleString() || 0}
                      </div>
                    </div>
                    <div className="border border-red-300 bg-red-50 p-4">
                      <div className="text-xs text-red-600 font-mono mb-1">FAILED</div>
                      <div className="text-2xl font-bold text-red-700 font-mono">
                        {result.data.summary.totalFailed?.toLocaleString() || 0}
                      </div>
                    </div>
                  </div>
                )}
                {renderDeliveryMetrics(result.data.metrics)}
              </>
            )}

            {/* Raw JSON fallback */}
            {!result.data.notifications &&
              !result.data.reminders &&
              !result.data.escalations &&
              !result.data.metrics && (
                <>
                  <h3 className="text-lg font-bold text-purple-900 mb-4">Results</h3>
                  <pre className="bg-white border border-ghost-300 p-4 text-xs font-mono overflow-auto max-h-96 text-ghost-700">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </>
              )}
          </div>

          <Button onClick={handleDownload} variant="outline" className="w-full">
            <Download className="w-4 h-4 mr-2" />
            Download Results (JSON)
          </Button>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-ghost-100">
      {/* Grid background */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgb(210, 209, 222) 1px, transparent 1px),
            linear-gradient(90deg, rgb(210, 209, 222) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          opacity: 0.3,
        }}
      />

      {/* Content */}
      <div className="relative">
        <div className="container mx-auto px-6 py-8">
          {/* Back button */}
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard/agents')}
            className="mb-6 text-purple-900 hover:text-purple-700 hover:bg-ghost-200"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Agents
          </Button>

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-4xl font-bold text-purple-900 mb-2 tracking-tight">
                  Notification Manager
                </h1>
                <p className="text-ghost-600 text-lg">
                  Alert orchestration, multi-channel communication, and escalation management
                </p>
              </div>
              <div className="text-6xl">🔔</div>
            </div>

            {/* USE WHEN panel */}
            <Card className="border-purple-500 bg-white p-6">
              <h3 className="text-sm font-semibold text-purple-900 font-mono mb-2">
                USE WHEN
              </h3>
              <p className="text-ghost-600 leading-relaxed">
                The Notification Manager runs continuously 24/7, monitoring all contracts,
                vendors, and workflows to send timely alerts and reminders. It automatically
                manages multi-channel delivery (email, Slack, in-app), prioritizes urgent
                notifications, and escalates critical issues to appropriate stakeholders. Use
                this agent when you need to configure alerts, track notification delivery, or
                ensure timely communication across your organization.
              </p>
            </Card>
          </div>

          {/* Main content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column - Capabilities */}
            <div className="lg:col-span-1">
              <h2 className="text-sm font-semibold text-purple-900 font-mono mb-4">
                CAPABILITIES
              </h2>
              <div className="space-y-2">
                {capabilities.map((capability) => {
                  const Icon = capability.icon;
                  return (
                    <button
                      key={capability.id}
                      onClick={() => {
                        setActiveCapability(capability.id);
                        setResult(null);
                      }}
                      className={`w-full text-left border p-4 transition-all ${
                        activeCapability === capability.id
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-ghost-300 bg-white hover:border-purple-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Icon
                          className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                            activeCapability === capability.id
                              ? 'text-purple-600'
                              : 'text-ghost-500'
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <h3
                            className={`font-semibold mb-1 ${
                              activeCapability === capability.id
                                ? 'text-purple-900'
                                : 'text-ghost-700'
                            }`}
                          >
                            {capability.name}
                          </h3>
                          <p className="text-xs text-ghost-600 leading-relaxed">
                            {capability.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right column - Input and Results */}
            <div className="lg:col-span-2 space-y-6">
              {/* Input section */}
              <Card className="border-ghost-300 bg-white p-6">
                <h2 className="text-sm font-semibold text-purple-900 font-mono mb-4">
                  NOTIFICATION PARAMETERS
                </h2>
                {activeCapabilityData && (
                  <div className="mb-4 p-4 bg-ghost-50 border border-ghost-200">
                    <div className="flex items-start gap-3">
                      {React.createElement(activeCapabilityData.icon, {
                        className: 'w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0',
                      })}
                      <div>
                        <h3 className="font-semibold text-purple-900 mb-1">
                          {activeCapabilityData.name}
                        </h3>
                        <p className="text-sm text-ghost-600">
                          {activeCapabilityData.description}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-ghost-700 mb-2">
                      Query or Parameter
                    </label>
                    <input
                      type="text"
                      value={notificationQuery}
                      onChange={(e) => setNotificationQuery(e.target.value)}
                      placeholder="e.g., 30 days, contract approvals, weekly schedule"
                      className="w-full px-4 py-3 border border-ghost-300 bg-white text-ghost-900 placeholder-ghost-400 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                      disabled={processing}
                    />
                    <p className="text-xs text-ghost-500 mt-2">
                      Enter the notification scope, timeframe, or specific parameters
                    </p>
                  </div>

                  <Button
                    onClick={handleProcess}
                    disabled={processing || !notificationQuery.trim()}
                    className="w-full bg-purple-900 hover:bg-purple-800 text-white"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Run Task
                      </>
                    )}
                  </Button>
                </div>
              </Card>

              {/* Results section */}
              {result && (
                <Card className="border-ghost-300 bg-white p-6">
                  <h2 className="text-sm font-semibold text-purple-900 font-mono mb-4">
                    RESULTS
                  </h2>
                  {renderResults()}
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

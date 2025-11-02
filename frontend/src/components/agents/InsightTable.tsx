'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase/client';
import type { AgentType, AgentInsight, InsightType, TaskPriority } from '@/types/agents.types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle,
  TrendingUp,
  FileText,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface InsightTableProps {
  agentType: AgentType;
  limit?: number;
}

/**
 * Insights table with Bloomberg Terminal aesthetic
 * Dense display with severity indicators, monospace data
 */
export default function InsightTable({ agentType, limit = 50 }: InsightTableProps) {
  const { user } = useAuth();
  const supabase = createClient();
  const [insights, setInsights] = useState<AgentInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<TaskPriority | 'all'>('all');
  const [filterType, setFilterType] = useState<InsightType | 'all'>('all');
  const [showOnlyActionable, setShowOnlyActionable] = useState(false);

  const enterpriseId = user?.user_metadata?.enterprise_id;

  useEffect(() => {
    loadInsights();

    // Real-time subscription
    const channel = supabase
      .channel(`insights-${agentType}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_insights',
          filter: `enterprise_id=eq.${enterpriseId}`,
        },
        () => {
          loadInsights();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [agentType, enterpriseId, filterPriority, filterType, showOnlyActionable]);

  const loadInsights = async () => {
    if (!enterpriseId) return;

    try {
      // Get agent ID
      const { data: agentData } = await supabase
        .from('agents')
        .select('id')
        .eq('enterprise_id', enterpriseId)
        .eq('type', agentType)
        .single();

      if (!agentData) {
        setInsights([]);
        return;
      }

      // Build query
      let query = supabase
        .from('agent_insights')
        .select('*')
        .eq('enterprise_id', enterpriseId)
        .eq('agent_id', agentData.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      // Apply filters
      if (filterPriority !== 'all') {
        query = query.eq('priority', filterPriority);
      }
      if (filterType !== 'all') {
        query = query.eq('type', filterType);
      }
      if (showOnlyActionable) {
        query = query.eq('action_required', true);
      }

      const { data, error } = await query;

      if (error) throw error;

      setInsights((data as AgentInsight[]) || []);
    } catch (error) {
      console.error('Error loading insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (insightId: string) => {
    try {
      const { error } = await supabase
        .from('agent_insights')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', insightId);

      if (error) throw error;

      toast.success('Marked as read');
      loadInsights();
    } catch (error) {
      console.error('Error marking as read:', error);
      toast.error('Failed to update insight');
    }
  };

  const markActionTaken = async (insightId: string) => {
    try {
      const { error } = await supabase
        .from('agent_insights')
        .update({ action_taken: true })
        .eq('id', insightId);

      if (error) throw error;

      toast.success('Action recorded');
      loadInsights();
    } catch (error) {
      console.error('Error updating action:', error);
      toast.error('Failed to update insight');
    }
  };

  const getPriorityIcon = (priority: TaskPriority) => {
    switch (priority) {
      case 'critical':
        return <AlertTriangle className="w-4 h-4 text-error" />;
      case 'high':
        return <TrendingUp className="w-4 h-4 text-warning" />;
      case 'medium':
        return <Sparkles className="w-4 h-4 text-purple-500" />;
      default:
        return <FileText className="w-4 h-4 text-text-muted" />;
    }
  };

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case 'critical':
        return 'bg-error/20 text-error border-error/30';
      case 'high':
        return 'bg-warning/20 text-warning border-warning/30';
      case 'medium':
        return 'bg-purple-500/20 text-purple-500 border-purple-500/30';
      default:
        return 'bg-ghost-500/20 text-ghost-500 border-ghost-500/30';
    }
  };

  const getTypeLabel = (type: InsightType): string => {
    return type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (loading) {
    return (
      <Card className="bg-white border-ghost-300 p-6">
        <div className="text-center py-12 text-text-muted">Loading insights...</div>
      </Card>
    );
  }

  return (
    <Card className="bg-white border-ghost-300">
      {/* Filters */}
      <div className="border-b border-ghost-300 px-6 py-4 bg-ghost-50">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-text-primary">Insights</h3>
          </div>

          <Select value={filterPriority} onValueChange={(v: TaskPriority | 'all') => setFilterPriority(v)}>
            <SelectTrigger className="w-40 h-8 text-xs border-ghost-300">
              <SelectValue placeholder="All Priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          <Button
            size="sm"
            variant={showOnlyActionable ? 'default' : 'outline'}
            onClick={() => setShowOnlyActionable(!showOnlyActionable)}
            className={showOnlyActionable ? 'bg-purple-900 text-white' : 'border-ghost-300'}
          >
            Actionable Only
          </Button>
        </div>
      </div>

      {/* Header */}
      <div className="border-b border-ghost-300 px-6 py-3 bg-ghost-100">
        <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-text-muted uppercase tracking-wider">
          <div className="col-span-1">Priority</div>
          <div className="col-span-2">Type</div>
          <div className="col-span-4">Insight</div>
          <div className="col-span-2">Created</div>
          <div className="col-span-1">Action</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-1"></div>
        </div>
      </div>

      {/* Insights */}
      {insights.length === 0 ? (
        <div className="text-center py-12 text-text-muted">
          <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>No insights generated yet.</p>
        </div>
      ) : (
        <div className="divide-y divide-ghost-200">
          {insights.map((insight) => {
            const isExpanded = expandedInsight === insight._id;
            const createdAt = new Date(insight.createdAt);

            return (
              <div key={insight._id}>
                {/* Main Row */}
                <div className="grid grid-cols-12 gap-4 items-center px-6 py-3 hover:bg-ghost-50 transition-colors text-sm">
                  {/* Priority */}
                  <div className="col-span-1 flex items-center gap-2">
                    {getPriorityIcon(insight.priority)}
                  </div>

                  {/* Type */}
                  <div className="col-span-2">
                    <Badge className={getPriorityColor(insight.priority) + ' px-2 py-0.5 text-xs'}>
                      {getTypeLabel(insight.type)}
                    </Badge>
                  </div>

                  {/* Title & Description */}
                  <div className="col-span-4">
                    <div className="font-medium text-text-primary">{insight.title}</div>
                    <div className="text-xs text-text-tertiary truncate mt-0.5">
                      {insight.description}
                    </div>
                  </div>

                  {/* Created Time */}
                  <div className="col-span-2 text-text-secondary font-mono text-xs">
                    {formatDistanceToNow(createdAt, { addSuffix: true })}
                  </div>

                  {/* Action Required */}
                  <div className="col-span-1">
                    {insight.actionRequired && !insight.actionTaken && (
                      <Badge className="bg-warning/20 text-warning border-warning/30 px-2 py-0.5 text-xs">
                        Required
                      </Badge>
                    )}
                  </div>

                  {/* Read Status */}
                  <div className="col-span-1">
                    {insight.isRead ? (
                      <CheckCircle className="w-4 h-4 text-success" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-purple-500" />
                    )}
                  </div>

                  {/* Expand Button */}
                  <div className="col-span-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setExpandedInsight(isExpanded ? null : insight._id)}
                      className="h-7 w-7 p-0"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-6 py-4 bg-terminal-surface border-t border-ghost-200">
                    <div className="space-y-4">
                      {/* Full Description */}
                      <div>
                        <div className="text-xs text-text-muted uppercase tracking-wider mb-2">
                          Full Description
                        </div>
                        <div className="text-sm text-text-secondary leading-relaxed">
                          {insight.description}
                        </div>
                      </div>

                      {/* Data Payload */}
                      {insight.data && (
                        <div>
                          <div className="text-xs text-text-muted uppercase tracking-wider mb-2">
                            Insight Data
                          </div>
                          <pre className="font-mono text-xs text-purple-500 bg-ghost-100 p-3 border border-ghost-300 overflow-x-auto">
                            {JSON.stringify(insight.data, null, 2)}
                          </pre>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-3 pt-4 border-t border-ghost-300">
                        {!insight.isRead && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => markAsRead(insight._id)}
                            className="border-ghost-300"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Mark as Read
                          </Button>
                        )}

                        {insight.actionRequired && !insight.actionTaken && (
                          <Button
                            size="sm"
                            onClick={() => markActionTaken(insight._id)}
                            className="bg-purple-900 text-white hover:bg-purple-800"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Mark Action Taken
                          </Button>
                        )}

                        {insight.contractId && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              (window.location.href = `/dashboard/contracts/${insight.contractId}`)
                            }
                            className="border-purple-500 text-purple-900"
                          >
                            View Contract
                          </Button>
                        )}

                        {insight.vendorId && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              (window.location.href = `/dashboard/vendors/${insight.vendorId}`)
                            }
                            className="border-purple-500 text-purple-900"
                          >
                            View Vendor
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer Stats */}
      {insights.length > 0 && (
        <div className="border-t border-ghost-300 px-6 py-3 bg-ghost-50">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <div>Showing {insights.length} insights</div>
            <div className="flex items-center gap-4">
              <Badge className="bg-error/20 text-error border-error/30 px-2 py-0.5">
                {insights.filter((i) => i.priority === 'critical').length} Critical
              </Badge>
              <Badge className="bg-warning/20 text-warning border-warning/30 px-2 py-0.5">
                {insights.filter((i) => i.actionRequired && !i.actionTaken).length} Need Action
              </Badge>
              <Badge className="bg-ghost-500/20 text-ghost-500 border-ghost-500/30 px-2 py-0.5">
                {insights.filter((i) => !i.isRead).length} Unread
              </Badge>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

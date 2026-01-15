'use client';

import { formatDistanceToNow } from 'date-fns';
import { Brain, Search, Clock, Star, TrendingUp, Database } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import type { AgentType } from '@/types/agents.types';
import { createClient } from '@/utils/supabase/client';

interface Memory {
  id: string;
  memory_type: 'short_term' | 'long_term' | 'episodic' | 'semantic' | 'procedural';
  content: string;
  importance_score: number;
  access_count: number;
  created_at: string;
  expires_at?: string;
  tags?: string[];
}

interface MemoryViewerProps {
  agentType: AgentType;
}

/**
 * Memory viewer with Bloomberg Terminal aesthetic
 * Shows agent memories with importance scoring and search
 */
export default function MemoryViewer({ agentType }: MemoryViewerProps) {
  const { user } = useAuth();
  const supabase = createClient();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [stats, setStats] = useState({
    total: 0,
    shortTerm: 0,
    longTerm: 0,
    avgImportance: 0,
  });

  const enterpriseId = user?.user_metadata?.enterprise_id;

  useEffect(() => {
    loadMemories();
  }, [agentType, enterpriseId, filterType]);

  const loadMemories = async () => {
    if (!enterpriseId) return;

    try {
      // Get agent ID
      const { data: agentData } = await supabase
        .from('agents')
        .select('id')
        .eq('enterprise_id', enterpriseId)
        .eq('type', agentType)
        .single() as { data: { id: string } | null };

      if (!agentData) {
        setMemories([]);
        return;
      }

      // Build query
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from('agent_memory')
        .select('*')
        .eq('enterprise_id', enterpriseId)
        .eq('agent_id', agentData.id)
        .order('importance_score', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(100);

      // Apply filter
      if (filterType !== 'all') {
        query = query.eq('memory_type', filterType);
      }

      const { data, error } = await query;

      if (error) throw error;

      const memoriesData = (data as Memory[]) || [];
      setMemories(memoriesData);

      // Calculate stats
      setStats({
        total: memoriesData.length,
        shortTerm: memoriesData.filter((m) => m.memory_type === 'short_term').length,
        longTerm: memoriesData.filter((m) => m.memory_type === 'long_term').length,
        avgImportance:
          memoriesData.reduce((sum, m) => sum + m.importance_score, 0) / memoriesData.length || 0,
      });
    } catch (error) {
      console.error('Error loading memories:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMemories = memories.filter((memory) =>
    searchQuery
      ? memory.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        memory.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      : true
  );

  const getMemoryTypeColor = (type: string) => {
    switch (type) {
      case 'long_term':
        return 'bg-purple-500/20 text-purple-500 border-purple-500/30';
      case 'short_term':
        return 'bg-warning/20 text-warning border-warning/30';
      case 'episodic':
        return 'bg-success/20 text-success border-success/30';
      case 'semantic':
        return 'bg-purple-300/20 text-purple-600 border-purple-300/30';
      case 'procedural':
        return 'bg-ghost-500/20 text-ghost-700 border-ghost-500/30';
      default:
        return 'bg-ghost-500/20 text-ghost-500 border-ghost-500/30';
    }
  };

  const getImportanceStars = (score: number) => {
    const stars = Math.round(score * 5);
    return Array(5)
      .fill(0)
      .map((_, i) => (
        <Star
          key={i}
          className={`w-3 h-3 ${i < stars ? 'fill-warning text-warning' : 'text-ghost-400'}`}
        />
      ));
  };

  if (loading) {
    return (
      <Card className="bg-white border-ghost-300 p-6">
        <div className="text-center py-12 text-text-muted">Loading memories...</div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-white border-ghost-300 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-text-muted uppercase tracking-wider mb-1">
                Total Memories
              </div>
              <div className="text-2xl font-bold text-purple-900 metric-value">{stats.total}</div>
            </div>
            <Database className="w-8 h-8 text-purple-500 opacity-50" />
          </div>
        </Card>

        <Card className="bg-white border-ghost-300 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-text-muted uppercase tracking-wider mb-1">
                Short-Term (24h)
              </div>
              <div className="text-2xl font-bold text-warning metric-value">{stats.shortTerm}</div>
            </div>
            <Clock className="w-8 h-8 text-warning opacity-50" />
          </div>
        </Card>

        <Card className="bg-white border-ghost-300 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-text-muted uppercase tracking-wider mb-1">
                Long-Term
              </div>
              <div className="text-2xl font-bold text-purple-500 metric-value">{stats.longTerm}</div>
            </div>
            <Brain className="w-8 h-8 text-purple-500 opacity-50" />
          </div>
        </Card>

        <Card className="bg-white border-ghost-300 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-text-muted uppercase tracking-wider mb-1">
                Avg Importance
              </div>
              <div className="text-2xl font-bold text-text-primary metric-value">
                {stats.avgImportance.toFixed(2)}
              </div>
            </div>
            <TrendingUp className="w-8 h-8 text-text-muted opacity-50" />
          </div>
        </Card>
      </div>

      {/* Filters & Search */}
      <Card className="bg-white border-ghost-300 p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input
              placeholder="Search memories and tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-ghost-300 font-mono text-sm"
            />
          </div>

          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-48 border-ghost-300">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="short_term">Short-Term</SelectItem>
              <SelectItem value="long_term">Long-Term</SelectItem>
              <SelectItem value="episodic">Episodic</SelectItem>
              <SelectItem value="semantic">Semantic</SelectItem>
              <SelectItem value="procedural">Procedural</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Memory List */}
      <Card className="bg-white border-ghost-300">
        {filteredMemories.length === 0 ? (
          <div className="text-center py-12 text-text-muted">
            <Brain className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>No memories found. The agent will build memories as it processes tasks.</p>
          </div>
        ) : (
          <div className="divide-y divide-ghost-200">
            {filteredMemories.map((memory) => {
              const createdAt = new Date(memory.created_at);
              const expiresAt = memory.expires_at ? new Date(memory.expires_at) : null;
              const isExpiring = expiresAt && expiresAt.getTime() - Date.now() < 24 * 60 * 60 * 1000;

              return (
                <div key={memory.id} className="p-4 hover:bg-ghost-50 transition-colors">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Badge className={getMemoryTypeColor(memory.memory_type) + ' px-2 py-1 text-xs'}>
                        {memory.memory_type.replace('_', ' ')}
                      </Badge>

                      <div className="flex items-center gap-1">{getImportanceStars(memory.importance_score)}</div>

                      {isExpiring && (
                        <Badge className="bg-warning/20 text-warning border-warning/30 px-2 py-0.5 text-xs">
                          Expiring Soon
                        </Badge>
                      )}
                    </div>

                    <div className="text-xs text-text-muted font-mono">
                      {formatDistanceToNow(createdAt, { addSuffix: true })}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="text-sm text-text-secondary leading-relaxed mb-3">
                    {memory.content}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-4 text-text-muted">
                      <span className="font-mono">
                        Access: <span className="text-purple-500">{memory.access_count}</span>
                      </span>
                      <span className="font-mono">
                        Importance: <span className="text-purple-500">{memory.importance_score.toFixed(2)}</span>
                      </span>
                      {expiresAt && (
                        <span className="font-mono">
                          Expires: <span className="text-warning">{formatDistanceToNow(expiresAt, { addSuffix: true })}</span>
                        </span>
                      )}
                    </div>

                    {memory.tags && memory.tags.length > 0 && (
                      <div className="flex items-center gap-2">
                        {memory.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-purple-500/10 text-purple-600 border border-purple-500/20 text-xs font-mono"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

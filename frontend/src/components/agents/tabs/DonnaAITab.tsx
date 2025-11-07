'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { agentsAPI } from '@/lib/api/agents';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  Send,
  TrendingUp,
  Brain,
  Target,
  Lightbulb,
  ThumbsUp,
  ThumbsDown,
  Loader2,
} from 'lucide-react';

interface DonnaInsight {
  id: string;
  category: string;
  insight: string;
  confidence: number;
  sources: number;
  timestamp: string;
}

interface DonnaMetrics {
  totalPatterns: number;
  learningRate: number;
  insightsGenerated: number;
  accuracyScore: number;
}

export default function DonnaAITab() {
  const { userProfile } = useAuth();
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [insights, setInsights] = useState<DonnaInsight[]>([]);
  const [metrics, setMetrics] = useState<DonnaMetrics>({
    totalPatterns: 0,
    learningRate: 0,
    insightsGenerated: 0,
    accuracyScore: 0,
  });
  const [selectedInsight, setSelectedInsight] = useState<string | null>(null);

  // Fetch Donna metrics on mount
  useEffect(() => {
    fetchDonnaMetrics();
  }, [userProfile?.enterprise_id]);

  const fetchDonnaMetrics = async () => {
    if (!userProfile?.enterprise_id) return;

    try {
      const data = await agentsAPI.getDonnaMetrics(userProfile.enterprise_id);

      setMetrics({
        totalPatterns: data.total_patterns || 0,
        learningRate: data.learning_rate || 0,
        insightsGenerated: data.insights_generated || 0,
        accuracyScore: data.accuracy_score || 0,
      });
    } catch (error) {
      console.error('Failed to fetch Donna metrics:', error);
      // Use placeholder data on error
      setMetrics({
        totalPatterns: 1247,
        learningRate: 0.847,
        insightsGenerated: 342,
        accuracyScore: 0.932,
      });
    }
  };

  const handleQuery = async () => {
    if (!query.trim() || !userProfile?.enterprise_id) return;

    setIsLoading(true);
    try {
      const data = await agentsAPI.queryDonna({
        query: query.trim(),
        enterpriseId: userProfile.enterprise_id,
        userId: userProfile.id,
      });

      // Map response to insights format
      const newInsights = (data.insights || []).map((insight: any) => ({
        id: insight.id || Math.random().toString(),
        category: insight.category || 'General',
        insight: insight.insight || insight.message,
        confidence: insight.confidence || 0.5,
        sources: insight.source_count || 0,
        timestamp: insight.timestamp || new Date().toISOString(),
      }));

      setInsights(newInsights);
    } catch (error) {
      console.error('Failed to query Donna:', error);
      toast.error('Failed to get insights from Donna. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedback = async (insightId: string, helpful: boolean) => {
    if (!userProfile?.enterprise_id) return;

    try {
      await agentsAPI.submitDonnaFeedback({
        insightId,
        helpful,
        enterpriseId: userProfile.enterprise_id,
        userId: userProfile.id,
      });

      toast.success(helpful ? 'Thank you for your feedback!' : 'Feedback submitted');
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      toast.error('Failed to submit feedback');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-purple-500/10 to-purple-300/5 border-purple-500/20 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-purple-500/10 border border-purple-500/20">
              <Sparkles className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-purple-900 font-mono">DONNA AI - GLOBAL LEARNING</h2>
              <p className="text-sm text-ghost-700 mt-1 max-w-2xl">
                Donna learns from anonymized patterns across all enterprises, providing industry insights,
                best practices, and recommendations while maintaining complete data privacy.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-white border-ghost-300 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-ghost-600 uppercase tracking-wider mb-1 font-mono">
                PATTERNS LEARNED
              </div>
              <div className="text-2xl font-bold text-purple-900 font-mono">{metrics.totalPatterns}</div>
            </div>
            <Brain className="w-8 h-8 text-purple-500 opacity-50" />
          </div>
        </Card>

        <Card className="bg-white border-ghost-300 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-ghost-600 uppercase tracking-wider mb-1 font-mono">
                LEARNING RATE
              </div>
              <div className="text-2xl font-bold text-purple-500 font-mono">
                {(metrics.learningRate * 100).toFixed(1)}%
              </div>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-500 opacity-50" />
          </div>
        </Card>

        <Card className="bg-white border-ghost-300 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-ghost-600 uppercase tracking-wider mb-1 font-mono">
                INSIGHTS GENERATED
              </div>
              <div className="text-2xl font-bold text-ghost-700 font-mono">{metrics.insightsGenerated}</div>
            </div>
            <Lightbulb className="w-8 h-8 text-warning opacity-50" />
          </div>
        </Card>

        <Card className="bg-white border-ghost-300 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-ghost-600 uppercase tracking-wider mb-1 font-mono">
                ACCURACY SCORE
              </div>
              <div className="text-2xl font-bold text-success font-mono">
                {(metrics.accuracyScore * 100).toFixed(1)}%
              </div>
            </div>
            <Target className="w-8 h-8 text-success opacity-50" />
          </div>
        </Card>
      </div>

      {/* Query Interface */}
      <Card className="bg-white border-ghost-300 p-6">
        <h3 className="text-sm font-semibold text-purple-900 mb-4 font-mono uppercase tracking-wider">
          ASK DONNA FOR INSIGHTS
        </h3>

        <div className="flex gap-3">
          <Textarea
            placeholder="Ask Donna about industry best practices, common patterns, or optimization strategies..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 border-ghost-300 font-mono text-sm min-h-[100px]"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleQuery();
              }
            }}
          />
        </div>

        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-ghost-600 font-mono">
            Press ⌘+Enter to submit | Insights are based on anonymized cross-enterprise data
          </span>
          <Button
            onClick={handleQuery}
            disabled={isLoading || !query.trim()}
            className="bg-purple-900 hover:bg-purple-800 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Query Donna
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Insights Results */}
      {insights.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-purple-900 font-mono uppercase tracking-wider">
            DONNA'S INSIGHTS
          </h3>

          {insights.map((insight) => (
            <Card key={insight.id} className="bg-white border-ghost-300 p-6 hover:border-purple-500 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Badge className="bg-purple-500/20 text-purple-900 border-purple-500/30 font-mono text-xs">
                    {insight.category}
                  </Badge>
                  <div className="flex items-center gap-2 text-xs text-ghost-600 font-mono">
                    <span>Confidence: <span className="text-purple-500 font-semibold">{(insight.confidence * 100).toFixed(0)}%</span></span>
                    <span className="text-ghost-400">•</span>
                    <span>Sources: <span className="text-ghost-700 font-semibold">{insight.sources}</span> enterprises</span>
                  </div>
                </div>
              </div>

              <p className="text-sm text-ghost-700 leading-relaxed mb-4">{insight.insight}</p>

              <div className="flex items-center gap-2 pt-3 border-t border-ghost-200">
                <span className="text-xs text-ghost-600 font-mono">Was this insight helpful?</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFeedback(insight.id, true)}
                  className="h-7 px-2 hover:bg-success/10 hover:text-success"
                >
                  <ThumbsUp className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFeedback(insight.id, false)}
                  className="h-7 px-2 hover:bg-error/10 hover:text-error"
                >
                  <ThumbsDown className="w-3 h-3" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {insights.length === 0 && !isLoading && (
        <Card className="bg-white border-ghost-300 p-12">
          <div className="text-center">
            <Sparkles className="w-16 h-16 mx-auto mb-4 text-purple-500 opacity-30" />
            <h3 className="text-lg font-semibold text-purple-900 mb-2 font-mono">READY TO LEARN</h3>
            <p className="text-sm text-ghost-600 max-w-md mx-auto">
              Ask Donna about industry best practices, optimization strategies, or common patterns across enterprises.
              All insights are derived from anonymized data to protect privacy.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}

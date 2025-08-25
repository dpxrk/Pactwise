'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { trackBusinessMetric } from '@/lib/metrics';

interface Insight {
  id: string;
  type: 'risk' | 'opportunity' | 'compliance' | 'optimization' | 'trend';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number;
  category: string;
  actionItems?: string[];
  metrics?: {
    label: string;
    value: string | number;
    trend?: 'up' | 'down' | 'stable';
  }[];
  relatedContracts?: {
    id: string;
    title: string;
  }[];
  createdAt: string;
  status: 'new' | 'acknowledged' | 'resolved';
}

interface AIInsightsProps {
  enterpriseId?: string;
  contractId?: string;
  vendorId?: string;
  className?: string;
}

export const AIInsights: React.FC<AIInsightsProps> = ({
  enterpriseId,
  contractId,
  vendorId,
  className
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedInsights, setExpandedInsights] = useState<Set<string>>(new Set());

  // const insights = useQuery(api.ai.getInsights, {
  //   enterpriseId,
  //   contractId,
  //   vendorId
  // });

  // const generateInsights = useMutation(api.ai.generateInsights);
  // const updateInsightStatus = useMutation(api.ai.updateInsightStatus);
  // const provideInsightFeedback = useMutation(api.ai.provideInsightFeedback);
  
  const insights: Insight[] = []; // TODO: Replace with actual data fetching
  const generateInsights = (params: { enterpriseId?: string | undefined; contractId?: string | undefined; vendorId?: string | undefined; }) => Promise.resolve(); // TODO: Replace with actual mutation
  const updateInsightStatus = (params: { insightId: string; status: string; }) => Promise.resolve(); // TODO: Replace with actual mutation
  const provideInsightFeedback = (params: { insightId: string; helpful: boolean; }) => Promise.resolve(); // TODO: Replace with actual mutation

  const handleRefresh = async () => {
    setIsRefreshing(true);
    const startTime = performance.now();
    
    try {
      await generateInsights({
        enterpriseId,
        contractId,
        vendorId
      });
      
      const duration = performance.now() - startTime;
      trackBusinessMetric.aiAgentExecution('insights-generation', duration, true);
      logger.info('AI insights refreshed', { duration });
    } catch (error) {
      logger.error('Failed to refresh insights', error as Error);
      trackBusinessMetric.aiAgentExecution('insights-generation', performance.now() - startTime, false);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleInsightAction = async (insightId: string, action: 'acknowledge' | 'resolve') => {
    try {
      await updateInsightStatus({
        insightId,
        status: action === 'acknowledge' ? 'acknowledged' : 'resolved'
      });
      
      trackBusinessMetric.userAction(`insight-${action}`, 'ai');
    } catch (error) {
      logger.error(`Failed to ${action} insight`, error as Error);
    }
  };

  const handleFeedback = async (insightId: string, helpful: boolean) => {
    try {
      await provideInsightFeedback({
        insightId,
        helpful
      });
      
      trackBusinessMetric.userAction('insight-feedback', 'ai');
    } catch (error) {
      logger.error('Failed to submit feedback', error as Error);
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'risk': return AlertTriangle;
      case 'opportunity': return TrendingUp;
      case 'compliance': return Shield;
      case 'optimization': return Lightbulb;
      case 'trend': return Brain;
      default: return Info;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const categories = [
    { value: 'all', label: 'All Insights', icon: Brain },
    { value: 'risk', label: 'Risk Analysis', icon: AlertTriangle },
    { value: 'opportunity', label: 'Opportunities', icon: TrendingUp },
    { value: 'compliance', label: 'Compliance', icon: Shield },
    { value: 'optimization', label: 'Optimization', icon: Lightbulb },
  ];

  const filteredInsights = useMemo(() => {
    return selectedCategory === 'all' 
      ? insights 
      : insights.filter((insight: Insight) => insight.type === selectedCategory);
  }, [insights, selectedCategory]);

  const insightStats = useMemo(() => {
    if (insights.length === 0) return { total: 0, new: 0, highImpact: 0 };
    
    return {
      total: insights.length,
      new: insights.filter((i: Insight) => i.status === 'new').length,
      highImpact: insights.filter((i: Insight) => i.impact === 'high').length,
    };
  }, [insights]);

  if (!insights) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Insights
            </CardTitle>
            <CardDescription>
              AI-powered analysis and recommendations
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{insightStats.total}</div>
            <div className="text-xs text-muted-foreground">Total Insights</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{insightStats.new}</div>
            <div className="text-xs text-muted-foreground">New</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{insightStats.highImpact}</div>
            <div className="text-xs text-muted-foreground">High Impact</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Category Tabs */}
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList className="grid grid-cols-5 w-full">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <TabsTrigger
                  key={category.value}
                  value={category.value}
                  className="flex items-center gap-1"
                >
                  <Icon className="h-3 w-3" />
                  <span className="hidden sm:inline">{category.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value={selectedCategory} className="space-y-4 mt-4">
            {filteredInsights.length === 0 ? (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>No insights available</AlertTitle>
                <AlertDescription>
                  Click refresh to generate new AI insights for your contracts and vendors.
                </AlertDescription>
              </Alert>
            ) : (
              filteredInsights.map((insight: Insight) => {
                const Icon = getInsightIcon(insight.type);
                const isExpanded = expandedInsights.has(insight.id);
                
                return (
                  <Card key={insight.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <div className={cn(
                              "p-2 rounded-lg",
                              getImpactColor(insight.impact)
                            )}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 space-y-1">
                              <h4 className="font-medium">{insight.title}</h4>
                              <p className="text-sm text-muted-foreground">
                                {insight.description}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={insight.status === 'new' ? 'default' : 'secondary'}
                            >
                              {insight.status}
                            </Badge>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <div className="text-xs text-muted-foreground">
                                    {Math.round(insight.confidence * 100)}%
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Confidence Score</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>

                        {/* Confidence Bar */}
                        <Progress 
                          value={insight.confidence * 100} 
                          className="h-1"
                        />

                        {/* Metrics */}
                        {insight.metrics && insight.metrics.length > 0 && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {insight.metrics.map((metric, idx) => (
                              <div 
                                key={idx}
                                className="bg-muted/50 rounded-lg p-2 text-center"
                              >
                                <div className="text-xs text-muted-foreground">
                                  {metric.label}
                                </div>
                                <div className="font-medium flex items-center justify-center gap-1">
                                  {metric.value}
                                  {metric.trend && (
                                    <TrendingUp 
                                      className={cn(
                                        "h-3 w-3",
                                        metric.trend === 'up' && "text-green-500",
                                        metric.trend === 'down' && "text-red-500 rotate-180",
                                        metric.trend === 'stable' && "text-gray-500"
                                      )}
                                    />
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Action Items */}
                        {insight.actionItems && insight.actionItems.length > 0 && (
                          <div className="space-y-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setExpandedInsights(prev => {
                                  const newSet = new Set(prev);
                                  if (newSet.has(insight.id)) {
                                    newSet.delete(insight.id);
                                  } else {
                                    newSet.add(insight.id);
                                  }
                                  return newSet;
                                });
                              }}
                              className="w-full justify-between"
                            >
                              <span className="text-sm">
                                View {insight.actionItems.length} Action Items
                              </span>
                              <ChevronRight 
                                className={cn(
                                  "h-4 w-4 transition-transform",
                                  isExpanded && "rotate-90"
                                )}
                              />
                            </Button>
                            
                            {isExpanded && (
                              <div className="pl-4 space-y-1">
                                {insight.actionItems.map((item, idx) => (
                                  <div 
                                    key={idx}
                                    className="flex items-start gap-2 text-sm"
                                  >
                                    <CheckCircle className="h-3 w-3 mt-0.5 text-muted-foreground" />
                                    <span>{item}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-2 border-t">
                          <div className="flex items-center gap-2">
                            {insight.status === 'new' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleInsightAction(insight.id, 'acknowledge')}
                              >
                                Acknowledge
                              </Button>
                            )}
                            {insight.status !== 'resolved' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleInsightAction(insight.id, 'resolve')}
                              >
                                Mark Resolved
                              </Button>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleFeedback(insight.id, true)}
                            >
                              <ThumbsUp className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleFeedback(insight.id, false)}
                            >
                              <ThumbsDown className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
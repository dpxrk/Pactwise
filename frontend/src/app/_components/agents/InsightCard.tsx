'use client'

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Brain,
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  Shield,
  TrendingUp,
  Zap,
  Eye,
  ExternalLink,
  Star,
} from "lucide-react";
import { AgentInsight, InsightType, TaskPriority, INSIGHT_TYPE_LABELS, PRIORITY_COLORS } from "@/types/agents.types";
import { cn } from "@/lib/utils";

interface InsightCardProps {
  insight: AgentInsight; // Using proper type from agents.types
  onMarkAsRead?: (insightId: string) => void;
  onViewDetails?: (insightId: string) => void;
  onTakeAction?: (insightId: string) => void;
  loading?: boolean;
}

export const InsightCard: React.FC<InsightCardProps> = ({
  insight,
  onMarkAsRead,
  onViewDetails,
  onTakeAction,
  loading = false,
}) => {
  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'contract_analysis':
        return <FileText className="h-5 w-5" />;
      case 'financial_risk':
      case 'cost_optimization':
        return <DollarSign className="h-5 w-5" />;
      case 'expiration_warning':
      case 'renewal_opportunity':
        return <Clock className="h-5 w-5" />;
      case 'legal_review':
      case 'compliance_alert':
        return <Shield className="h-5 w-5" />;
      case 'performance_metric':
      case 'trend_analysis':
        return <TrendingUp className="h-5 w-5" />;
      case 'vendor_risk':
        return <AlertTriangle className="h-5 w-5" />;
      case 'recommendation':
        return <Brain className="h-5 w-5" />;
      case 'alert':
        return <Zap className="h-5 w-5" />;
      default:
        return <Brain className="h-5 w-5" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'contract_analysis':
        return 'bg-blue-100 text-blue-800';
      case 'financial_risk':
        return 'bg-red-100 text-red-800';
      case 'cost_optimization':
        return 'bg-green-100 text-green-800';
      case 'expiration_warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'legal_review':
        return 'bg-purple-100 text-purple-800';
      case 'compliance_alert':
        return 'bg-orange-100 text-orange-800';
      case 'performance_metric':
        return 'bg-cyan-100 text-cyan-800';
      case 'vendor_risk':
        return 'bg-pink-100 text-pink-800';
      case 'recommendation':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    if (diffMins < 43200) return `${Math.floor(diffMins / 1440)}d ago`;
    return date.toLocaleDateString();
  };

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return "text-gray-500";
    if (confidence >= 0.9) return "text-green-600";
    if (confidence >= 0.7) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <Card className={cn(
      "transition-all duration-300 ease-out hover:shadow-xl hover:scale-[1.02] hover:-translate-y-1 cursor-pointer group",
      !insight.isRead && "border-l-4 border-l-blue-500 bg-blue-50/30",
      insight.priority === 'critical' && "border-l-4 border-l-red-500 bg-red-50/30"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className={cn(
              "p-2 rounded-md transition-transform duration-300 group-hover:scale-110",
              getTypeColor(insight.type)
            )}>
              {getInsightIcon(insight.type)}
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg font-semibold line-clamp-2 group-hover:text-primary transition-colors duration-300">
                {insight.title}
              </CardTitle>
              <div className="flex items-center space-x-2 mt-2">
                <Badge variant="outline" className={getTypeColor(insight.type)}>
                  {INSIGHT_TYPE_LABELS[insight.type as InsightType] || insight.type}
                </Badge>
                <Badge className={getPriorityColor(insight.priority)}>
                  {insight.priority.charAt(0).toUpperCase() + insight.priority.slice(1)}
                </Badge>
                {insight.confidence && (
                  <div className="flex items-center space-x-1">
                    <Star className="h-3 w-3 text-yellow-500" />
                    <span className={cn("text-xs font-medium", getConfidenceColor(insight.confidence))}>
                      {Math.round(insight.confidence * 100)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {!insight.isRead && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onMarkAsRead?.(insight._id)}
              disabled={loading}
            >
              <Eye className="h-3 w-3 mr-1" />
              Mark Read
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-3">
          {insight.description}
        </p>

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center space-x-4">
            <span>by {insight.agentName}</span>
            <span>•</span>
            <span>{formatTimeAgo(insight.createdAt)}</span>
            {insight.expiresAt && (
              <>
                <span>•</span>
                <span className="text-yellow-600">
                  Expires {formatTimeAgo(insight.expiresAt)}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Structured Data Preview */}
        {insight.data && (
          <div className="space-y-2">
            {/* Financial Impact */}
            {insight.data.financialImpact && (
              <div className="flex items-center justify-between p-2 bg-green-50 rounded-md border border-green-200">
                <span className="text-sm font-medium text-green-800">Financial Impact</span>
                <span className={cn(
                  "text-sm font-bold",
                  insight.data.financialImpact.type === 'saving' ? "text-green-600" : "text-red-600"
                )}>
                  {insight.data.financialImpact.type === 'saving' ? '+' : '-'}
                  ${insight.data.financialImpact.amount.toLocaleString()} {insight.data.financialImpact.currency}
                </span>
              </div>
            )}

            {/* Risk Score */}
            {insight.data.contractRisk && (
              <div className="flex items-center justify-between p-2 bg-red-50 rounded-md border border-red-200">
                <span className="text-sm font-medium text-red-800">Risk Score</span>
                <span className="text-sm font-bold text-red-600">
                  {insight.data.contractRisk.score}/10
                </span>
              </div>
            )}

            {/* Performance Data */}
            {insight.data.performanceData && (
              <div className="flex items-center justify-between p-2 bg-blue-50 rounded-md border border-blue-200">
                <span className="text-sm font-medium text-blue-800">
                  {insight.data.performanceData.metric}
                </span>
                <span className="text-sm font-bold text-blue-600">
                  {insight.data.performanceData.current} / {insight.data.performanceData.target}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Action Required */}
        {insight.actionRequired && !insight.actionTaken && (
          <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-md border border-yellow-200">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">Action Required</span>
            </div>
            <Button
              size="sm"
              onClick={() => onTakeAction?.(insight._id)}
              disabled={loading}
            >
              Take Action
            </Button>
          </div>
        )}

        {/* Action Taken */}
        {insight.actionTaken && insight.actionDetails && (
          <div className="flex items-start space-x-2 p-3 bg-green-50 rounded-md border border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-green-800">Action Taken</p>
              <p className="text-sm text-green-700 mt-1">{insight.actionDetails}</p>
            </div>
          </div>
        )}

        {/* Tags */}
        {insight.tags && insight.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {insight.tags.map((tag: string, index: number) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center space-x-2">
            {/* Related Entity Links */}
            {insight.contractId && (
              <Button variant="ghost" size="sm">
                <FileText className="h-3 w-3 mr-1" />
                View Contract
              </Button>
            )}
            {insight.vendorId && (
              <Button variant="ghost" size="sm">
                <ExternalLink className="h-3 w-3 mr-1" />
                View Vendor
              </Button>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails?.(insight._id)}
            disabled={loading}
          >
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default InsightCard;
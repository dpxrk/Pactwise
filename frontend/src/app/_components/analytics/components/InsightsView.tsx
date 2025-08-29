'use client';

import { AlertTriangle } from 'lucide-react';
import React from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Stats {
  health: { issues: string[] };
  expiring: { next7Days: number };
}

interface Opportunity {
  potential_savings?: number;
}

interface SpendAnalysis {
  opportunities?: Opportunity[];
}

interface RiskAnalysis {
  overall: number;
}

interface Insight {
  title: string;
  description: string;
  action: string;
}

interface InsightsViewProps {
  stats: Stats | null;
  spendAnalysis: SpendAnalysis | null;
  riskAnalysis: RiskAnalysis | null;
}

export const InsightsView = React.memo<InsightsViewProps>(({ 
  stats, 
  spendAnalysis, 
  riskAnalysis 
}) => {
  if (!stats || !spendAnalysis || !riskAnalysis) {
    return null; 
  }

  return (
    <div className="space-y-4">
      {stats.health.issues.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {stats.health.issues.length} contracts need attention
          </AlertDescription>
        </Alert>
      )}
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {generateInsights(stats, spendAnalysis, riskAnalysis).map((insight, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="text-sm">{insight.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{insight.description}</p>
              {insight.action && (
                <p className="text-sm font-medium mt-2 text-primary">{insight.action}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
});

InsightsView.displayName = 'InsightsView';

function generateInsights(stats: Stats, spendAnalysis: SpendAnalysis, riskAnalysis: RiskAnalysis): Insight[] {
  const insights: Insight[] = [];

  if (stats.expiring.next7Days > 0) {
    insights.push({
      title: 'Urgent Contract Renewals',
      description: `${stats.expiring.next7Days} contracts expire within 7 days`,
      action: 'Review and initiate renewal process'
    });
  }

  if (spendAnalysis?.opportunities?.length > 0) {
    const totalSavings = spendAnalysis.opportunities.reduce(
      (sum: number, opp: Opportunity) => sum + (opp.potential_savings || 0), 0
    );
    insights.push({
      title: 'Cost Optimization Potential',
      description: `${formatCurrency(totalSavings)} in potential savings identified`,
      action: 'Review optimization opportunities'
    });
  }

  if (riskAnalysis?.overall > 70) {
    insights.push({
      title: 'High Risk Alert',
      description: 'Portfolio risk score exceeds acceptable threshold',
      action: 'Immediate risk mitigation required'
    });
  }

  return insights;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

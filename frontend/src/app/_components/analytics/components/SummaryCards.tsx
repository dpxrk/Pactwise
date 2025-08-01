'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

interface SummaryCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: number;
  description?: string;
  variant?: 'default' | 'success' | 'warning';
}

export const SummaryCard = React.memo<SummaryCardProps>(({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  description, 
  variant = 'default' 
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return 'text-green-600 bg-green-50';
      case 'warning':
        return 'text-orange-600 bg-orange-50';
      default:
        return 'text-primary bg-primary/10';
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={`p-2 rounded-full ${getVariantStyles()}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {trend !== undefined && (
          <div className={`flex items-center mt-2 text-xs ${
            trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-600'
          }`}>
            <TrendingUp className={`h-3 w-3 mr-1 ${trend < 0 ? 'rotate-180' : ''}`} />
            {Math.abs(trend)}%
          </div>
        )}
      </CardContent>
    </Card>
  );
});

SummaryCard.displayName = 'SummaryCard';

interface SummaryCardsProps {
  stats: any;
  riskAnalysis: any;
}

export const SummaryCards = React.memo<SummaryCardsProps>(({ stats, riskAnalysis }) => {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <SummaryCard
        title="Total Contract Value"
        value={formatCurrency(stats.byValue.total)}
        icon={DollarSign}
        trend={12.5}
        description="Across all active contracts"
      />
      <SummaryCard
        title="Risk Score"
        value={`${riskAnalysis?.overall || 0}/100`}
        icon={AlertTriangle}
        trend={-5.2}
        description="Overall risk assessment"
        variant={riskAnalysis?.overall > 50 ? 'warning' : 'default'}
      />
      <SummaryCard
        title="Contracts Expiring"
        value={stats.expiring.next30Days}
        icon={BarChart3}
        trend={stats.expiring.next30Days > 5 ? 25 : 0}
        description="In the next 30 days"
        variant={stats.expiring.next30Days > 5 ? 'warning' : 'default'}
      />
      <SummaryCard
        title="Health Score"
        value={`${stats.health.score}%`}
        icon={TrendingUp}
        trend={3.7}
        description="Contract portfolio health"
        variant={stats.health.score < 70 ? 'warning' : 'success'}
      />
    </div>
  );
});

SummaryCards.displayName = 'SummaryCards';

// Import these from lucide-react at the top of the file
import { DollarSign, AlertTriangle, BarChart3 } from 'lucide-react';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}
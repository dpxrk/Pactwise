'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DynamicChart from '@/app/_components/common/DynamicCharts';

interface SpendingAnalysisProps {
  chartData: {
    spendByCategory: any[];
    monthlyTrend: any[];
  };
  spendAnalysis: any;
}

export const SpendingAnalysis = React.memo<SpendingAnalysisProps>(({ 
  chartData, 
  spendAnalysis 
}) => {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <ChartCard title="Spend by Category">
          <DynamicChart
            type="bar"
            data={chartData.spendByCategory}
            height={300}
            xKey="category"
            yKey="amount"
          />
        </ChartCard>
        <ChartCard title="Monthly Spend Trend">
          <DynamicChart
            type="line"
            data={chartData.monthlyTrend}
            height={300}
            xKey="month"
            yKey="amount"
          />
        </ChartCard>
      </div>
      {spendAnalysis?.opportunities && (
        <OpportunitiesList opportunities={spendAnalysis.opportunities} />
      )}
    </div>
  );
});

SpendingAnalysis.displayName = 'SpendingAnalysis';

const ChartCard = React.memo<{ title: string; children: React.ReactNode }>(({ 
  title, 
  children 
}) => (
  <Card>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
));

ChartCard.displayName = 'ChartCard';

const OpportunitiesList = React.memo<{ opportunities: any[] }>(({ opportunities }) => (
  <Card>
    <CardHeader>
      <CardTitle>Cost Savings Opportunities</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        {opportunities.slice(0, 5).map((opp, index) => (
          <div key={index} className="flex items-start justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex-1">
              <p className="font-medium text-sm">{opp.recommendation}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {opp.type === 'high_spend_vendor' && `${opp.vendorName} - ${formatCurrency(opp.amount)}`}
                {opp.type === 'consolidation_opportunity' && `${opp.vendorName} - ${opp.contracts} contracts`}
                {opp.type === 'category_concentration' && `${opp.category} - ${opp.percentage.toFixed(1)}% of spend`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-green-600">
                {formatCurrency(opp.potential_savings)}
              </p>
              <p className="text-xs text-muted-foreground">potential savings</p>
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
));

OpportunitiesList.displayName = 'OpportunitiesList';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}
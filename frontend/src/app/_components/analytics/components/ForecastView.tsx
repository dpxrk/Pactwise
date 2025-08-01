'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import DynamicChart from '@/app/_components/common/DynamicCharts';

interface ForecastViewProps {
  forecast: any;
}

export const ForecastView = React.memo<ForecastViewProps>(({ forecast }) => {
  if (!forecast || forecast.error) {
    return (
      <Alert>
        <AlertDescription>
          {forecast?.error || 'Insufficient data for forecasting'}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contract Volume Forecast</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Trend: <span className={`font-medium ${
            forecast.trend === 'increasing' ? 'text-green-600' :
            forecast.trend === 'decreasing' ? 'text-red-600' :
            'text-gray-600'
          }`}>{forecast.trend}</span>
        </p>
        <DynamicChart
          type="line"
          data={[
            ...forecast.historical.map((p: any) => ({ 
              month: formatMonth(p.month), 
              value: p.y, 
              type: 'Actual' 
            })),
            ...forecast.forecast.map((p: any) => ({ 
              month: formatMonth(p.month), 
              value: p.predicted, 
              type: 'Forecast' 
            }))
          ]}
          height={300}
          xKey="month"
          yKey="value"
        />
      </CardContent>
    </Card>
  );
});

ForecastView.displayName = 'ForecastView';

function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-');
  return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { 
    month: 'short', 
    year: '2-digit' 
  });
}
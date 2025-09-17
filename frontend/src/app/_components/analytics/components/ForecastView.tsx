'use client';

import React from 'react';

import DynamicChart from '@/app/_components/common/DynamicCharts';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ForecastDataPoint {
  month: string;
  y?: number;
  predicted?: number;
}

interface Forecast {
  error?: string;
  trend: 'increasing' | 'decreasing' | 'stable';
  historical: ForecastDataPoint[];
  forecast: ForecastDataPoint[];
}

interface ForecastViewProps {
  forecast: Forecast | null;
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
            ...forecast.historical.map((p) => ({ 
              month: formatMonth(p.month), 
              value: p.y || 0, 
              type: 'Actual' 
            })),
            ...forecast.forecast.map((p) => ({ 
              month: formatMonth(p.month), 
              value: p.predicted || 0, 
              type: 'Forecast' 
            }))
          ]}
          height={300}
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

'use client';

import React from 'react';

import DynamicChart from '@/app/_components/common/DynamicCharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ChartDataPoint {
  name: string;
  value: number;
  color: string;
}

interface ValueDistributionPoint {
  range: string;
  count: number;
}

interface OverviewChartsProps {
  chartData: {
    statusDistribution: ChartDataPoint[];
    valueDistribution: ValueDistributionPoint[];
  };
}

const OverviewCharts = React.memo<OverviewChartsProps>(({ chartData }) => {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Contract Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <DynamicChart
            type="pie"
            data={chartData.statusDistribution}
            height={300}
          />
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Value Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <DynamicChart
            type="bar"
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ValueDistributionPoint compatible with ChartDataPoint
            data={chartData.valueDistribution as any}
            height={300}
          />
        </CardContent>
      </Card>
    </div>
  );
});

OverviewCharts.displayName = 'OverviewCharts';

export default OverviewCharts;

'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DynamicChart from '@/app/_components/common/DynamicCharts';

interface OverviewChartsProps {
  chartData: {
    statusDistribution: any[];
    valueDistribution: any[];
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
            type="donut"
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
            data={chartData.valueDistribution}
            height={300}
            xKey="range"
            yKey="count"
          />
        </CardContent>
      </Card>
    </div>
  );
});

OverviewCharts.displayName = 'OverviewCharts';

export default OverviewCharts;
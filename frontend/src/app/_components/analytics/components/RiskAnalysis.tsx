'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface RiskAnalysisProps {
  analysis: any;
}

export const RiskAnalysisView = React.memo<RiskAnalysisProps>(({ analysis }) => {
  if (!analysis) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Risk Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(analysis.byCategory).map(([category, score]) => (
              <div key={category}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="capitalize">{category}</span>
                  <span>{score}/100</span>
                </div>
                <Progress 
                  value={score as number} 
                  className={`h-2 ${
                    (score as number) > 60 ? 'bg-red-200' : 
                    (score as number) > 30 ? 'bg-yellow-200' : 
                    'bg-green-200'
                  }`}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>High Risk Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {analysis.items.slice(0, 5).map((item: any, index: number) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="truncate flex-1">{item.contractTitle}</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  item.severity === 'critical' ? 'bg-red-100 text-red-700' :
                  item.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {item.totalRisk}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

RiskAnalysisView.displayName = 'RiskAnalysisView';
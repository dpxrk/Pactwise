'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  LineChart as LineChartIcon, 
  PieChart as PieChartIcon, 
  AreaChart as AreaChartIcon,
  TrendingUp,
  Sparkles
} from 'lucide-react';

import { 
  PremiumLineChart,
  PremiumBarChart,
  PremiumAreaChart,
  PremiumPieChart
} from '@/components/charts';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

// Generate sample data
const generateTimeSeriesData = (points = 12) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months.slice(0, points).map(month => ({
    name: month,
    revenue: Math.floor(Math.random() * 50000) + 100000,
    costs: Math.floor(Math.random() * 30000) + 50000,
    profit: Math.floor(Math.random() * 30000) + 40000,
    contracts: Math.floor(Math.random() * 50) + 20,
    compliance: Math.floor(Math.random() * 20) + 75
  }));
};

const generateCategoryData = () => [
  { name: 'Technology', value: 45600, growth: 12, category: 'tech' },
  { name: 'Consulting', value: 38900, growth: -5, category: 'service' },
  { name: 'Manufacturing', value: 52300, growth: 8, category: 'industry' },
  { name: 'Legal Services', value: 29800, growth: 15, category: 'service' },
  { name: 'Marketing', value: 41200, growth: 3, category: 'service' },
  { name: 'Operations', value: 35700, growth: -2, category: 'internal' },
  { name: 'Finance', value: 48900, growth: 10, category: 'internal' },
  { name: 'HR Services', value: 27600, growth: 6, category: 'service' }
];

const generatePieData = () => [
  { name: 'Active', value: 156, metadata: { renewal: '92%', risk: 'Low' } },
  { name: 'Pending', value: 42, metadata: { renewal: '78%', risk: 'Medium' } },
  { name: 'Expiring Soon', value: 28, metadata: { renewal: '45%', risk: 'High' } },
  { name: 'Expired', value: 12, metadata: { renewal: '0%', risk: 'Critical' } },
  { name: 'Under Review', value: 18, metadata: { renewal: '60%', risk: 'Medium' } }
];

const generateAreaData = () => {
  const data = [];
  for (let i = 0; i < 24; i++) {
    data.push({
      name: `${i}:00`,
      transactions: Math.floor(Math.random() * 100) + 50,
      apiCalls: Math.floor(Math.random() * 200) + 100,
      errors: Math.floor(Math.random() * 10) + 2,
      latency: Math.floor(Math.random() * 50) + 20
    });
  }
  return data;
};

export default function ChartsShowcase() {
  const timeSeriesData = useMemo(() => generateTimeSeriesData(), []);
  const categoryData = useMemo(() => generateCategoryData(), []);
  const pieData = useMemo(() => generatePieData(), []);
  const areaData = useMemo(() => generateAreaData(), []);
  
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };
  
  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <h1 className="text-4xl font-bold flex items-center justify-center gap-3">
          <Sparkles className="h-8 w-8 text-amber-500" />
          Premium Charts Showcase
          <Sparkles className="h-8 w-8 text-amber-500" />
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Beautiful, sophisticated, and intelligent data visualizations designed with the Pactwise design system.
          Each chart features advanced animations, 3D effects, and smart insights.
        </p>
        <div className="flex justify-center gap-2">
          <Badge variant="secondary">Interactive</Badge>
          <Badge variant="secondary">3D Effects</Badge>
          <Badge variant="secondary">AI Insights</Badge>
          <Badge variant="secondary">Real-time Updates</Badge>
        </div>
      </motion.div>
      
      <Tabs defaultValue="line" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="line" className="flex items-center gap-2">
            <LineChartIcon className="h-4 w-4" />
            Line Charts
          </TabsTrigger>
          <TabsTrigger value="bar" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Bar Charts
          </TabsTrigger>
          <TabsTrigger value="area" className="flex items-center gap-2">
            <AreaChartIcon className="h-4 w-4" />
            Area Charts
          </TabsTrigger>
          <TabsTrigger value="pie" className="flex items-center gap-2">
            <PieChartIcon className="h-4 w-4" />
            Pie Charts
          </TabsTrigger>
        </TabsList>
        
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {/* Line Chart Examples */}
          <TabsContent value="line" className="space-y-6">
            <motion.div variants={itemVariants}>
              <PremiumLineChart
                data={timeSeriesData}
                series={[
                  { dataKey: 'revenue', name: 'Revenue', color: '#059669', showArea: true, gradient: true },
                  { dataKey: 'costs', name: 'Costs', color: '#DC2626', strokeDasharray: '5 5' },
                  { dataKey: 'profit', name: 'Profit', color: '#111827', strokeWidth: 3 }
                ]}
                title="Financial Performance Overview"
                subtitle="Click the settings icon to customize chart display"
                height={400}
                showTrendLine={true}
                trendLineConfig={{ type: 'linear', showConfidenceBand: true }}
                showInsights={true}
                thresholds={[
                  { value: 120000, label: 'Target', color: '#059669' },
                  { value: 80000, label: 'Minimum', color: '#DC2626' }
                ]}
                annotations={[
                  { x: 'Jun', label: 'Q2 End', color: '#9e829c' },
                  { x: 'Dec', label: 'Year End', color: '#291528' }
                ]}
                enableInlineControls={true}
                showInteractiveLegend={true}
              />
            </motion.div>
            
            <motion.div variants={itemVariants} className="grid grid-cols-2 gap-6">
              <PremiumLineChart
                data={timeSeriesData}
                series={[
                  { dataKey: 'contracts', name: 'Active Contracts', color: '#9e829c', showDots: true }
                ]}
                title="Contract Volume"
                subtitle="Number of active contracts over time"
                height={300}
                enableSpotlight={true}
                enable3D={true}
              />
              
              <PremiumLineChart
                data={timeSeriesData}
                series={[
                  { dataKey: 'compliance', name: 'Compliance Score', color: '#059669', showArea: true }
                ]}
                title="Compliance Tracking"
                subtitle="Monthly compliance score percentage"
                height={300}
                showGrid={false}
                animateOnScroll={true}
              />
            </motion.div>
          </TabsContent>
          
          {/* Bar Chart Examples */}
          <TabsContent value="bar" className="space-y-6">
            <motion.div variants={itemVariants}>
              <PremiumBarChart
                data={categoryData}
                series={[
                  { dataKey: 'value', name: 'Contract Value', gradient: true }
                ]}
                title="Vendor Contract Values by Category"
                subtitle="Total contract values with growth indicators and 3D visualization"
                height={400}
                enable3D={true}
                showValues={true}
                showTrend={true}
                sortBy="value"
                sortOrder="desc"
                thresholds={[
                  { value: 40000, label: 'Target', color: '#059669' }
                ]}
              />
            </motion.div>
            
            <motion.div variants={itemVariants} className="grid grid-cols-2 gap-6">
              <PremiumBarChart
                data={categoryData.slice(0, 5)}
                orientation="horizontal"
                series={[
                  { dataKey: 'value', name: 'Value', color: '#291528' }
                ]}
                title="Top 5 Categories"
                subtitle="Horizontal bar chart with values"
                height={300}
                showValues={true}
                enable3D={false}
              />
              
              <PremiumBarChart
                data={categoryData.map(d => ({ ...d, previous: d.value * 0.9 }))}
                series={[
                  { dataKey: 'value', name: 'Current', color: '#111827' },
                  { dataKey: 'previous', name: 'Previous', color: '#9CA3AF' }
                ]}
                title="Period Comparison"
                subtitle="Current vs previous period"
                height={300}
                enableStagger={true}
              />
            </motion.div>
          </TabsContent>
          
          {/* Area Chart Examples */}
          <TabsContent value="area" className="space-y-6">
            <motion.div variants={itemVariants}>
              <PremiumAreaChart
                data={areaData}
                series={[
                  { dataKey: 'transactions', name: 'Transactions', color: '#059669', fillOpacity: 0.3 },
                  { dataKey: 'apiCalls', name: 'API Calls', color: '#0EA5E9', fillOpacity: 0.3 },
                  { dataKey: 'errors', name: 'Errors', color: '#DC2626', fillOpacity: 0.5 }
                ]}
                title="System Performance Metrics"
                subtitle="24-hour system activity with anomaly detection"
                height={400}
                enableSpotlight={true}
                enableGradientMesh={true}
                showPeaks={true}
                showAnomalies={true}
                anomalyThreshold={2}
                fillMode="gradient"
                showBrush={true}
              />
            </motion.div>
            
            <motion.div variants={itemVariants} className="grid grid-cols-2 gap-6">
              <PremiumAreaChart
                data={timeSeriesData}
                series={[
                  { dataKey: 'revenue', name: 'Revenue', color: '#9e829c', stackId: 'financial' },
                  { dataKey: 'profit', name: 'Profit', color: '#291528', stackId: 'financial' }
                ]}
                title="Stacked Financial Data"
                subtitle="Revenue and profit stacked"
                height={300}
                fillMode="gradient"
                enableParallax={true}
              />
              
              <PremiumAreaChart
                data={areaData.slice(0, 12)}
                series={[
                  { dataKey: 'latency', name: 'Latency (ms)', color: '#D97706', type: 'natural' }
                ]}
                title="API Latency"
                subtitle="Response time monitoring"
                height={300}
                showGrid={false}
                smoothing={0.8}
              />
            </motion.div>
          </TabsContent>
          
          {/* Pie Chart Examples */}
          <TabsContent value="pie" className="space-y-6">
            <motion.div variants={itemVariants} className="grid grid-cols-2 gap-6">
              <PremiumPieChart
                data={pieData}
                title="Contract Status Distribution"
                subtitle="Current contract lifecycle stages"
                height={400}
                enable3D={true}
                showLabels={true}
                labelType="percentage"
                showTotal={true}
                enableExport={true}
              />
              
              <PremiumPieChart
                data={pieData}
                title="Donut Chart with Center Stats"
                subtitle="Contract distribution with insights"
                height={400}
                innerRadius="60%"
                outerRadius="80%"
                enable3D={false}
                centerContent={
                  <div>
                    <div className="text-3xl font-bold">256</div>
                    <div className="text-sm text-muted-foreground">Total Contracts</div>
                    <Badge variant="secondary" className="mt-2">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      +12%
                    </Badge>
                  </div>
                }
              />
            </motion.div>
            
            <motion.div variants={itemVariants}>
              <PremiumPieChart
                data={[
                  { name: 'Legal', value: 28900 },
                  { name: 'Technology', value: 45600 },
                  { name: 'Operations', value: 32100 },
                  { name: 'Marketing', value: 21800 },
                  { name: 'Other', value: 15600 }
                ]}
                nestedData={[
                  { name: 'Q1', value: 35000 },
                  { name: 'Q2', value: 42000 },
                  { name: 'Q3', value: 38000 },
                  { name: 'Q4', value: 29000 }
                ]}
                title="Nested Pie Chart"
                subtitle="Department spending with quarterly breakdown"
                height={400}
                enableNested={true}
                legendPosition="bottom"
              />
            </motion.div>
          </TabsContent>
        </motion.div>
      </Tabs>
      
      {/* Features Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-12 p-6 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-lg"
      >
        <h2 className="text-2xl font-semibold mb-4">Chart Features</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <h3 className="font-medium">Visual Effects</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• 3D Extrusion</li>
              <li>• Gradient Fills</li>
              <li>• Spotlight Effects</li>
              <li>• Parallax Scrolling</li>
            </ul>
          </div>
          <div className="space-y-1">
            <h3 className="font-medium">Animations</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Stagger Reveals</li>
              <li>• Morphing Transitions</li>
              <li>• Hover Interactions</li>
              <li>• Scroll Triggers</li>
            </ul>
          </div>
          <div className="space-y-1">
            <h3 className="font-medium">Smart Features</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Trend Analysis</li>
              <li>• Anomaly Detection</li>
              <li>• Peak Identification</li>
              <li>• Predictive Lines</li>
            </ul>
          </div>
          <div className="space-y-1">
            <h3 className="font-medium">Interactions</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Drill-down Support</li>
              <li>• Export to SVG/PNG</li>
              <li>• Fullscreen Mode</li>
              <li>• Custom Tooltips</li>
            </ul>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
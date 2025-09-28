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
                  { name: 'Revenue', data: timeSeriesData.map(d => d.revenue), color: '#10B981', showArea: true },
                  { name: 'Costs', data: timeSeriesData.map(d => d.costs), color: '#EF4444', strokeDashArray: 5 },
                  { name: 'Profit', data: timeSeriesData.map(d => d.profit), color: '#0F172A' }
                ]}
                title="Financial Performance Overview"
                subtitle="Monthly revenue, costs, and profit analysis"
                height={400}
                showInsights={true}
                valuePrefix="$"
              />
            </motion.div>
            
            <motion.div variants={itemVariants} className="grid grid-cols-2 gap-6">
              <PremiumLineChart
                data={timeSeriesData}
                series={[
                  { name: 'Active Contracts', data: timeSeriesData.map(d => d.contracts), color: '#8B5CF6' }
                ]}
                title="Contract Volume"
                subtitle="Number of active contracts over time"
                height={300}
              />
              
              <PremiumLineChart
                data={timeSeriesData}
                series={[
                  { name: 'Compliance Score', data: timeSeriesData.map(d => d.compliance), color: '#10B981', showArea: true }
                ]}
                title="Compliance Tracking"
                subtitle="Monthly compliance score percentage"
                height={300}
                showGrid={false}
                valueSuffix="%"
              />
            </motion.div>
          </TabsContent>
          
          {/* Bar Chart Examples */}
          <TabsContent value="bar" className="space-y-6">
            <motion.div variants={itemVariants}>
              <PremiumBarChart
                data={categoryData}
                title="Vendor Contract Values by Category"
                subtitle="Total contract values sorted by amount"
                height={400}
                showValues={true}
                showTrend={true}
                valuePrefix="$"
                distributed={true}
              />
            </motion.div>
            
            <motion.div variants={itemVariants} className="grid grid-cols-2 gap-6">
              <PremiumBarChart
                data={categoryData.slice(0, 5)}
                orientation="horizontal"
                title="Top 5 Categories"
                subtitle="Highest value categories"
                height={300}
                showValues={true}
                valuePrefix="$"
              />
              
              <PremiumBarChart
                data={categoryData.slice(0, 8)}
                series={[
                  { name: 'Current', data: categoryData.slice(0, 8).map(d => d.value), color: '#0F172A' },
                  { name: 'Previous', data: categoryData.slice(0, 8).map(d => Math.floor(d.value * 0.9)), color: '#94A3B8' }
                ]}
                title="Period Comparison"
                subtitle="Current vs previous period"
                height={300}
                valuePrefix="$"
              />
            </motion.div>
          </TabsContent>
          
          {/* Area Chart Examples */}
          <TabsContent value="area" className="space-y-6">
            <motion.div variants={itemVariants}>
              <PremiumAreaChart
                data={areaData}
                series={[
                  { name: 'Transactions', data: areaData.map(d => d.transactions), color: '#10B981' },
                  { name: 'API Calls', data: areaData.map(d => d.apiCalls), color: '#06B6D4' },
                  { name: 'Errors', data: areaData.map(d => d.errors), color: '#EF4444' }
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
                  { name: 'Revenue', data: timeSeriesData.map(d => d.revenue), color: '#8B5CF6' },
                  { name: 'Profit', data: timeSeriesData.map(d => d.profit), color: '#0F172A' }
                ]}
                title="Stacked Financial Data"
                subtitle="Revenue and profit stacked"
                height={300}
                stacked={true}
                valuePrefix="$"
              />
              
              <PremiumAreaChart
                data={areaData.slice(0, 12)}
                series={[
                  { name: 'Latency (ms)', data: areaData.slice(0, 12).map(d => d.latency), color: '#F59E0B' }
                ]}
                title="API Latency"
                subtitle="Response time monitoring"
                height={300}
                showGrid={false}
                valueSuffix="ms"
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
                showTotal={true}
              />
              
              <PremiumPieChart
                data={pieData}
                title="Donut Chart with Center Stats"
                subtitle="Contract distribution with insights"
                height={400}
                donut={true}
                centerContent={
                  <div>
                    <div className="text-3xl font-bold text-slate-900">256</div>
                    <div className="text-sm text-slate-500">Total Contracts</div>
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
                title="Department Spending"
                subtitle="Contract values by department"
                height={400}
                donut={true}
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
        className="mt-12 p-8 bg-gradient-to-br from-white to-slate-50 border border-slate-200/60 rounded-xl shadow-sm"
      >
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Powered by ApexCharts</h2>
          <p className="text-sm text-slate-600">Enterprise-grade charting with smooth animations and zero hover refresh issues</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="space-y-2">
            <h3 className="font-semibold text-slate-900">Premium Look</h3>
            <ul className="text-sm text-slate-600 space-y-1.5">
              <li>• Smooth gradients</li>
              <li>• No refresh on hover</li>
              <li>• Card-style tooltips</li>
              <li>• Professional spacing</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-slate-900">Performance</h3>
            <ul className="text-sm text-slate-600 space-y-1.5">
              <li>• Fast rendering</li>
              <li>• Smooth animations</li>
              <li>• Optimized bundle</li>
              <li>• Real-time ready</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-slate-900">Smart Features</h3>
            <ul className="text-sm text-slate-600 space-y-1.5">
              <li>• Trend analysis</li>
              <li>• Anomaly detection</li>
              <li>• Auto-formatting</li>
              <li>• Insights badges</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-slate-900">Executive Ready</h3>
            <ul className="text-sm text-slate-600 space-y-1.5">
              <li>• PNG export</li>
              <li>• Clear hierarchy</li>
              <li>• Brand colors</li>
              <li>• Print optimized</li>
            </ul>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
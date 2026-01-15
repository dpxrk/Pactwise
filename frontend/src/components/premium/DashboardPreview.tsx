'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  FileText,
  Users,
  DollarSign,
  Activity,
  Shield,
  Zap,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ElementType;
  color?: string;
  delay?: number;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  icon: Icon,
  color = 'text-gray-900',
  delay = 0,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay * 100);
    return () => clearTimeout(timer);
  }, [delay]);

  const IconComponent = Icon as any;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={isVisible ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5 }}
    >
      <Card className="p-6 bg-white border border-gray-200 hover:border-gray-900 transition-all group">
        <div className="flex items-start justify-between mb-4">
          <div className={`p-2 border border-gray-200 group-hover:border-gray-900 transition-colors ${color}`}>
            <IconComponent className="w-5 h-5" />
          </div>
          {change !== undefined && (
            <Badge 
              variant="outline" 
              className={`${change > 0 ? 'text-green-600 border-green-200' : 'text-red-600 border-red-200'}`}
            >
              {change > 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
              {Math.abs(change)}%
            </Badge>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-600">{title}</p>
        </div>
      </Card>
    </motion.div>
  );
};

interface ChartPreviewProps {
  type: 'line' | 'bar' | 'pie';
  title: string;
  delay?: number;
}

const ChartPreview: React.FC<ChartPreviewProps> = ({ type, title, delay = 0 }) => {
  const [data, setData] = useState<number[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAnimating(true);
      setData(Array.from({ length: 7 }, () => Math.random() * 100));
    }, delay * 100);
    return () => clearTimeout(timer);
  }, [delay]);

  const renderChart = () => {
    switch (type) {
      case 'bar':
        return (
          <div className="flex items-end justify-between h-32 px-4">
            {data.map((value, i) => (
              <motion.div
                key={i}
                className="w-8 bg-gray-900"
                initial={{ height: 0 }}
                animate={isAnimating ? { height: `${value}%` } : {}}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              />
            ))}
          </div>
        );
      case 'line':
        return (
          <svg className="w-full h-32" viewBox="0 0 300 100">
            <motion.path
              d={`M 0,${100 - data[0]} ${data.map((v, i) => `L ${(i * 300) / 6},${100 - v}`).join(' ')}`}
              fill="none"
              stroke="#111827"
              strokeWidth="2"
              initial={{ pathLength: 0 }}
              animate={isAnimating ? { pathLength: 1 } : {}}
              transition={{ duration: 1.5 }}
            />
          </svg>
        );
      case 'pie':
        return (
          <div className="flex items-center justify-center h-32">
            <motion.div
              className="w-24 h-24 rounded-full border-8 border-gray-900"
              style={{
                borderRightColor: 'transparent',
                borderBottomColor: 'transparent',
              }}
              initial={{ rotate: 0 }}
              animate={isAnimating ? { rotate: 360 } : {}}
              transition={{ duration: 1.5, ease: 'easeInOut' }}
            />
          </div>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={isAnimating ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.5 }}
    >
      <Card className="p-6 bg-white border border-gray-200 hover:border-gray-900 transition-all">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        {renderChart()}
      </Card>
    </motion.div>
  );
};

interface ActivityItemProps {
  icon: React.ElementType;
  title: string;
  description: string;
  time: string;
  delay?: number;
}

const ActivityItem: React.FC<ActivityItemProps> = ({
  icon: Icon,
  title,
  description,
  time,
  delay = 0,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay * 100);
    return () => clearTimeout(timer);
  }, [delay]);

  const IconComponent = Icon as any;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={isVisible ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.5 }}
      className="flex items-start gap-4 p-4 hover:bg-gray-50 transition-colors rounded-lg"
    >
      <div className="p-2 border border-gray-200">
        <IconComponent className="w-4 h-4 text-gray-900" />
      </div>
      <div className="flex-1">
        <p className="font-semibold text-gray-900">{title}</p>
        <p className="text-sm text-gray-600">{description}</p>
        <p className="text-xs text-gray-500 mt-1">{time}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-400" />
    </motion.div>
  );
};

export const InteractiveDashboardPreview: React.FC<{
  className?: string;
  autoAnimate?: boolean;
}> = ({ className = '', autoAnimate: _autoAnimate = true }) => {
  const [selectedTab, setSelectedTab] = useState('overview');

  const metrics = [
    { title: 'Active Contracts', value: '1,234', change: 12, icon: FileText },
    { title: 'Total Vendors', value: '456', change: 8, icon: Users },
    { title: 'Monthly Savings', value: '$2.3M', change: 23, icon: DollarSign },
    { title: 'Compliance Rate', value: '99.7%', change: 2, icon: Shield },
  ];

  const activities = [
    {
      icon: FileText,
      title: 'New Contract Added',
      description: 'Service Agreement with TechCorp',
      time: '2 minutes ago',
    },
    {
      icon: Zap,
      title: 'AI Analysis Complete',
      description: 'Risk assessment for Q4 contracts',
      time: '15 minutes ago',
    },
    {
      icon: Users,
      title: 'Vendor Performance Update',
      description: 'Monthly review completed',
      time: '1 hour ago',
    },
  ];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'contracts', label: 'Contracts', icon: FileText },
    { id: 'analytics', label: 'Analytics', icon: Activity },
  ];

  return (
    <div className={`bg-gray-50 p-8 rounded-lg ${className}`}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Dashboard Preview</h2>
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
            Live Demo
          </Badge>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-all ${
                selectedTab === tab.id
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {selectedTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {metrics.map((metric, i) => (
                <MetricCard key={i} {...metric} delay={i} />
              ))}
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <ChartPreview type="bar" title="Contract Volume" delay={4} />
              <ChartPreview type="line" title="Cost Trends" delay={5} />
              <ChartPreview type="pie" title="Category Distribution" delay={6} />
            </div>

            {/* Recent Activity */}
            <Card className="p-6 bg-white border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-2">
                {activities.map((activity, i) => (
                  <ActivityItem key={i} {...activity} delay={7 + i} />
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {selectedTab === 'contracts' && (
          <motion.div
            key="contracts"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="p-8 bg-white border border-gray-200">
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Contract management interface preview</p>
                <p className="text-sm text-gray-500 mt-2">Full functionality available in the dashboard</p>
              </div>
            </Card>
          </motion.div>
        )}

        {selectedTab === 'analytics' && (
          <motion.div
            key="analytics"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="p-8 bg-white border border-gray-200">
              <div className="text-center py-12">
                <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Advanced analytics preview</p>
                <p className="text-sm text-gray-500 mt-2">AI-powered insights coming soon</p>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
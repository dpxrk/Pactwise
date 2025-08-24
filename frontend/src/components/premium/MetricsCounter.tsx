'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView, useSpring, useTransform } from 'framer-motion';

interface Metric {
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
}

export const AnimatedCounter: React.FC<{
  from?: number;
  to: number;
  duration?: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}> = ({ from = 0, to, duration = 2, decimals = 0, suffix = '', prefix = '', className = '' }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const [hasAnimated, setHasAnimated] = useState(false);
  
  const spring = useSpring(from, { stiffness: 100, damping: 30 });
  const display = useTransform(spring, (current) => {
    return `${prefix}${current.toFixed(decimals)}${suffix}`;
  });

  useEffect(() => {
    if (isInView && !hasAnimated) {
      spring.set(to);
      setHasAnimated(true);
    }
  }, [isInView, hasAnimated, spring, to]);

  return (
    <motion.span ref={ref} className={className}>
      <motion.span>{display}</motion.span>
    </motion.span>
  );
};

export const MetricsGrid: React.FC<{
  metrics: Metric[];
  className?: string;
  variant?: 'default' | 'compact' | 'large';
}> = ({ metrics, className = '', variant = 'default' }) => {
  const sizeClasses = {
    default: 'text-4xl',
    compact: 'text-2xl',
    large: 'text-5xl md:text-6xl',
  };

  const labelClasses = {
    default: 'text-sm',
    compact: 'text-xs',
    large: 'text-base',
  };

  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-8 ${className}`}>
      {metrics.map((metric, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.1 }}
          className="text-center"
        >
          <div className={`font-bold text-gray-900 ${sizeClasses[variant]} mb-2`}>
            <AnimatedCounter
              to={metric.value}
              decimals={metric.decimals}
              suffix={metric.suffix}
              prefix={metric.prefix}
              duration={2.5}
            />
          </div>
          <p className={`text-gray-600 ${labelClasses[variant]}`}>{metric.label}</p>
        </motion.div>
      ))}
    </div>
  );
};

export const LiveMetricsTicker: React.FC<{
  metrics: { label: string; value: string; change?: string }[];
  className?: string;
}> = ({ metrics, className = '' }) => {
  const [currentMetrics, setCurrentMetrics] = useState(metrics);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMetrics((prev) =>
        prev.map((metric) => ({
          ...metric,
          value: metric.value.includes('+')
            ? `${parseInt(metric.value) + Math.floor(Math.random() * 10)}+`
            : metric.value.includes('%')
            ? `${(parseFloat(metric.value) + Math.random() * 0.5).toFixed(1)}%`
            : metric.value.includes('$')
            ? `$${(parseFloat(metric.value.replace('$', '').replace('M', '')) + Math.random() * 0.1).toFixed(1)}M`
            : metric.value,
        }))
      );
    }, 3000);

    return () => clearInterval(interval);
  }, [metrics]);

  return (
    <div className={`flex flex-wrap justify-center gap-6 ${className}`}>
      {currentMetrics.map((metric, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.1 }}
          className="bg-white border border-gray-300 px-6 py-4 min-w-[150px]"
        >
          <motion.div
            key={metric.value}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold text-gray-900"
          >
            {metric.value}
          </motion.div>
          <div className="text-xs text-gray-600 mt-1">{metric.label}</div>
          {metric.change && (
            <div className="text-xs text-green-600 mt-1">↑ {metric.change}</div>
          )}
        </motion.div>
      ))}
    </div>
  );
};

export const ProgressMetric: React.FC<{
  label: string;
  value: number;
  max: number;
  className?: string;
  color?: 'gray' | 'green' | 'blue' | 'red';
}> = ({ label, value, max, className = '', color = 'gray' }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const percentage = (value / max) * 100;

  const colorClasses = {
    gray: 'bg-gray-900',
    green: 'bg-green-600',
    blue: 'bg-blue-600',
    red: 'bg-red-600',
  };

  return (
    <div ref={ref} className={className}>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-gray-700">{label}</span>
        <span className="text-sm font-semibold text-gray-900">
          {value}/{max}
        </span>
      </div>
      <div className="h-1 bg-gray-200 overflow-hidden">
        <motion.div
          className={`h-full ${colorClasses[color]}`}
          initial={{ width: 0 }}
          animate={isInView ? { width: `${percentage}%` } : {}}
          transition={{ duration: 1.5, ease: 'easeOut', delay: 0.2 }}
        />
      </div>
    </div>
  );
};
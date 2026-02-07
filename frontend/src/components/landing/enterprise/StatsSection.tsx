"use client";

import { motion, useInView } from 'framer-motion';
import React, { useEffect, useRef, useState } from 'react';

interface Stat {
  value: number;
  suffix: string;
  label: string;
  description: string;
}

const STATS: Stat[] = [
  {
    value: 87,
    suffix: '%',
    label: 'Time Saved',
    description: 'on contract review',
  },
  {
    value: 98,
    suffix: '%',
    label: 'Cost Reduction',
    description: 'per contract processed',
  },
  {
    value: 10,
    suffix: 'K+',
    label: 'Contracts/Hour',
    description: 'processing capacity',
  },
  {
    value: 99.7,
    suffix: '%',
    label: 'Accuracy Rate',
    description: 'in data extraction',
  },
];

interface AnimatedNumberProps {
  value: number;
  suffix: string;
  duration?: number;
}

const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  suffix,
  duration = 2000,
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (isInView && !hasAnimated.current) {
      hasAnimated.current = true;
      const startTime = Date.now();
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Easing function
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplayValue(eased * value);

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      requestAnimationFrame(animate);
    }
  }, [isInView, value, duration]);

  const isDecimal = value % 1 !== 0;

  return (
    <span ref={ref} className="tabular-nums">
      {isDecimal ? displayValue.toFixed(1) : Math.round(displayValue)}
      {suffix}
    </span>
  );
};

interface StatsSectionProps {
  title?: string;
  subtitle?: string;
}

export const StatsSection: React.FC<StatsSectionProps> = ({
  title = 'Proven results for enterprise teams',
  subtitle = 'See the impact Pactwise delivers for legal operations.',
}) => {
  return (
    <section className="py-20 lg:py-28 bg-purple-900 text-white">
      <div className="container mx-auto px-6">
        {/* Section header */}
        <motion.div
          className="text-center max-w-3xl mx-auto mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {title}
          </h2>
          <p className="text-lg text-purple-200">
            {subtitle}
          </p>
        </motion.div>

        {/* Stats grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {STATS.map((stat, i) => (
            <motion.div
              key={i}
              className="text-center p-8 bg-purple-800/50 border border-purple-700/50"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="text-5xl md:text-6xl font-bold text-white mb-2">
                <AnimatedNumber value={stat.value} suffix={stat.suffix} />
              </div>
              <div className="text-lg font-semibold text-purple-100 mb-1">
                {stat.label}
              </div>
              <div className="text-sm text-purple-300">
                {stat.description}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;

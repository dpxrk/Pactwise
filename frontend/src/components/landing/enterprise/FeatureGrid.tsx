"use client";

import { motion } from 'framer-motion';
import {
  FileSearch,
  AlertTriangle,
  Shield,
  Users,
  Zap,
  BarChart3,
  LucideIcon,
} from 'lucide-react';
import React from 'react';

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

const FEATURES: Feature[] = [
  {
    icon: FileSearch,
    title: 'Contract Analysis',
    description: 'Extract key terms, dates, and obligations from any contract format in seconds.',
  },
  {
    icon: AlertTriangle,
    title: 'Risk Detection',
    description: 'AI-powered clause analysis identifies potential risks before they become problems.',
  },
  {
    icon: Shield,
    title: 'Compliance Monitoring',
    description: 'Automated regulatory checks ensure every contract meets your compliance standards.',
  },
  {
    icon: Users,
    title: 'Vendor Intelligence',
    description: 'Track vendor performance, predict risks, and optimize your supplier relationships.',
  },
  {
    icon: Zap,
    title: 'Workflow Automation',
    description: 'Streamline approvals, routing, and notifications across your legal operations.',
  },
  {
    icon: BarChart3,
    title: 'Analytics & Reporting',
    description: 'Gain insights from your contract portfolio with powerful reporting tools.',
  },
];

interface FeatureGridProps {
  title?: string;
  subtitle?: string;
}

export const FeatureGrid: React.FC<FeatureGridProps> = ({
  title = 'Everything you need to manage contracts at scale',
  subtitle = 'Purpose-built for enterprise legal teams who demand accuracy, security, and speed.',
}) => {
  return (
    <section className="py-20 lg:py-28 bg-white">
      <div className="container mx-auto px-6">
        {/* Section header */}
        <motion.div
          className="text-center max-w-3xl mx-auto mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {title}
          </h2>
          <p className="text-lg text-gray-600">
            {subtitle}
          </p>
        </motion.div>

        {/* Feature grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={i}
              className="group p-8 bg-gray-50 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50/30 transition-all duration-300"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              {/* Icon */}
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-5 group-hover:bg-purple-200 transition-colors">
                <feature.icon className="w-6 h-6 text-purple-700" />
              </div>

              {/* Content */}
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeatureGrid;

"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Upload, Brain, LineChart, Lock, LucideIcon } from 'lucide-react';

interface Step {
  number: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

const STEPS: Step[] = [
  {
    number: '01',
    title: 'Upload Your Contracts',
    description: 'Drag and drop contracts in any format—PDF, Word, scanned images. Our system handles it all.',
    icon: Upload,
  },
  {
    number: '02',
    title: 'AI Agents Analyze',
    description: 'Four specialized AI agents extract data, identify risks, and check compliance automatically.',
    icon: Brain,
  },
  {
    number: '03',
    title: 'Get Actionable Insights',
    description: 'Receive structured data, risk alerts, and recommendations directly in your workflow.',
    icon: LineChart,
  },
];

interface ProcessStepsProps {
  title?: string;
  subtitle?: string;
}

export const ProcessSteps: React.FC<ProcessStepsProps> = ({
  title = 'How Pactwise Works',
  subtitle = 'From upload to insight in three simple steps.',
}) => {
  return (
    <section className="py-20 lg:py-28 bg-gray-50">
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

        {/* Steps */}
        <div className="max-w-4xl mx-auto">
          {STEPS.map((step, i) => (
            <motion.div
              key={i}
              className="relative flex gap-6 md:gap-10 pb-12 last:pb-0"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
            >
              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <div className="absolute left-6 md:left-8 top-16 bottom-0 w-px bg-purple-200" />
              )}

              {/* Step number */}
              <div className="flex-shrink-0">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-purple-100 rounded-full flex items-center justify-center relative z-10">
                  <step.icon className="w-6 h-6 md:w-8 md:h-8 text-purple-700" />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 pt-1 md:pt-3">
                <div className="text-sm font-medium text-purple-600 mb-1">
                  Step {step.number}
                </div>
                <h3 className="text-xl md:text-2xl font-semibold text-gray-900 mb-2">
                  {step.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Security callout */}
        <motion.div
          className="mt-16 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="flex items-center gap-4 p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Lock className="w-6 h-6 text-green-700" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">
                Enterprise-Grade Security
              </h4>
              <p className="text-sm text-gray-600">
                Your data never leaves your control. SOC2 Type II certified with
                end-to-end encryption.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ProcessSteps;

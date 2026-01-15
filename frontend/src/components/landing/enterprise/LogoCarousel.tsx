"use client";

import { motion } from 'framer-motion';
import React from 'react';

// Placeholder company names - in production, these would be real logos
const PLACEHOLDER_COMPANIES = [
  'Acme Corp',
  'TechGlobal',
  'FinanceFirst',
  'LegalEdge',
  'EnterpriseOne',
  'GlobalTech',
  'SecureCo',
  'DataDriven',
];

interface LogoCarouselProps {
  title?: string;
}

export const LogoCarousel: React.FC<LogoCarouselProps> = ({
  title = 'Trusted by leading enterprises worldwide',
}) => {
  return (
    <section className="py-16 bg-gray-50 border-y border-gray-100">
      <div className="container mx-auto px-6">
        {/* Section title */}
        <motion.p
          className="text-center text-sm font-medium text-gray-500 uppercase tracking-wider mb-10"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          {title}
        </motion.p>

        {/* Logo grid - placeholder boxes */}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-8 items-center justify-items-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          {PLACEHOLDER_COMPANIES.map((company, i) => (
            <div
              key={i}
              className="flex items-center justify-center h-12 px-4 text-gray-400 font-medium text-sm"
              style={{ opacity: 0.6 }}
            >
              {/* In production, replace with actual logo images */}
              <span className="text-gray-400">{company}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

interface TestimonialProps {
  quote: string;
  author: string;
  title: string;
  company: string;
  metric?: string;
  metricLabel?: string;
}

export const Testimonial: React.FC<TestimonialProps> = ({
  quote,
  author,
  title,
  company,
  metric,
  metricLabel,
}) => {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-6">
        <motion.div
          className="max-w-4xl mx-auto text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Quote */}
          <blockquote className="text-2xl md:text-3xl font-light text-gray-800 leading-relaxed mb-8">
            &ldquo;{quote}&rdquo;
          </blockquote>

          {/* Author */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-purple-700 font-semibold">
                {author.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
            <div>
              <p className="font-semibold text-gray-900">{author}</p>
              <p className="text-sm text-gray-500">{title}, {company}</p>
            </div>
          </div>

          {/* Featured metric */}
          {metric && (
            <div className="mt-12 pt-8 border-t border-gray-100">
              <div className="inline-flex flex-col items-center px-8 py-4 bg-purple-50 rounded-xl">
                <span className="text-4xl font-bold text-purple-900">{metric}</span>
                {metricLabel && (
                  <span className="text-sm text-purple-700 mt-1">{metricLabel}</span>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default LogoCarousel;

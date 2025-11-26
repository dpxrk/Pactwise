"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Phone, Mail } from 'lucide-react';

interface CTASectionProps {
  onScheduleDemo?: () => void;
}

export const CTASection: React.FC<CTASectionProps> = ({
  onScheduleDemo,
}) => {
  return (
    <section className="py-20 lg:py-28 bg-white">
      <div className="container mx-auto px-6">
        <motion.div
          className="max-w-3xl mx-auto text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          {/* Headline */}
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            Ready to Transform Your Contract Operations?
          </h2>

          {/* Subtext */}
          <p className="text-lg text-gray-600 mb-10 max-w-2xl mx-auto">
            Join the enterprise legal teams already saving thousands of hours
            with intelligent contract management.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <button
              onClick={onScheduleDemo}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-purple-900 text-white font-semibold rounded-lg hover:bg-purple-800 transition-colors text-lg"
            >
              Schedule a Demo
              <ArrowRight className="w-5 h-5" />
            </button>
            <a
              href="mailto:sales@pactwise.com"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:border-purple-300 hover:text-purple-700 transition-colors text-lg"
            >
              <Mail className="w-5 h-5" />
              Contact Sales
            </a>
          </div>

          {/* Contact info */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              <span>1-800-PACTWISE</span>
            </div>
            <div className="hidden sm:block w-px h-4 bg-gray-300" />
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              <span>sales@pactwise.com</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;

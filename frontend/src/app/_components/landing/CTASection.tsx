'use client';

import { motion } from 'framer-motion';
import { Brain, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export const CTASection = React.memo(() => {
  const router = useRouter();
  return (
    <section className="py-20 relative">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative"
        >
          <Card className="relative bg-white border border-gray-900 p-16 text-center overflow-hidden">
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center w-16 h-16 border border-gray-900 mb-8">
                <Brain className="w-8 h-8 text-gray-900" />
              </div>

              <h2 className="text-5xl md:text-6xl font-bold mb-6">
                <span className="text-gray-900">Ready to Transform?</span>
              </h2>
              <p className="text-xl text-gray-600 mb-10 max-w-3xl mx-auto">
                Join forward-thinking companies transforming their contract
                operations. Get started in minutes, see results immediately.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <Button
                  size="lg"
                  className="bg-gray-900 hover:bg-gray-800 text-white text-lg px-10 py-7 rounded-none transition-all duration-200"
                  onClick={() => router.push('/auth/sign-up')}
                >
                  Start Free Trial
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-gray-900 text-gray-900 hover:bg-gray-50 text-lg px-10 py-7 rounded-none"
                  onClick={() => router.push('/contact')}
                >
                  Schedule Demo
                </Button>
              </div>

              <p className="text-sm text-gray-500 mt-8">
                 Start in 5 minutes • Cancel anytime
              </p>
            </div>
          </Card>
        </motion.div>
      </div>
    </section>
  );
});

CTASection.displayName = 'CTASection';
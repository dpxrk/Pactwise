"use client";

import { motion } from "framer-motion";
import { ArrowRight, CheckCircle, Clock, Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useCallback } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { BASE_PRICE, PRICING_FEATURES } from "./constants";

export const PricingCard = React.memo(() => {
  const router = useRouter();

  const handleSignUp = useCallback(() => {
    router.push('/auth/sign-up');
  }, [router]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="relative"
    >
      <Card className="relative bg-white border-2 border-gray-900 p-10 shadow-lg">
        <div className="text-center mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-3">
            Professional Plan
          </h3>
          <p className="text-gray-600 mb-4">
            Everything you need to transform your contract management
          </p>

          {/* Price Display */}
          <div className="mb-6">
            <div className="flex items-baseline justify-center mb-2">
              <span className="text-5xl font-bold text-gray-900">
                ${BASE_PRICE}
              </span>
              <span className="text-gray-600 ml-2">/month</span>
            </div>
            <p className="text-sm text-gray-500">
              All features included
            </p>
          </div>
        </div>

        {/* Features List */}
        <ul className="space-y-4 mb-10">
          {PRICING_FEATURES.map((feature, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="flex items-start gap-3"
            >
              <CheckCircle className="w-5 h-5 text-purple-900 flex-shrink-0 mt-0.5" />
              <span className="text-gray-700">{feature}</span>
            </motion.li>
          ))}
        </ul>

        {/* CTA Buttons */}
        <div className="space-y-3">
          <Button
            className="w-full bg-gray-900 hover:bg-gray-800 text-white py-6 text-lg"
            onClick={handleSignUp}
          >
            Get Started
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            className="w-full text-gray-600 hover:text-gray-900"
            onClick={() => router.push("/contact")}
          >
            Schedule a Demo
          </Button>
        </div>

        {/* Additional Info */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Shield className="w-4 h-4" />
              Secure payment
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Cancel anytime
            </span>
          </div>
        </div>
      </Card>
    </motion.div>
  );
});

PricingCard.displayName = "PricingCard";

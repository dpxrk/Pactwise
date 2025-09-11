"use client";

import { motion } from "framer-motion";
import { ArrowRight, CheckCircle, Clock, Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState, useCallback, useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { DISCOUNT_CODES, BASE_PRICE, PRICING_FEATURES } from "./constants";

export const PricingCard = React.memo(() => {
  const router = useRouter();
  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const calculateDiscountedPrice = useCallback(() => {
    const discountAmount = (BASE_PRICE * appliedDiscount) / 100;
    return BASE_PRICE - discountAmount;
  }, [appliedDiscount]);

  const handleApplyDiscount = useCallback(() => {
    setIsValidating(true);
    setError("");
    setSuccessMessage("");

    // Simulate validation delay
    setTimeout(() => {
      const code = discountCode.toUpperCase().trim();
      if (DISCOUNT_CODES[code as keyof typeof DISCOUNT_CODES]) {
        const discount = DISCOUNT_CODES[code as keyof typeof DISCOUNT_CODES];
        setAppliedDiscount(discount.discount);
        setSuccessMessage(discount.description);
        setError("");
      } else if (code === "") {
        setAppliedDiscount(0);
        setSuccessMessage("");
        setError("");
      } else {
        setError("Invalid discount code");
        setAppliedDiscount(0);
        setSuccessMessage("");
      }
      setIsValidating(false);
    }, 500);
  }, [discountCode]);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleApplyDiscount();
      }
    },
    [handleApplyDiscount]
  );

  const handleSignUp = useCallback(() => {
    const params =
      appliedDiscount > 0
        ? `?discount=${discountCode.toUpperCase()}`
        : "?discount=EARLY500";
    router.push(`/auth/sign-up${params}`);
  }, [appliedDiscount, discountCode, router]);

  const savings = useMemo(() => {
    if (appliedDiscount === 0) return null;
    const monthlySavings = (BASE_PRICE * appliedDiscount) / 100;
    const totalSavings = monthlySavings * 24;
    return { monthly: monthlySavings, total: totalSavings };
  }, [appliedDiscount]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="relative"
    >
      <Card className="relative bg-white border-2 border-gray-900 p-10">
        {/* Badge for popular plan */}
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
          <Badge className="bg-red-600 text-white border-0 px-6 py-1.5 text-sm animate-pulse">
            🔥 FIRST 500 USERS - 90% OFF
          </Badge>
        </div>

        <div className="text-center mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-3">
            Professional Plan
          </h3>
          <p className="text-gray-600 mb-4">
            Everything you need to transform your contract management
          </p>

          {/* Early bird promotion banner */}
          <div className="bg-gray-50 border border-gray-300 p-4 mb-6">
            <p className="text-sm font-semibold text-gray-900 mb-1">
              🎉 Limited Time Launch Offer
            </p>
            <p className="text-xs text-gray-600">
              First 500 users get 90% off for 24 months - Only $50/month!
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Then $500/month after promotional period
            </p>
            <div className="mt-2">
              <span className="text-xs text-gray-500">Use code: </span>
              <Badge className="bg-gray-900 text-white text-xs px-2 py-0.5">
                EARLY500
              </Badge>
            </div>
          </div>

          {/* Price Display */}
          <div className="mb-6">
            {appliedDiscount > 0 ? (
              <>
                <div className="flex items-center justify-center gap-3 mb-2">
                  <span className="text-2xl text-gray-400 line-through">
                    ${BASE_PRICE}
                  </span>
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    {appliedDiscount}% OFF
                  </Badge>
                </div>
                <div className="flex items-baseline justify-center">
                  <span className="text-5xl font-bold text-gray-900">
                    ${calculateDiscountedPrice()}
                  </span>
                  <span className="text-gray-600 ml-2">/month</span>
                </div>
                {successMessage && (
                  <p className="text-sm text-green-600 mt-2">
                    {successMessage}
                  </p>
                )}
              </>
            ) : (
              <div>
                <div className="flex items-baseline justify-center mb-2">
                  <span className="text-5xl font-bold text-gray-900">
                    ${BASE_PRICE}
                  </span>
                  <span className="text-gray-600 ml-2">/month</span>
                </div>
                <p className="text-sm text-gray-500">
                  Regular price after first 500 users
                </p>
              </div>
            )}
          </div>

          {/* Discount Code Input */}
          <div className="mb-8 max-w-sm mx-auto">
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Enter discount code"
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value)}
                onKeyPress={handleKeyPress}
                className="border-gray-300 focus:border-gray-900"
              />
              <Button
                onClick={handleApplyDiscount}
                disabled={isValidating}
                variant="outline"
                className="border-gray-900 text-gray-900 hover:bg-gray-100 min-w-[100px]"
              >
                {isValidating ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full"
                  />
                ) : (
                  "Apply"
                )}
              </Button>
            </div>
            {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
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
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
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
            Claim Your 90% Discount
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

        {/* Savings Calculator */}
        {savings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg"
          >
            <p className="text-sm font-semibold text-green-800 mb-2">
              Your Savings (24-Month Period)
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Monthly Savings:</p>
                <p className="font-bold text-green-800">
                  ${savings.monthly.toFixed(0)}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Total 24-Month Savings:</p>
                <p className="font-bold text-green-800">
                  ${savings.total.toFixed(0)}
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              *Regular pricing of $500/month applies after 24 months
            </p>
          </motion.div>
        )}
      </Card>
    </motion.div>
  );
});

PricingCard.displayName = "PricingCard";

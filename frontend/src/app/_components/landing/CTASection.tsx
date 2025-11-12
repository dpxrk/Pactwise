"use client";

import { motion } from "framer-motion";
import { Brain, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import React from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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
          <Card className="relative bg-white/95 border-2 border-[#291528] p-16 text-center overflow-hidden shadow-lg">
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center w-16 h-16 border border-[#291528] mb-8">
                <Brain className="w-8 h-8 text-[#291528]" />
              </div>

              <h2 className="text-5xl md:text-6xl font-bold mb-6">
                <span className="text-[#291528]">Ready to Transform?</span>
              </h2>
              <p className="text-xl text-[#3a3e3b] mb-10 max-w-3xl mx-auto">
                Join forward-thinking companies transforming their contract
                operations. Get started in minutes, see results immediately.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <Button
                  size="lg"
                  className="bg-[#291528] hover:bg-[#000000] text-[#f0eff4] text-lg px-10 py-7 rounded-none transition-all duration-200"
                  onClick={() => router.push("/auth/sign-up")}
                >
                  Start Free Trial
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </div>

              <p className="text-sm text-[#9e829c] mt-8">
                Start in 5 minutes • Cancel anytime
              </p>
            </div>
          </Card>
        </motion.div>
      </div>
    </section>
  );
});

CTASection.displayName = "CTASection";

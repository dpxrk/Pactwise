"use client";

import { motion } from "framer-motion";
import { Rocket, Lock, Clock, HeadphonesIcon } from "lucide-react";
import Link from "next/link";

import { ModernSignUpForm } from "@/components/auth/ModernSignUpForm";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding (2/3 of screen) */}
      <div
        className="hidden lg:flex lg:w-2/3 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #000000 0%, #4c5760 50%, #66635b 100%)",
        }}
      >
        {/* Gradient mesh background - using new palette colors */}
        <div className="absolute inset-0">
          <div
            className="absolute top-20 left-10 w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"
            style={{ background: "#d7ceb2" }}
          ></div>
          <div
            className="absolute top-40 right-20 w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"
            style={{ background: "#f7f5f0" }}
          ></div>
          <div
            className="absolute bottom-20 left-1/2 w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-blob animation-delay-4000"
            style={{ background: "#4c5760" }}
          ></div>
        </div>

        {/* Content Container */}
        <div className="relative z-10 w-full max-w-2xl mx-auto p-16 flex flex-col justify-center">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-16"
          >
            <Link href="/" className="inline-block">
              <div className="text-4xl font-bold" style={{ color: "#f7f5f0" }}>
                Pactwise
              </div>
            </Link>
          </motion.div>

          {/* Main Heading */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-12"
          >
            <h1
              className="text-6xl font-bold leading-tight mb-6"
              style={{ color: "#f7f5f0" }}
            >
              Start your free trial today
            </h1>
            <p
              className="text-2xl leading-relaxed"
              style={{ color: "#d7ceb2" }}
            >
              Join thousands of companies already transforming their contract
              management with AI-powered insights.
            </p>
          </motion.div>

          {/* Feature List */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid grid-cols-2 gap-6 mb-16"
          >
            <div className="flex items-start gap-4">
              <div
                className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(215, 206, 178, 0.2)" }}
              >
                <Rocket className="w-6 h-6" style={{ color: "#d7ceb2" }} />
              </div>
              <div>
                <div
                  className="font-semibold mb-1"
                  style={{ color: "#f7f5f0" }}
                >
                  Quick Setup
                </div>
                <div
                  className="text-sm opacity-80"
                  style={{ color: "#d7ceb2" }}
                >
                  Get started in under 5 minutes
                </div>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div
                className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(215, 206, 178, 0.2)" }}
              >
                <Clock className="w-6 h-6" style={{ color: "#d7ceb2" }} />
              </div>
              <div>
                <div
                  className="font-semibold mb-1"
                  style={{ color: "#f7f5f0" }}
                >
                  14-Day Free Trial
                </div>
                
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div
                className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(215, 206, 178, 0.2)" }}
              >
                <Lock className="w-6 h-6" style={{ color: "#d7ceb2" }} />
              </div>
              <div>
                <div
                  className="font-semibold mb-1"
                  style={{ color: "#f7f5f0" }}
                >
                  Secure & Private
                </div>
                <div
                  className="text-sm opacity-80"
                  style={{ color: "#d7ceb2" }}
                >
                  SOC 2 Type II certified
                </div>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div
                className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(215, 206, 178, 0.2)" }}
              >
                <HeadphonesIcon
                  className="w-6 h-6"
                  style={{ color: "#d7ceb2" }}
                />
              </div>
              <div>
                <div
                  className="font-semibold mb-1"
                  style={{ color: "#f7f5f0" }}
                >
                  24/7 Support
                </div>
                <div
                  className="text-sm opacity-80"
                  style={{ color: "#d7ceb2" }}
                >
                  Expert help when you need it
                </div>
              </div>
            </div>
          </motion.div>

          {/* Testimonial */}
          {/* <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="p-8 rounded-2xl mb-16"
            style={{ background: "rgba(215, 206, 178, 0.1)" }}
          >
            <blockquote>
              <p
                className="text-lg leading-relaxed mb-4"
                style={{ color: "#f7f5f0" }}
              >
                "Pactwise transformed our contract management process. What used to take days now takes hours. The AI insights have helped us save over $2M in the first year alone."
              </p>
              <footer>
                <div
                  className="font-semibold"
                  style={{ color: "#f7f5f0" }}
                >
                  Sarah Chen
                </div>
                <div
                  className="text-sm opacity-70"
                  style={{ color: "#d7ceb2" }}
                >
                  Chief Legal Officer, TechCorp
                </div>
              </footer>
            </blockquote>
          </motion.div> */}

          {/* Bottom Link */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            <p className="text-sm" style={{ color: "#d7ceb2" }}>
              Already have an account?{" "}
              <Link
                href="/auth/sign-in"
                className="font-medium hover:underline"
                style={{ color: "#f7f5f0" }}
              >
                Sign in instead
              </Link>
            </p>
          </motion.div>
        </div>
      </div>

      {/* Right Panel - Sign Up Form (1/3 of screen) */}
      <div
        className="w-full lg:w-1/3 flex items-center justify-center p-8"
        style={{ background: "#f7f5f0" }}
      >
        {/* Mobile logo */}
        <div className="lg:hidden absolute top-8 left-8">
          <Link
            href="/"
            className="text-2xl font-bold"
            style={{ color: "#4c5760" }}
          >
            Pactwise
          </Link>
        </div>

        {/* Form container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          <ModernSignUpForm />
        </motion.div>
      </div>
    </div>
  );
}

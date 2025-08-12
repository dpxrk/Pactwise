'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PactwiseLogoPremium } from '@/components/ui/PactwiseLogo';
import InteractiveDemoModal from '@/app/_components/demo/InteractiveDemo';
import ContractAnalysisDemo from '@/app/_components/demo/ContractAnalysisDemo';
import VendorEvaluationDemo from '@/app/_components/demo/VendorEvaluationDemo';
import NegotiationAssistantDemo from '@/app/_components/demo/NegotiationAssistantDemo';
import ComplianceMonitoringDemo from '@/app/_components/demo/ComplianceMonitoringDemo';
import { 
  Brain, 
  Sparkles, 
  Shield, 
  Zap, 
  Building, 
  FileText,
  Bot,
  ArrowRight,
  CheckCircle,
  Play,
  Lock,
  Clock,
  Briefcase,
  ChevronRight,
  Network,
  Database,
  GitBranch
} from 'lucide-react';

// Removed custom cursor for cleaner aesthetic

// Pricing Card Component with Discount Codes
const PricingCard = () => {
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  const basePrice = 500;
  
  // Discount codes configuration
  const discountCodes: Record<string, { discount: number; description: string }> = {
    'YEAR1': { discount: 90, description: 'First Year Special - 90% off' },
    'YEAR2': { discount: 80, description: 'Second Year Loyalty - 80% off' },
    'YEAR3': { discount: 70, description: 'Third Year Partner - 70% off' },
    'YEAR4': { discount: 60, description: 'Fourth Year Premium - 60% off' },
    'YEAR5': { discount: 50, description: 'Fifth Year Elite - 50% off' },
    'EARLY50': { discount: 50, description: 'Early Adopter - 50% off' },
    'PARTNER75': { discount: 75, description: 'Partner Discount - 75% off' },
  };
  
  const calculateDiscountedPrice = () => {
    const discountAmount = (basePrice * appliedDiscount) / 100;
    return basePrice - discountAmount;
  };
  
  const handleApplyDiscount = () => {
    setIsValidating(true);
    setError('');
    setSuccessMessage('');
    
    // Simulate validation delay
    setTimeout(() => {
      const code = discountCode.toUpperCase().trim();
      if (discountCodes[code]) {
        setAppliedDiscount(discountCodes[code].discount);
        setSuccessMessage(discountCodes[code].description);
        setError('');
      } else if (code === '') {
        setAppliedDiscount(0);
        setSuccessMessage('');
        setError('');
      } else {
        setError('Invalid discount code');
        setAppliedDiscount(0);
        setSuccessMessage('');
      }
      setIsValidating(false);
    }, 500);
  };
  
  const features = [
    "Unlimited contracts processing",
    "All 4 AI agents included",
    "Advanced analytics & reporting",
    "Custom integrations",
    "Priority 24/7 support",
    "99.99% uptime SLA",
    "API access",
    "Team collaboration tools",
    "Automated workflows",
    "Data export capabilities"
  ];
  
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
          <Badge className="bg-gray-900 text-white border-0 px-6 py-1.5 text-sm">
            ALL FEATURES INCLUDED
          </Badge>
        </div>
        
        <div className="text-center mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-3">Professional Plan</h3>
          <p className="text-gray-600 mb-6">Everything you need to transform your contract management</p>
          
          {/* Price Display */}
          <div className="mb-6">
            {appliedDiscount > 0 ? (
              <>
                <div className="flex items-center justify-center gap-3 mb-2">
                  <span className="text-2xl text-gray-400 line-through">${basePrice}</span>
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
                  <p className="text-sm text-green-600 mt-2">{successMessage}</p>
                )}
              </>
            ) : (
              <div className="flex items-baseline justify-center">
                <span className="text-5xl font-bold text-gray-900">
                  ${basePrice}
                </span>
                <span className="text-gray-600 ml-2">/month</span>
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
                onKeyPress={(e) => e.key === 'Enter' && handleApplyDiscount()}
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
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full"
                  />
                ) : (
                  'Apply'
                )}
              </Button>
            </div>
            {error && (
              <p className="text-sm text-red-600 mt-2">{error}</p>
            )}
          </div>
        </div>
        
        {/* Features List */}
        <ul className="space-y-4 mb-10">
          {features.map((feature, i) => (
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
            onClick={() => {
              const params = appliedDiscount > 0 ? `?discount=${discountCode.toUpperCase()}` : '';
              window.location.href = `/auth/sign-up${params}`;
            }}
          >
            Start 14-Day Free Trial
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
          <Button 
            variant="ghost"
            className="w-full text-gray-600 hover:text-gray-900"
            onClick={() => window.location.href = '/contact'}
          >
            Schedule a Demo
          </Button>
        </div>
        
        {/* Additional Info */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Shield className="w-4 h-4" />
              No credit card required
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Cancel anytime
            </span>
          </div>
        </div>
        
        {/* Savings Calculator */}
        {appliedDiscount > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg"
          >
            <p className="text-sm font-semibold text-green-800 mb-2">Your Savings</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Monthly Savings:</p>
                <p className="font-bold text-green-800">${(basePrice * appliedDiscount / 100).toFixed(0)}</p>
              </div>
              <div>
                <p className="text-gray-600">Annual Savings:</p>
                <p className="font-bold text-green-800">${((basePrice * appliedDiscount / 100) * 12).toFixed(0)}</p>
              </div>
            </div>
          </motion.div>
        )}
      </Card>
    </motion.div>
  );
};

// Interactive Demo Component
const InteractiveDemo = ({ demo, onRunDemo }: { demo: any; onRunDemo: () => void }) => {
  const [isActive, setIsActive] = useState(false);
  const [demoProgress, setDemoProgress] = useState(0);
  
  useEffect(() => {
    if (isActive) {
      const interval = setInterval(() => {
        setDemoProgress(prev => {
          if (prev >= 100) {
            setIsActive(false);
            return 0;
          }
          return prev + 2;
        });
      }, 50);
      return () => clearInterval(interval);
    }
  }, [isActive]);
  
  return (
    <div className="relative p-6 bg-white border border-gray-300 overflow-hidden">
      <div className="absolute top-0 left-0 h-[1px] bg-gray-900"
        style={{ width: `${demoProgress}%`, transition: 'width 0.05s linear' }}
      />
      
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-semibold text-gray-900">{demo.title}</h4>
        <Button
          size="sm"
          variant="outline"
          onClick={onRunDemo}
          className="border-gray-900 text-gray-900 hover:bg-gray-100"
        >
          <span>Launch Demo</span>
        </Button>
      </div>
      
      <div className="space-y-3">
        {demo.steps.map((step: string, i: number) => (
          <motion.div
            key={i}
            className="flex items-center gap-3"
            initial={{ opacity: 0.5 }}
            animate={{ 
              opacity: isActive && demoProgress > (i * 25) ? 1 : 0.5,
              x: isActive && demoProgress > (i * 25) ? 5 : 0
            }}
          >
            <div className={`w-1 h-1 ${
              isActive && demoProgress > (i * 25) 
                ? 'bg-gray-900' 
                : 'bg-gray-400'
            }`} />
            <span className="text-sm text-gray-600">{step}</span>
          </motion.div>
        ))}
      </div>
      
      {isActive && demoProgress === 100 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-3 bg-gray-50 border border-gray-300"
        >
          <p className="text-sm text-gray-700 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Completed
          </p>
        </motion.div>
      )}
    </div>
  );
};

// AI Agent Card Component with enhanced animations
const AIAgentCard = ({ agent, index }: { agent: any; index: number }) => {
  const cardRef = useRef(null);
  
  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      className="relative h-full"
    >
      <Card className="relative overflow-hidden border border-gray-300 bg-white p-8 h-full group hover:border-gray-900 transition-all duration-200">

        <div className="relative z-10">
          <div className="flex items-start justify-between mb-6">
            <div className="p-3 border border-gray-300 bg-white">
              <agent.icon className="w-6 h-6 text-gray-900" />
            </div>
            <Badge 
              variant="outline" 
              className="bg-white border-gray-300 text-gray-600 text-xs"
            >
              {agent.status}
            </Badge>
          </div>

          <h3 className="text-xl font-semibold text-gray-900 mb-3">{agent.name}</h3>
          <p className="text-gray-600 text-sm mb-6 leading-relaxed">{agent.description}</p>

          <div className="space-y-3 mb-6">
            {agent.capabilities.map((capability: string, i: number) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 + i * 0.05 }}
                className="flex items-center gap-3"
              >
                <div className="w-1 h-4 bg-gray-900" />
                <span className="text-sm text-gray-600">{capability}</span>
              </motion.div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-500">Active</span>
              <span className="text-xs text-gray-500">{agent.performance}% Accuracy</span>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-600" />
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

// Interactive Feature Card
const FeatureCard = ({ feature, index }: { feature: any; index: number }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05 }}
      className="group"
    >
      <Card className="relative bg-white border border-gray-300 p-8 h-full overflow-hidden hover:border-gray-900 transition-all duration-200">
        
        <div className="relative z-10">
          <div className="p-3 border border-gray-300 inline-block mb-6">
            <feature.icon className="w-6 h-6 text-gray-900" />
          </div>
          
          <h3 className="text-lg font-semibold mb-3 text-gray-900">{feature.title}</h3>
          <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
          
          {feature.stats && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-xl font-semibold text-gray-900">{feature.stats.value}</span>
                <span className="text-xs text-gray-600">{feature.stats.label}</span>
              </div>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
};

// Main Landing Page Component
export default function LandingPage() {
  const { scrollY } = useScroll();
  const heroRef = useRef(null);
  const isHeroInView = useInView(heroRef, { once: true });
  const [isDemoOpen, setIsDemoOpen] = useState(false);
  const [contractDemoOpen, setContractDemoOpen] = useState(false);
  const [vendorDemoOpen, setVendorDemoOpen] = useState(false);
  const [negotiationDemoOpen, setNegotiationDemoOpen] = useState(false);
  const [complianceDemoOpen, setComplianceDemoOpen] = useState(false);

  // Parallax effects
  const y1 = useTransform(scrollY, [0, 500], [0, -50]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);

  const aiAgents = [
    {
      name: "Contract Analyst AI",
      icon: FileText,
      gradient: "from-blue-500 to-cyan-500",
      color: "#3B82F6",
      status: "Production",
      performance: 99.7,
      description: "Autonomous contract analysis with advanced NLP that understands context, extracts critical terms, and identifies risks in milliseconds.",
      capabilities: [
        "Real-time risk scoring & mitigation",
        "Multi-language contract processing",
        "Automated clause optimization",
        "Regulatory compliance validation"
      ]
    },
    {
      name: "Vendor Intelligence AI",
      icon: Building,
      gradient: "from-purple-500 to-pink-500",
      color: "#A855F7",
      status: "Production",
      performance: 98.9,
      description: "Continuously monitors vendor performance, predicts risks, and autonomously manages relationships at scale.",
      capabilities: [
        "Predictive vendor risk analysis",
        "Automated performance scoring",
        "Smart negotiation recommendations",
        "Supply chain optimization"
      ]
    },
    {
      name: "Legal Operations AI",
      icon: Briefcase,
      gradient: "from-orange-500 to-red-500",
      color: "#F97316",
      status: "Beta",
      performance: 97.2,
      description: "Creates custom business logic, generates contracts from templates, and handles complex legal workflows automatically.",
      capabilities: [
        "Dynamic contract generation",
        "Workflow automation builder",
        "Legal research integration",
        "Precedent analysis & matching"
      ]
    },
    {
      name: "Compliance Guardian AI",
      icon: Shield,
      gradient: "from-green-500 to-emerald-500",
      color: "#10B981",
      status: "Production",
      performance: 99.9,
      description: "24/7 compliance monitoring across all contracts with automatic updates for regulatory changes and policy enforcement.",
      capabilities: [
        "Real-time regulatory tracking",
        "Automated audit trail generation",
        "Policy violation detection",
        "Compliance report automation"
      ]
    }
  ];

  const features = [
    {
      icon: Brain,
      title: "Neural Processing Engine",
      description: "Advanced transformer models trained on millions of contracts for unparalleled accuracy and speed.",
      stats: { value: "150ms", label: "avg. processing time" }
    },
    {
      icon: Network,
      title: "Multi-Agent Orchestration",
      description: "Multiple AI agents collaborate in real-time to solve complex contract challenges.",
      stats: { value: "24/7", label: "autonomous operation" }
    },
    {
      icon: Zap,
      title: "Lightning Performance",
      description: "Process thousands of contracts simultaneously with sub-second response times.",
      stats: { value: "10,000+", label: "contracts/hour" }
    },
    {
      icon: Database,
      title: "Knowledge Graph",
      description: "Continuously learning system that improves with every contract processed.",
      stats: { value: "99.7%", label: "accuracy rate" }
    },
    {
      icon: GitBranch,
      title: "Version Intelligence",
      description: "Track changes, compare versions, and understand contract evolution over time.",
      stats: { value: "∞", label: "version tracking" }
    },
    {
      icon: Lock,
      title: "Zero-Trust Security",
      description: "Military-grade encryption with complete data isolation and audit logging.",
      stats: { value: "SOC2", label: "certified" }
    }
  ];

  const metrics = [
    { label: "Contracts Processed", value: "2.5M+", change: "+127%" },
    { label: "Average Time Saved", value: "87%", change: "+23%" },
    { label: "Cost Reduction", value: "$18M", change: "+45%" },
    { label: "Accuracy Rate", value: "99.7%", change: "+12%" }
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 overflow-hidden relative">
      
      {/* Minimalistic geometric pattern */}
      <div className="fixed inset-0 pointer-events-none">
        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#000000" strokeWidth="0.5" opacity="0.05"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <motion.div 
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <PactwiseLogoPremium size="lg" />
            </motion.div>

            <div className="hidden md:flex items-center gap-8">
              <Link href="#agents" className="text-gray-600 hover:text-gray-900 transition-all duration-200 relative group">
                AI Solutions
                <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-gray-900 group-hover:w-full transition-all duration-300" />
              </Link>
              <Link href="#features" className="text-gray-600 hover:text-gray-900 transition-all duration-200 relative group">
                Technology
                <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-gray-900 group-hover:w-full transition-all duration-300" />
              </Link>
              <Link href="#metrics" className="text-gray-600 hover:text-gray-900 transition-all duration-200 relative group">
                Performance
                <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-gray-900 group-hover:w-full transition-all duration-300" />
              </Link>
            </div>

            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                className="text-gray-600 hover:text-gray-900 hidden md:inline-flex border border-gray-300 hover:border-gray-900"
                onClick={() => window.location.href = '/auth/sign-in'}
              >
                Sign In
              </Button>
              <Button 
                className="bg-gray-900 hover:bg-gray-800 text-white border-0"
                onClick={() => window.location.href = '/auth/sign-up'}
              >
                Get Started
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section ref={heroRef} className="relative flex items-center justify-center pt-32 pb-20">
        <motion.div style={{ y: y1, opacity }} className="container mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isHeroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center max-w-5xl mx-auto"
          >
            {/* Status badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 mb-6 text-xs"
            >
              <div className="w-1.5 h-1.5 bg-gray-900 rounded-full" />
              <span className="text-gray-700">AI Systems Active</span>
            </motion.div>

            <motion.h1 
              className="text-4xl md:text-6xl font-bold mb-6 leading-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <span className="text-gray-900">
                Intelligent Systems
              </span>
              <br />
              <span className="relative">
                <span className="text-gray-900">
                  That Transform Contracts
                </span>
                <motion.div
                  className="absolute -bottom-1 left-0 right-0 h-[1px] bg-gray-900"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                />
              </span>
            </motion.h1>

            <motion.p 
              className="text-lg md:text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Harness intelligent automation for your entire contract lifecycle.
              Analyze, negotiate, comply, and optimize—
              <span className="text-gray-900 font-semibold"> with unprecedented precision.</span>
            </motion.p>

            <motion.div 
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Button 
                size="lg" 
                className="bg-gray-900 hover:bg-gray-800 text-white px-8 py-4 rounded-none border border-gray-900 transition-all duration-200"
                onClick={() => window.location.href = '/auth/sign-up'}
              >
                <Bot className="mr-2 w-4 h-4" />
                Start Automating
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-gray-900 text-gray-900 hover:bg-gray-100 px-8 py-4 rounded-none"
                onClick={() => setIsDemoOpen(true)}
              >
                <Play className="mr-2 w-4 h-4" />
                View Demo
              </Button>
            </motion.div>

            {/* Live metrics */}
            <motion.div 
              className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              {metrics.map((metric, i) => (
                <div key={i} className="bg-white rounded-none p-3 border border-gray-300">
                  <div className="text-2xl font-bold text-gray-900">{metric.value}</div>
                  <div className="text-xs text-gray-600">{metric.label}</div>
                  <div className="text-xs text-gray-500">↑ {metric.change}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Minimal scroll indicator */}
        <motion.div
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 1 }}
        >
          <ChevronRight className="w-6 h-6 text-gray-600" />
        </motion.div>
      </section>

      {/* AI Agents Showcase */}
      <section id="agents" className="py-20 relative">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <Badge className="mb-6 bg-white text-gray-700 border-gray-300 px-6 py-2 text-sm">
              INTELLIGENT AUTOMATION
            </Badge>
            <h2 className="text-5xl md:text-6xl font-bold mb-6">
              <span className="text-gray-900">
                Your Intelligent Contract Suite
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Specialized intelligent systems with distinct capabilities, working together to transform 
              how you manage contracts and vendors
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
            {aiAgents.map((agent, index) => (
              <AIAgentCard key={index} agent={agent} index={index} />
            ))}
          </div>

          {/* AI Network Visualization */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative"
          >
            <Card className="bg-white p-12 border border-gray-300">
              <div className="text-center mb-12">
                <h3 className="text-2xl font-semibold mb-4 text-gray-900">Unified Intelligence Platform</h3>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Our systems work in harmony—forming an integrated network of intelligence, 
                  sharing insights and collaborating to deliver exceptional results
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="text-4xl font-bold text-gray-900 mb-2">
                    99.7%
                  </div>
                  <p className="text-gray-700">Accuracy Rate</p>
                  <p className="text-xs text-gray-500 mt-2">Industry-leading precision</p>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-gray-900 mb-2">
                    150ms
                  </div>
                  <p className="text-gray-700">Response Time</p>
                  <p className="text-xs text-gray-500 mt-2">Real-time processing</p>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-gray-900 mb-2">
                    24/7
                  </div>
                  <p className="text-gray-700">Continuous Operation</p>
                  <p className="text-xs text-gray-500 mt-2">Always active</p>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Interactive Demos Section */}
      <section className="py-20 relative">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <Badge className="mb-6 bg-white text-gray-700 border-gray-300 px-6 py-2 text-sm">
              DEMONSTRATIONS
            </Badge>
            <h2 className="text-5xl md:text-6xl font-bold mb-6">
              <span className="text-gray-900">
                Experience the Platform
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-6">
              Experience real-time operations with interactive demonstrations
            </p>
            <Button 
              onClick={() => setIsDemoOpen(true)}
              className="bg-gray-900 hover:bg-gray-800 text-white px-8 py-4"
            >
              <Sparkles className="mr-2 w-4 h-4" />
              Launch Live Demo
            </Button>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {[
              {
                title: "Contract Analysis Demo",
                steps: [
                  "Upload contract document",
                  "AI extracts key terms and clauses",
                  "Risk assessment and scoring",
                  "Generate actionable insights"
                ],
                onRun: () => setContractDemoOpen(true)
              },
              {
                title: "Vendor Evaluation Demo",
                steps: [
                  "Import vendor data",
                  "Performance metrics analysis",
                  "Compliance verification",
                  "Generate recommendation report"
                ],
                onRun: () => setVendorDemoOpen(true)
              },
              {
                title: "Negotiation Assistant Demo",
                steps: [
                  "Input negotiation parameters",
                  "AI suggests optimal terms",
                  "Real-time strategy adjustment",
                  "Final agreement generation"
                ],
                onRun: () => setNegotiationDemoOpen(true)
              },
              {
                title: "Compliance Monitoring Demo",
                steps: [
                  "Connect to regulatory feeds",
                  "Scan active contracts",
                  "Identify compliance gaps",
                  "Auto-generate remediation plan"
                ],
                onRun: () => setComplianceDemoOpen(true)
              }
            ].map((demo, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <InteractiveDemo demo={demo} onRunDemo={demo.onRun} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Technology Grid */}
      <section id="features" className="py-20 relative bg-white">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <Badge className="mb-6 bg-white text-gray-700 border-gray-300 px-6 py-2 text-sm">
              TECHNOLOGY
            </Badge>
            <h2 className="text-5xl md:text-6xl font-bold mb-6">
              <span className="text-gray-900">
                Built for Enterprise Scale
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Powered by advanced automation, machine learning, and distributed computing
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <FeatureCard key={index} feature={feature} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 relative bg-gray-50">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <Badge className="mb-6 bg-white text-gray-700 border-gray-300 px-6 py-2 text-sm">
              PRICING
            </Badge>
            <h2 className="text-5xl md:text-6xl font-bold mb-6">
              <span className="text-gray-900">
                Simple, Transparent Pricing
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              One plan, all features included. Special discounts available.
            </p>
          </motion.div>

          <div className="max-w-2xl mx-auto">
            <PricingCard />
          </div>
        </div>
      </section>

      {/* CTA Section */}
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
                  <span className="text-gray-900">
                    Ready to Transform?
                  </span>
                </h2>
                <p className="text-xl text-gray-600 mb-10 max-w-3xl mx-auto">
                  Join forward-thinking companies transforming their contract operations. 
                  Get started in minutes, see results immediately.
                </p>
                
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                  <Button 
                    size="lg" 
                    className="bg-gray-900 hover:bg-gray-800 text-white text-lg px-10 py-7 rounded-none transition-all duration-200"
                    onClick={() => window.location.href = '/auth/sign-up'}
                  >
                    Start Free Trial
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="border-gray-900 text-gray-900 hover:bg-gray-50 text-lg px-10 py-7 rounded-none"
                    onClick={() => window.location.href = '/contact'}
                  >
                    Schedule Demo
                  </Button>
                </div>
                
                <p className="text-sm text-gray-500 mt-8">
                  No credit card required • Start in 5 minutes • Cancel anytime
                </p>
              </div>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 border-t border-gray-300 bg-white">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center gap-3 mb-6 md:mb-0">
              <div 
                className="text-lg select-none"
                style={{
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Arial, sans-serif',
                  letterSpacing: '-0.03em'
                }}
              >
                <span style={{ fontWeight: 400 }}>P</span>
                <span style={{ fontWeight: 300 }}>act</span>
                <span style={{ fontWeight: 200 }}>wise</span>
              </div>
            </div>
            <div className="flex items-center gap-8">
              <Link href="#" className="text-gray-600 hover:text-gray-900 transition">Documentation</Link>
              <Link href="#" className="text-gray-600 hover:text-gray-900 transition">API</Link>
              <Link href="#" className="text-gray-600 hover:text-gray-900 transition">Privacy</Link>
              <Link href="#" className="text-gray-600 hover:text-gray-900 transition">Terms</Link>
            </div>
          </div>
          <div className="text-center text-sm text-gray-500 mt-12">
            © 2024 PactWise. Enterprise contract intelligence.
          </div>
        </div>
      </footer>

      {/* Interactive Demo Modals */}
      <InteractiveDemoModal isOpen={isDemoOpen} onClose={() => setIsDemoOpen(false)} />
      <ContractAnalysisDemo isOpen={contractDemoOpen} onClose={() => setContractDemoOpen(false)} />
      <VendorEvaluationDemo isOpen={vendorDemoOpen} onClose={() => setVendorDemoOpen(false)} />
      <NegotiationAssistantDemo isOpen={negotiationDemoOpen} onClose={() => setNegotiationDemoOpen(false)} />
      <ComplianceMonitoringDemo isOpen={complianceDemoOpen} onClose={() => setComplianceDemoOpen(false)} />
    </div>
  );
}
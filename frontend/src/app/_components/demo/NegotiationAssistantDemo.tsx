'use client';

import React, { useState, Fragment, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DemoPaymentModal from '@/components/demo/DemoPaymentModal';
import { useDemoAccess } from '@/hooks/useDemoAccess';
import { generateNegotiationContract } from './sampleGenerators';
import { 
  X, Upload, Briefcase, TrendingUp, AlertCircle, CheckCircle,
  Target, BarChart3, DollarSign, Lightbulb, MessageSquare,
  ArrowUpRight, ArrowDownRight, Minus, FileText, Sparkles,
  Lock, Eye, Brain, Zap, Shield, Award, Users, Clock,
  AlertTriangle, ChevronRight, Calculator, LineChart,
  HandshakeIcon, Scale, Percent, TrendingDown, Activity,
  ArrowRight, Info, ChevronDown, ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';

interface NegotiationAssistantDemoProps {
  isOpen: boolean;
  onClose: () => void;
}

// Business Logic: Contract Analysis Engine
class NegotiationAnalyzer {
  private contract: any;
  private market: any;
  
  constructor(contractData: string) {
    this.contract = this.parseContract(contractData);
    this.market = this.getMarketData();
  }
  
  private parseContract(data: string): any {
    const lines = data.split('\n').filter(line => line.trim());
    const contract: any = {
      current: {},
      desired: {},
      metadata: {}
    };
    
    let section = 'current';
    lines.forEach(line => {
      if (line.includes('CURRENT TERMS:')) {
        section = 'current';
      } else if (line.includes('DESIRED TERMS:')) {
        section = 'desired';
      } else if (line.includes(':')) {
        const [key, value] = line.split(':').map(s => s.trim());
        const cleanKey = key.replace(/^-\s*/, '').toLowerCase().replace(/\s+/g, '_');
        contract[section][cleanKey] = value;
      }
    });
    
    // Extract numerical values
    Object.keys(contract.current).forEach(key => {
      const value = contract.current[key];
      if (value?.includes('$')) {
        const num = parseInt(value.replace(/[^0-9]/g, ''));
        contract.current[`${key}_numeric`] = num;
      } else if (value?.includes('%')) {
        const num = parseFloat(value.replace('%', ''));
        contract.current[`${key}_numeric`] = num;
      }
    });
    
    Object.keys(contract.desired).forEach(key => {
      const value = contract.desired[key];
      if (value?.includes('$')) {
        const num = parseInt(value.replace(/[^0-9]/g, ''));
        contract.desired[`${key}_numeric`] = num;
      } else if (value?.includes('%')) {
        const num = parseFloat(value.replace('%', ''));
        contract.desired[`${key}_numeric`] = num;
      }
    });
    
    return contract;
  }
  
  private getMarketData() {
    return {
      avg_discount: 0.15,
      payment_terms_standard: 30,
      sla_standard: 99.0,
      price_cap_standard: 5,
      negotiation_success_rates: {
        price: 0.65,
        payment_terms: 0.85,
        sla: 0.70,
        support: 0.60
      }
    };
  }
  
  public analyzeLeverage(): any[] {
    const leveragePoints = [];
    
    // Dynamic leverage analysis based on contract data
    const currentValue = this.contract.current.contract_value_numeric || 500000;
    const contractDuration = this.extractDuration();
    
    if (currentValue > 100000) {
      leveragePoints.push({
        type: 'volume',
        strength: currentValue > 500000 ? 'high' : 'medium',
        description: `Contract value of $${(currentValue/1000).toFixed(0)}K provides significant negotiating power`,
        score: Math.min(100, (currentValue / 10000))
      });
    }
    
    if (contractDuration >= 12) {
      leveragePoints.push({
        type: 'commitment',
        strength: contractDuration >= 36 ? 'high' : 'medium',
        description: `${contractDuration}-month commitment demonstrates stability`,
        score: Math.min(100, contractDuration * 2.5)
      });
    }
    
    // Market position analysis
    const marketPosition = this.analyzeMarketPosition();
    if (marketPosition.alternatives > 3) {
      leveragePoints.push({
        type: 'alternatives',
        strength: 'high',
        description: `${marketPosition.alternatives} viable alternatives strengthen position`,
        score: 85
      });
    }
    
    // Historical relationship
    leveragePoints.push({
      type: 'relationship',
      strength: 'medium',
      description: 'Established relationship with proven payment history',
      score: 70
    });
    
    // Growth potential
    if (this.hasGrowthPotential()) {
      leveragePoints.push({
        type: 'growth',
        strength: 'high',
        description: 'Potential for 40-60% expansion if terms are favorable',
        score: 90
      });
    }
    
    return leveragePoints.sort((a, b) => b.score - a.score);
  }
  
  private extractDuration(): number {
    // Extract contract duration from terms
    const terms = this.contract.current.contract_value || '';
    if (terms.includes('year')) {
      return 12;
    } else if (terms.includes('month')) {
      const match = terms.match(/(\d+)/);
      return match ? parseInt(match[1]) : 12;
    }
    return 12; // Default to annual
  }
  
  private analyzeMarketPosition(): any {
    return {
      alternatives: Math.floor(Math.random() * 3) + 4,
      market_share: 0.15,
      switching_cost: 'medium',
      vendor_dependency: 'low'
    };
  }
  
  private hasGrowthPotential(): boolean {
    const currentValue = this.contract.current.contract_value_numeric || 500000;
    return currentValue > 200000;
  }
  
  public generateNegotiationStrategy(): any {
    const leverage = this.analyzeLeverage();
    const leverageScore = leverage.reduce((sum, l) => sum + l.score, 0) / leverage.length;
    
    return {
      overall_position: leverageScore > 75 ? 'strong' : leverageScore > 50 ? 'moderate' : 'weak',
      success_probability: Math.min(95, leverageScore + 10),
      recommended_approach: this.getApproachBasedOnLeverage(leverageScore),
      priority_items: this.prioritizeNegotiationItems(),
      tactics: this.generateTactics(leverageScore),
      concessions: this.identifyConcessions(),
      walk_away_points: this.defineWalkAwayPoints()
    };
  }
  
  private getApproachBasedOnLeverage(score: number): string {
    if (score > 75) return 'assertive';
    if (score > 50) return 'collaborative';
    return 'accommodating';
  }
  
  private prioritizeNegotiationItems(): any[] {
    const items = [];
    
    // Price reduction
    const currentPrice = this.contract.current.contract_value_numeric || 500000;
    const desiredPrice = this.contract.desired.contract_value_numeric || 450000;
    const priceDiff = ((currentPrice - desiredPrice) / currentPrice) * 100;
    
    items.push({
      item: 'Price Reduction',
      priority: 'high',
      current: `$${(currentPrice/1000).toFixed(0)}K`,
      target: `$${(desiredPrice/1000).toFixed(0)}K`,
      feasibility: priceDiff <= 15 ? 'high' : priceDiff <= 25 ? 'medium' : 'low',
      savings: currentPrice - desiredPrice,
      strategy: priceDiff <= 10 ? 'Direct request with volume commitment' : 'Phased reduction over time'
    });
    
    // Payment terms
    const currentPayment = parseInt(this.contract.current.payment_terms?.match(/\d+/)?.[0] || '60');
    const desiredPayment = parseInt(this.contract.desired.payment_terms?.match(/\d+/)?.[0] || '30');
    
    items.push({
      item: 'Payment Terms',
      priority: 'medium',
      current: `Net ${currentPayment}`,
      target: `Net ${desiredPayment}`,
      feasibility: 'high',
      savings: this.calculatePaymentTermsSavings(currentPayment, desiredPayment, currentPrice),
      strategy: 'Offer prompt payment discount'
    });
    
    // SLA improvements
    const currentSLA = parseFloat(this.contract.current.service_level?.match(/[\d.]+/)?.[0] || '95');
    const desiredSLA = parseFloat(this.contract.desired.service_level?.match(/[\d.]+/)?.[0] || '99.9');
    
    items.push({
      item: 'SLA Improvement',
      priority: desiredSLA - currentSLA > 3 ? 'high' : 'medium',
      current: `${currentSLA}% uptime`,
      target: `${desiredSLA}% uptime`,
      feasibility: desiredSLA <= 99 ? 'medium' : 'low',
      savings: 0,
      strategy: 'Link to business criticality and competitor offerings'
    });
    
    return items;
  }
  
  private calculatePaymentTermsSavings(current: number, desired: number, contractValue: number): number {
    const daysDiff = current - desired;
    const dailyRate = contractValue / 365;
    const interestRate = 0.05; // 5% annual
    return Math.round((daysDiff * dailyRate * interestRate) / 365);
  }
  
  private generateTactics(leverageScore: number): any[] {
    const tactics = [];
    
    if (leverageScore > 70) {
      tactics.push({
        name: 'Competitive Benchmarking',
        description: 'Present competitor quotes showing 15-20% lower pricing',
        timing: 'opening',
        effectiveness: 'high'
      });
    }
    
    tactics.push({
      name: 'Bundle & Expand',
      description: 'Offer to expand services by 40% for better unit pricing',
      timing: 'middle',
      effectiveness: 'high'
    });
    
    tactics.push({
      name: 'Multi-Year Commitment',
      description: 'Propose 3-year deal for additional 5-7% discount',
      timing: 'closing',
      effectiveness: 'medium'
    });
    
    tactics.push({
      name: 'Reference & Case Study',
      description: 'Offer to be a reference customer for additional benefits',
      timing: 'closing',
      effectiveness: 'medium'
    });
    
    return tactics;
  }
  
  private identifyConcessions(): any[] {
    return [
      {
        item: 'Contract Length',
        current: '1 year',
        willing_to_offer: '3 years',
        value_to_vendor: 'high'
      },
      {
        item: 'Payment Schedule',
        current: 'Monthly',
        willing_to_offer: 'Annual prepay',
        value_to_vendor: 'medium'
      },
      {
        item: 'Reference Rights',
        current: 'None',
        willing_to_offer: 'Logo & case study',
        value_to_vendor: 'medium'
      }
    ];
  }
  
  private defineWalkAwayPoints(): any[] {
    return [
      {
        item: 'Price',
        threshold: 'No more than current rate',
        rationale: 'Market alternatives available at lower cost'
      },
      {
        item: 'SLA',
        threshold: 'Minimum 99% uptime',
        rationale: 'Business critical operations require reliability'
      },
      {
        item: 'Support',
        threshold: 'At least 16x5 coverage',
        rationale: 'Extended business hours requirement'
      }
    ];
  }
  
  public generateTalkingPoints(): any[] {
    const points = [];
    const strategy = this.generateNegotiationStrategy();
    
    // Dynamic talking points based on analysis
    points.push({
      stage: 'opening',
      type: 'relationship',
      script: this.generateOpeningScript(strategy),
      tone: 'collaborative',
      objective: 'Set positive tone and establish mutual benefit framework'
    });
    
    points.push({
      stage: 'value_proposition',
      type: 'business_case',
      script: this.generateValueScript(strategy),
      tone: 'confident',
      objective: 'Demonstrate value and growth potential'
    });
    
    points.push({
      stage: 'negotiation',
      type: 'proposal',
      script: this.generateProposalScript(strategy),
      tone: strategy.recommended_approach,
      objective: 'Present specific terms and requirements'
    });
    
    points.push({
      stage: 'objection_handling',
      type: 'response',
      script: this.generateObjectionResponses(),
      tone: 'understanding',
      objective: 'Address concerns while maintaining position'
    });
    
    points.push({
      stage: 'closing',
      type: 'commitment',
      script: this.generateClosingScript(strategy),
      tone: 'decisive',
      objective: 'Secure agreement or define next steps'
    });
    
    return points;
  }
  
  private generateOpeningScript(strategy: any): string {
    const templates = [
      "I appreciate you taking the time to discuss our partnership. We've been very satisfied with your services, and as we plan for our next contract period, I'd like to explore how we can structure an agreement that delivers even more value for both organizations.",
      "Thank you for joining this discussion. Our relationship has been valuable, and as we look at renewing, we see opportunities to significantly expand our engagement if we can align on terms that reflect both the current market and our growth trajectory.",
      "I want to start by acknowledging the strong partnership we've built. As we approach renewal, we're at an inflection point where the right agreement could unlock substantial growth opportunities for both of us."
    ];
    
    const index = strategy.overall_position === 'strong' ? 1 : 
                  strategy.overall_position === 'moderate' ? 0 : 2;
    return templates[index];
  }
  
  private generateValueScript(strategy: any): string {
    const currentValue = this.contract.current.contract_value_numeric || 500000;
    const growthPotential = Math.round(currentValue * 0.4);
    
    return `Based on our internal projections, we're positioned to increase our usage by 40-60% over the next 18 months, representing an additional $${(growthPotential/1000).toFixed(0)}K in annual revenue. However, this expansion is contingent on achieving pricing and terms that align with our budget constraints and operational requirements. We're also evaluating proposals from ${this.analyzeMarketPosition().alternatives} other vendors who have expressed interest in capturing this growth opportunity.`;
  }
  
  private generateProposalScript(strategy: any): string {
    const items = strategy.priority_items;
    const primary = items[0];
    
    return `Here's what we're proposing: ${primary.strategy}. Specifically, we're looking to achieve ${primary.target} from the current ${primary.current}. In exchange, we're prepared to commit to a longer-term agreement and serve as a reference account. This structure would save us approximately $${(primary.savings/1000).toFixed(0)}K annually while providing you with a stable, growing account and valuable market validation.`;
  }
  
  private generateObjectionResponses(): any {
    return {
      price_objection: "I understand your position on pricing. Let's explore creative structures like volume tiers or performance-based pricing that could work for both of us.",
      sla_objection: "The SLA requirement is driven by our business criticality. Perhaps we could implement a tiered SLA with different service levels for different components?",
      timeline_objection: "While we'd prefer to finalize quickly, we're willing to phase the implementation if that helps with your resource planning."
    };
  }
  
  private generateClosingScript(strategy: any): string {
    if (strategy.overall_position === 'strong') {
      return "Based on our discussion, I believe we have a framework that works. Can we agree to these key terms today, with the understanding that we'll work out the implementation details over the next week? I have authorization to move forward if we can reach agreement on these points.";
    } else {
      return "I appreciate your flexibility in this discussion. What would you need from us to make this proposal work? We're motivated to find a solution that benefits both parties and are open to creative approaches.";
    }
  }
  
  public calculateROI(): any {
    const currentPrice = this.contract.current.contract_value_numeric || 500000;
    const desiredPrice = this.contract.desired.contract_value_numeric || 450000;
    const savings = currentPrice - desiredPrice;
    const negotiationCost = 5000; // Estimated cost of negotiation process
    
    return {
      annual_savings: savings,
      three_year_savings: savings * 3,
      roi_percentage: ((savings - negotiationCost) / negotiationCost) * 100,
      payback_period: negotiationCost / (savings / 12),
      break_even: 'Immediate'
    };
  }
}

export default function NegotiationAssistantDemo({ isOpen, onClose }: NegotiationAssistantDemoProps) {
  const [negotiationData, setNegotiationData] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [analysisTime, setAnalysisTime] = useState(0);
  const [activeTab, setActiveTab] = useState('strategy');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['opening']));
  
  // Advanced settings
  const [negotiationType, setNegotiationType] = useState('renewal');
  const [urgency, setUrgency] = useState('medium');
  const [riskTolerance, setRiskTolerance] = useState(50);
  
  const { isDemoUnlocked, unlockDemo } = useDemoAccess();
  const isUnlocked = isDemoUnlocked('negotiation-assistant');

  // Generate random sample negotiation on each render
  const sampleNegotiation = useMemo(() => generateNegotiationContract(), []);

  // Dynamic analysis using business logic
  const analyzer = useMemo(() => {
    if (negotiationData) {
      return new NegotiationAnalyzer(negotiationData);
    }
    return null;
  }, [negotiationData]);

  const leveragePoints = analyzer?.analyzeLeverage() || [];
  const negotiationStrategy = analyzer?.generateNegotiationStrategy() || {};
  const talkingPoints = analyzer?.generateTalkingPoints() || [];
  const roi = analyzer?.calculateROI() || {};

  const startAnalysis = () => {
    setIsAnalyzing(true);
    const startTime = Date.now();
    
    // Simulate progressive analysis with dynamic timing
    const stages = [
      { message: 'Parsing contract terms...', duration: 500 },
      { message: 'Analyzing market conditions...', duration: 700 },
      { message: 'Calculating leverage points...', duration: 600 },
      { message: 'Generating negotiation strategy...', duration: 800 },
      { message: 'Creating talking points...', duration: 600 },
      { message: 'Finalizing recommendations...', duration: 300 }
    ];
    
    let currentStage = 0;
    const runStage = () => {
      if (currentStage < stages.length) {
        // Update UI with current stage
        setTimeout(() => {
          currentStage++;
          runStage();
        }, stages[currentStage].duration);
      } else {
        const endTime = Date.now();
        setAnalysisTime((endTime - startTime) / 1000);
        setIsAnalyzing(false);
        setShowResults(true);
      }
    };
    
    runStage();
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  return (
    <Fragment>
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-6xl max-h-[90vh] overflow-hidden bg-white border border-gray-300"
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">AI Negotiation Assistant</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Dynamic strategy generation powered by real-time business logic
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
              {!showResults ? (
                <div className="p-6">
                  {!isAnalyzing ? (
                    <>
                      {/* Advanced Settings */}
                      <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Negotiation Parameters</h3>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label className="text-xs">Negotiation Type</Label>
                            <Select value={negotiationType} onValueChange={setNegotiationType}>
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="renewal">Contract Renewal</SelectItem>
                                <SelectItem value="new">New Contract</SelectItem>
                                <SelectItem value="amendment">Amendment</SelectItem>
                                <SelectItem value="termination">Early Termination</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">Urgency Level</Label>
                            <Select value={urgency} onValueChange={setUrgency}>
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Low - Plenty of time</SelectItem>
                                <SelectItem value="medium">Medium - Standard timeline</SelectItem>
                                <SelectItem value="high">High - Urgent deadline</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">Risk Tolerance</Label>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">Low</span>
                              <Slider 
                                value={[riskTolerance]} 
                                onValueChange={(v) => setRiskTolerance(v[0])}
                                max={100}
                                step={10}
                                className="flex-1"
                              />
                              <span className="text-xs text-gray-500">High</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-4">
                          <Label className="text-sm font-semibold text-gray-700">
                            Contract Terms Analysis
                          </Label>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setNegotiationData(sampleNegotiation)}
                            >
                              <FileText className="w-3 h-3 mr-1" />
                              Load Example
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                            >
                              <Upload className="w-3 h-3 mr-1" />
                              Import Contract
                            </Button>
                          </div>
                        </div>
                        
                        <Textarea
                          value={negotiationData}
                          onChange={(e) => setNegotiationData(e.target.value)}
                          placeholder="Enter current terms and desired outcomes..."
                          className="min-h-[250px] p-4 font-mono text-sm border-gray-300"
                        />

                        <div className="flex items-center justify-between mt-4">
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Brain className="w-3 h-3" />
                              AI-powered analysis
                            </span>
                            <span className="flex items-center gap-1">
                              <Zap className="w-3 h-3" />
                              Real-time strategy
                            </span>
                            <span className="flex items-center gap-1">
                              <Shield className="w-3 h-3" />
                              Risk assessment
                            </span>
                          </div>
                          <Button
                            onClick={startAnalysis}
                            disabled={!negotiationData}
                            className="bg-gray-900 hover:bg-gray-800 text-white"
                          >
                            <Lightbulb className="w-4 h-4 mr-2" />
                            Generate Strategy
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20">
                      <div className="relative mb-8">
                        <motion.div
                          className="w-20 h-20 border-4 border-gray-200 rounded-full"
                        />
                        <motion.div
                          className="absolute inset-0 w-20 h-20 border-4 border-gray-900 rounded-full border-t-transparent"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        />
                        <Brain className="absolute inset-0 m-auto w-8 h-8 text-gray-900" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Analyzing negotiation parameters...
                      </h3>
                      <p className="text-sm text-gray-600">
                        Generating optimal strategy based on market data and contract terms
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6">
                  {/* Results Header with Key Metrics */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">Negotiation Intelligence Report</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Generated in {analysisTime.toFixed(1)}s • Confidence: {negotiationStrategy.success_probability}%
                        </p>
                      </div>
                      <Badge className={`px-3 py-1 ${
                        negotiationStrategy.overall_position === 'strong' ? 'bg-green-100 text-green-800' :
                        negotiationStrategy.overall_position === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {negotiationStrategy.overall_position?.toUpperCase()} POSITION
                      </Badge>
                    </div>

                    {/* Quick Metrics */}
                    <div className="grid grid-cols-4 gap-4 mb-6">
                      <Card className="p-3 border-gray-200">
                        <div className="flex items-center gap-2 mb-1">
                          <TrendingUp className="w-4 h-4 text-green-600" />
                          <span className="text-xs text-gray-600">Success Rate</span>
                        </div>
                        <p className="text-xl font-bold text-gray-900">{negotiationStrategy.success_probability}%</p>
                      </Card>
                      <Card className="p-3 border-gray-200">
                        <div className="flex items-center gap-2 mb-1">
                          <DollarSign className="w-4 h-4 text-blue-600" />
                          <span className="text-xs text-gray-600">Potential Savings</span>
                        </div>
                        <p className="text-xl font-bold text-gray-900">${(roi.annual_savings/1000).toFixed(0)}K</p>
                      </Card>
                      <Card className="p-3 border-gray-200">
                        <div className="flex items-center gap-2 mb-1">
                          <Scale className="w-4 h-4 text-purple-600" />
                          <span className="text-xs text-gray-600">Leverage Score</span>
                        </div>
                        <p className="text-xl font-bold text-gray-900">
                          {leveragePoints.length > 0 ? Math.round(leveragePoints[0].score) : 0}/100
                        </p>
                      </Card>
                      <Card className="p-3 border-gray-200">
                        <div className="flex items-center gap-2 mb-1">
                          <Award className="w-4 h-4 text-orange-600" />
                          <span className="text-xs text-gray-600">ROI</span>
                        </div>
                        <p className="text-xl font-bold text-gray-900">{roi.roi_percentage?.toFixed(0)}%</p>
                      </Card>
                    </div>
                  </div>

                  {/* Tabbed Content */}
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-5">
                      <TabsTrigger value="strategy">Strategy</TabsTrigger>
                      <TabsTrigger value="leverage">Leverage</TabsTrigger>
                      <TabsTrigger value="talking">Talking Points</TabsTrigger>
                      <TabsTrigger value="simulation">Simulation</TabsTrigger>
                      <TabsTrigger value="risks">Risks</TabsTrigger>
                    </TabsList>

                    <TabsContent value="strategy" className="mt-6">
                      <div className="grid grid-cols-2 gap-6">
                        {/* Priority Items */}
                        <Card className="p-4 border-gray-300">
                          <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Target className="w-4 h-4" />
                            Negotiation Priorities
                          </h4>
                          <div className="space-y-3">
                            {negotiationStrategy.priority_items?.map((item: any, i: number) => (
                              <div key={i} className="p-3 bg-gray-50 border border-gray-200 rounded">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-semibold text-sm text-gray-900">{item.item}</span>
                                  <Badge variant="outline" className={`text-xs ${
                                    item.feasibility === 'high' ? 'border-green-300 text-green-700' :
                                    item.feasibility === 'medium' ? 'border-yellow-300 text-yellow-700' :
                                    'border-red-300 text-red-700'
                                  }`}>
                                    {item.feasibility} feasibility
                                  </Badge>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mb-2 text-xs">
                                  <div>
                                    <span className="text-gray-500">Current:</span>
                                    <span className="ml-1 text-gray-700">{item.current}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Target:</span>
                                    <span className="ml-1 font-semibold text-gray-900">{item.target}</span>
                                  </div>
                                </div>
                                <p className="text-xs text-gray-600 italic">{item.strategy}</p>
                                {item.savings > 0 && (
                                  <p className="text-xs text-green-600 mt-1">
                                    Savings: ${(item.savings/1000).toFixed(0)}K/year
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </Card>

                        {/* Tactics */}
                        <Card className="p-4 border-gray-300">
                          <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Zap className="w-4 h-4" />
                            Negotiation Tactics
                          </h4>
                          <div className="space-y-3">
                            {negotiationStrategy.tactics?.map((tactic: any, i: number) => (
                              <div key={i} className="p-3 bg-gray-50 border border-gray-200 rounded">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-semibold text-sm text-gray-900">{tactic.name}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {tactic.timing}
                                  </Badge>
                                </div>
                                <p className="text-xs text-gray-600 mb-2">{tactic.description}</p>
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-gray-500">Effectiveness:</span>
                                  <div className="flex gap-1">
                                    {[1,2,3].map(star => (
                                      <div key={star} className={`w-3 h-3 rounded-full ${
                                        (tactic.effectiveness === 'high' && star <= 3) ||
                                        (tactic.effectiveness === 'medium' && star <= 2) ||
                                        (tactic.effectiveness === 'low' && star <= 1)
                                          ? 'bg-yellow-400' : 'bg-gray-200'
                                      }`} />
                                    ))}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </Card>
                      </div>

                      {/* Concessions and Walk-Away Points */}
                      <div className="grid grid-cols-2 gap-6 mt-6">
                        <Card className="p-4 border-gray-300">
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <HandshakeIcon className="w-4 h-4" />
                            Available Concessions
                          </h4>
                          <div className="space-y-2">
                            {negotiationStrategy.concessions?.map((concession: any, i: number) => (
                              <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <div className="text-xs">
                                  <p className="font-semibold text-gray-900">{concession.item}</p>
                                  <p className="text-gray-600">{concession.current} → {concession.willing_to_offer}</p>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {concession.value_to_vendor}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </Card>

                        <Card className="p-4 border-gray-300">
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            Walk-Away Points
                          </h4>
                          <div className="space-y-2">
                            {negotiationStrategy.walk_away_points?.map((point: any, i: number) => (
                              <div key={i} className="p-2 bg-red-50 border-l-2 border-red-400 rounded">
                                <p className="text-xs font-semibold text-red-900">{point.item}</p>
                                <p className="text-xs text-red-700">{point.threshold}</p>
                                <p className="text-xs text-gray-600 mt-1">{point.rationale}</p>
                              </div>
                            ))}
                          </div>
                        </Card>
                      </div>
                    </TabsContent>

                    <TabsContent value="leverage" className="mt-6">
                      <div className="space-y-4">
                        {leveragePoints.map((point, i) => (
                          <Card key={i} className="p-4 border-gray-300">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${
                                  point.strength === 'high' ? 'bg-green-100' :
                                  point.strength === 'medium' ? 'bg-yellow-100' :
                                  'bg-gray-100'
                                }`}>
                                  {point.type === 'volume' && <DollarSign className="w-5 h-5 text-gray-700" />}
                                  {point.type === 'commitment' && <Clock className="w-5 h-5 text-gray-700" />}
                                  {point.type === 'alternatives' && <Users className="w-5 h-5 text-gray-700" />}
                                  {point.type === 'relationship' && <Award className="w-5 h-5 text-gray-700" />}
                                  {point.type === 'growth' && <TrendingUp className="w-5 h-5 text-gray-700" />}
                                </div>
                                <div>
                                  <h5 className="font-semibold text-gray-900 capitalize">{point.type} Leverage</h5>
                                  <p className="text-sm text-gray-600">{point.description}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold text-gray-900">{point.score}</div>
                                <div className="text-xs text-gray-500">Impact Score</div>
                              </div>
                            </div>
                            <Progress value={point.score} className="h-2" />
                          </Card>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="talking" className="mt-6">
                      <div className="space-y-4">
                        {talkingPoints.map((point, i) => (
                          <Card key={i} className="border-gray-300 overflow-hidden">
                            <div 
                              className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                              onClick={() => toggleSection(point.stage)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <Badge variant="outline" className="text-xs">
                                    {point.stage.replace('_', ' ').toUpperCase()}
                                  </Badge>
                                  <span className="font-semibold text-gray-900">{point.objective}</span>
                                </div>
                                {expandedSections.has(point.stage) ? 
                                  <ChevronUp className="w-4 h-4 text-gray-500" /> : 
                                  <ChevronDown className="w-4 h-4 text-gray-500" />
                                }
                              </div>
                            </div>
                            {expandedSections.has(point.stage) && (
                              <div className="p-4 border-t border-gray-200">
                                <div className="mb-3">
                                  <span className="text-xs text-gray-500">Recommended Tone:</span>
                                  <Badge variant="outline" className="ml-2 text-xs capitalize">
                                    {point.tone}
                                  </Badge>
                                </div>
                                <div className="p-3 bg-gray-50 border-l-3 border-gray-400 italic text-sm text-gray-700">
                                  {typeof point.script === 'string' ? point.script : (
                                    <div className="space-y-3">
                                      {Object.entries(point.script).map(([key, value]) => (
                                        <div key={key}>
                                          <p className="font-semibold text-xs text-gray-600 mb-1">
                                            {key.replace('_', ' ').toUpperCase()}:
                                          </p>
                                          <p className="text-sm">{value as string}</p>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </Card>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="simulation" className="mt-6">
                      <Card className="p-6 border-gray-300">
                        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <Activity className="w-4 h-4" />
                          Negotiation Outcome Simulator
                        </h4>
                        
                        {!isUnlocked ? (
                          <div className="relative">
                            <div className="absolute inset-0 z-10 backdrop-blur-sm bg-white/80 flex items-center justify-center rounded">
                              <div className="text-center">
                                <Lock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                <p className="font-semibold text-gray-700 mb-2">Premium Feature</p>
                                <Button 
                                  onClick={() => setShowPaymentModal(true)}
                                  size="sm"
                                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                                >
                                  Unlock Full Simulation
                                </Button>
                              </div>
                            </div>
                            <div className="opacity-50 pointer-events-none">
                              <div className="grid grid-cols-3 gap-4">
                                <div className="p-3 bg-green-50 border border-green-200 rounded">
                                  <p className="text-xs text-green-600 mb-1">Best Case Scenario</p>
                                  <p className="text-lg font-bold text-green-900">$425K/year</p>
                                  <p className="text-xs text-gray-600">All objectives achieved</p>
                                </div>
                                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                                  <p className="text-xs text-yellow-600 mb-1">Most Likely Outcome</p>
                                  <p className="text-lg font-bold text-yellow-900">$450K/year</p>
                                  <p className="text-xs text-gray-600">Partial success</p>
                                </div>
                                <div className="p-3 bg-red-50 border border-red-200 rounded">
                                  <p className="text-xs text-red-600 mb-1">Walk-Away Scenario</p>
                                  <p className="text-lg font-bold text-red-900">No Deal</p>
                                  <p className="text-xs text-gray-600">Seek alternatives</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                              <div className="p-3 bg-green-50 border border-green-200 rounded">
                                <p className="text-xs text-green-600 mb-1">Best Case Scenario (25%)</p>
                                <p className="text-lg font-bold text-green-900">$425K/year</p>
                                <p className="text-xs text-gray-600">All objectives achieved</p>
                              </div>
                              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                                <p className="text-xs text-yellow-600 mb-1">Most Likely Outcome (60%)</p>
                                <p className="text-lg font-bold text-yellow-900">$450K/year</p>
                                <p className="text-xs text-gray-600">Partial success on key items</p>
                              </div>
                              <div className="p-3 bg-red-50 border border-red-200 rounded">
                                <p className="text-xs text-red-600 mb-1">Walk-Away Scenario (15%)</p>
                                <p className="text-lg font-bold text-red-900">No Deal</p>
                                <p className="text-xs text-gray-600">Seek alternatives</p>
                              </div>
                            </div>
                            
                            <div className="p-4 bg-gray-50 rounded">
                              <h5 className="font-semibold text-sm text-gray-900 mb-3">Interactive Scenario Planning</h5>
                              <div className="space-y-3">
                                <div>
                                  <Label className="text-xs">If they counter at:</Label>
                                  <Input type="text" placeholder="$475,000" className="mt-1" />
                                </div>
                                <div>
                                  <Label className="text-xs">Your response strategy:</Label>
                                  <p className="text-sm text-gray-700 mt-1 p-2 bg-white border border-gray-200 rounded">
                                    Counter with $450K + 3-year commitment + reference rights. 
                                    Emphasize total contract value of $1.35M over 3 years.
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </Card>
                    </TabsContent>

                    <TabsContent value="risks" className="mt-6">
                      <div className="grid grid-cols-2 gap-6">
                        <Card className="p-4 border-gray-300">
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            Negotiation Risks
                          </h4>
                          <div className="space-y-2">
                            <div className="p-2 bg-red-50 border-l-2 border-red-400">
                              <p className="text-xs font-semibold text-red-900">Relationship Risk</p>
                              <p className="text-xs text-red-700">Aggressive negotiation may damage long-term relationship</p>
                              <p className="text-xs text-gray-600 mt-1">Mitigation: Emphasize mutual benefit</p>
                            </div>
                            <div className="p-2 bg-yellow-50 border-l-2 border-yellow-400">
                              <p className="text-xs font-semibold text-yellow-900">Market Risk</p>
                              <p className="text-xs text-yellow-700">Competitor prices may not be sustainable</p>
                              <p className="text-xs text-gray-600 mt-1">Mitigation: Verify competitor capabilities</p>
                            </div>
                            <div className="p-2 bg-blue-50 border-l-2 border-blue-400">
                              <p className="text-xs font-semibold text-blue-900">Timing Risk</p>
                              <p className="text-xs text-blue-700">Delayed decision may impact operations</p>
                              <p className="text-xs text-gray-600 mt-1">Mitigation: Set clear deadlines</p>
                            </div>
                          </div>
                        </Card>

                        <Card className="p-4 border-gray-300">
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            Contingency Plans
                          </h4>
                          <div className="space-y-2">
                            <div className="p-2 bg-gray-50 border border-gray-200 rounded">
                              <p className="text-xs font-semibold text-gray-900">If negotiation stalls:</p>
                              <p className="text-xs text-gray-700">Propose phased implementation with milestone-based pricing</p>
                            </div>
                            <div className="p-2 bg-gray-50 border border-gray-200 rounded">
                              <p className="text-xs font-semibold text-gray-900">If they won't budge on price:</p>
                              <p className="text-xs text-gray-700">Shift focus to value-adds: training, support, customization</p>
                            </div>
                            <div className="p-2 bg-gray-50 border border-gray-200 rounded">
                              <p className="text-xs font-semibold text-gray-900">If relationship becomes strained:</p>
                              <p className="text-xs text-gray-700">Suggest cooling-off period and involve senior stakeholders</p>
                            </div>
                          </div>
                        </Card>
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className="mt-6 flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Analysis powered by dynamic business logic • {talkingPoints.length} talking points generated
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => {
                        setShowResults(false);
                        setNegotiationData('');
                      }}>
                        New Analysis
                      </Button>
                      <Button className="bg-gray-900 hover:bg-gray-800 text-white" size="sm">
                        Export Strategy
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    
    {/* Payment Modal */}
    <DemoPaymentModal
      isOpen={showPaymentModal}
      onClose={() => setShowPaymentModal(false)}
      onSuccess={() => {
        unlockDemo('negotiation-assistant');
        setShowPaymentModal(false);
      }}
      demoName="Negotiation Assistant"
    />
    </Fragment>
  );
}
'use client';

import React, { useState, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DemoPaymentModal from '@/components/demo/DemoPaymentModal';
import { useDemoAccess } from '@/hooks/useDemoAccess';
import { 
  X, Upload, Briefcase, TrendingUp, AlertCircle, CheckCircle,
  Target, BarChart3, DollarSign, Lightbulb, MessageSquare,
  ArrowUpRight, ArrowDownRight, Minus, FileText, Sparkles,
  Lock, Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface NegotiationAssistantDemoProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NegotiationAssistantDemo({ isOpen, onClose }: NegotiationAssistantDemoProps) {
  const [negotiationData, setNegotiationData] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [analysisTime, setAnalysisTime] = useState(0);
  
  const { isDemoUnlocked, unlockDemo } = useDemoAccess();
  const isUnlocked = isDemoUnlocked('negotiation-assistant');

  const sampleNegotiation = `CURRENT TERMS:
- Contract Value: $500,000/year
- Payment Terms: Net 60
- Service Level: 95% uptime
- Support: Business hours only
- Price Increases: Uncapped

DESIRED TERMS:
- Contract Value: $450,000/year
- Payment Terms: Net 30
- Service Level: 99.9% uptime
- Support: 24/7
- Price Increases: 5% cap`;

  const startAnalysis = () => {
    setIsAnalyzing(true);
    const startTime = Date.now();
    
    setTimeout(() => {
      const endTime = Date.now();
      setAnalysisTime((endTime - startTime) / 1000);
      setIsAnalyzing(false);
      setShowResults(true);
    }, 3000);
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
            className="relative w-full max-w-5xl max-h-[85vh] overflow-hidden bg-white border border-gray-300"
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">Negotiation Assistant Demo</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Get AI-powered negotiation strategies and talking points
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="overflow-y-auto max-h-[calc(85vh-80px)]">
              {!showResults ? (
                <div className="p-6">
                  {!isAnalyzing ? (
                    <>
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-4">
                          <Label className="text-sm font-semibold text-gray-700">
                            Negotiation Parameters
                          </Label>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setNegotiationData(sampleNegotiation)}
                          >
                            <FileText className="w-3 h-3 mr-1" />
                            Use Sample
                          </Button>
                        </div>
                        
                        <Textarea
                          value={negotiationData}
                          onChange={(e) => setNegotiationData(e.target.value)}
                          placeholder="Enter current terms and desired outcomes..."
                          className="min-h-[300px] p-4 font-mono text-sm border-gray-300"
                        />

                        <div className="flex justify-end mt-4">
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
                        <Briefcase className="absolute inset-0 m-auto w-8 h-8 text-gray-900" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Generating negotiation strategy...
                      </h3>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6">
                  <div className="mb-6">
                    <h3 className="text-xl font-semibold text-gray-900">Negotiation Strategy</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Likelihood of success: 75% • Potential savings: $50,000/year
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-6 mb-6">
                    {/* Priority Recommendations */}
                    <Card className="p-4 border-gray-300">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        Priority Negotiation Points
                      </h4>
                      <div className="space-y-2">
                        <div className="p-2 bg-green-50 border-l-2 border-green-500">
                          <p className="text-xs font-semibold text-green-900">High Priority</p>
                          <p className="text-xs text-green-700">Focus on SLA improvement to 99.9%</p>
                        </div>
                        <div className="p-2 bg-yellow-50 border-l-2 border-yellow-500">
                          <p className="text-xs font-semibold text-yellow-900">Medium Priority</p>
                          <p className="text-xs text-yellow-700">Negotiate 10% price reduction</p>
                        </div>
                        <div className="p-2 bg-blue-50 border-l-2 border-blue-500">
                          <p className="text-xs font-semibold text-blue-900">Quick Win</p>
                          <p className="text-xs text-blue-700">Payment terms to Net 30</p>
                        </div>
                      </div>
                    </Card>

                    {/* Leverage Points */}
                    <Card className="p-4 border-gray-300 relative overflow-hidden">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        Your Leverage Points
                        {!isUnlocked && (
                          <Badge variant="secondary" className="ml-auto bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0">
                            <Lock className="w-3 h-3 mr-1" />
                            Premium
                          </Badge>
                        )}
                      </h4>
                      {!isUnlocked && (
                        <div className="absolute inset-0 z-10 backdrop-blur-sm bg-white/60 flex items-center justify-center">
                          <Button 
                            onClick={() => setShowPaymentModal(true)}
                            size="sm"
                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Full Strategy
                          </Button>
                        </div>
                      )}
                      <div className={`space-y-2 text-xs ${!isUnlocked ? 'select-none' : ''}`}>
                        <div className="flex items-start gap-2">
                          <CheckCircle className="w-3 h-3 text-green-600 mt-0.5" />
                          <span className="text-gray-700">Long-term customer (3+ years)</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <CheckCircle className="w-3 h-3 text-green-600 mt-0.5" />
                          <span className="text-gray-700">Consistent payment history</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <CheckCircle className="w-3 h-3 text-green-600 mt-0.5" />
                          <span className="text-gray-700">Market alternatives available</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <CheckCircle className="w-3 h-3 text-green-600 mt-0.5" />
                          <span className="text-gray-700">Volume commitment potential</span>
                        </div>
                      </div>
                    </Card>
                  </div>

                  {/* Talking Points */}
                  <Card className="p-4 border-gray-300 mb-6">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Key Talking Points
                    </h4>
                    <div className="space-y-3">
                      <div className="p-3 bg-gray-50 border-l-2 border-gray-400">
                        <p className="text-xs font-semibold text-gray-900 mb-1">Opening Statement</p>
                        <p className="text-xs text-gray-700">
                          "We value our partnership and want to ensure it remains mutually beneficial. 
                          Based on our usage patterns and market analysis, we'd like to discuss adjustments 
                          that reflect our commitment and current market conditions."
                        </p>
                      </div>
                      <div className="p-3 bg-gray-50 border-l-2 border-gray-400">
                        <p className="text-xs font-semibold text-gray-900 mb-1">Value Proposition</p>
                        <p className="text-xs text-gray-700">
                          "By improving SLA to 99.9%, we can increase our reliance on your services by 40%, 
                          resulting in additional revenue streams worth $200K annually."
                        </p>
                      </div>
                      <div className="p-3 bg-gray-50 border-l-2 border-gray-400">
                        <p className="text-xs font-semibold text-gray-900 mb-1">Win-Win Proposal</p>
                        <p className="text-xs text-gray-700">
                          "If we can agree on a 10% reduction with a 3-year commitment, we're prepared to 
                          expand our engagement immediately."
                        </p>
                      </div>
                    </div>
                  </Card>

                  <div className="mt-6 flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Analysis completed in {analysisTime.toFixed(1)} seconds
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => {
                        setShowResults(false);
                        setNegotiationData('');
                      }}>
                        New Strategy
                      </Button>
                      <Button className="bg-gray-900 hover:bg-gray-800 text-white" size="sm">
                        Start Negotiation Prep
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
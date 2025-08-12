'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Upload, Building, TrendingUp, AlertCircle, CheckCircle,
  Shield, BarChart3, Users, DollarSign, Award, Activity,
  FileText, Download, Copy, Target, Gauge, FileWarning, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface VendorEvaluationDemoProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function VendorEvaluationDemo({ isOpen, onClose }: VendorEvaluationDemoProps) {
  const [vendorData, setVendorData] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [apiError, setApiError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sampleVendorData = `VENDOR: TechSupplier Pro
INDUSTRY: Technology Solutions
ANNUAL SPEND: $1,200,000
CONTRACT COUNT: 8 active contracts
DELIVERY PERFORMANCE: 92% on-time delivery
QUALITY METRICS: 4.5/5.0 average rating
SUPPORT RESPONSE: 2-hour average
COMPLIANCE: ISO 27001, SOC 2 Type II
PAYMENT TERMS: Net 45
RISK FACTORS: Single point of failure for critical components`;

  const [analysisData, setAnalysisData] = useState<any>(null);

  const startAnalysis = async () => {
    setIsAnalyzing(true);
    setShowResults(false);
    setApiError(false);
    setAnalysisProgress(0);
    
    // Progress animation
    const interval = setInterval(() => {
      setAnalysisProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return 95;
        }
        return prev + 20;
      });
    }, 400);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/demo-vendor-evaluation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ vendorData }),
      });

      const data = await response.json();
      setAnalysisData(data);
      clearInterval(interval);
      setAnalysisProgress(100);
      setTimeout(() => {
        setIsAnalyzing(false);
        setShowResults(true);
      }, 500);
    } catch (error) {
      console.error('Error:', error);
      clearInterval(interval);
      setIsAnalyzing(false);
      setApiError(true);
      setShowResults(true);
    }
  };

  return (
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
                <h2 className="text-2xl font-semibold text-gray-900">Vendor Evaluation Demo</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Upload vendor data for comprehensive performance analysis
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
                            Vendor Information
                          </Label>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setVendorData(sampleVendorData)}
                            >
                              <Building className="w-3 h-3 mr-1" />
                              Use Sample
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => fileInputRef.current?.click()}
                            >
                              <Upload className="w-3 h-3 mr-1" />
                              Upload CSV
                            </Button>
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept=".csv,.xlsx"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = (e) => {
                                    setVendorData(e.target?.result as string);
                                  };
                                  reader.readAsText(file);
                                }
                              }}
                            />
                          </div>
                        </div>
                        
                        <Textarea
                          value={vendorData}
                          onChange={(e) => setVendorData(e.target.value)}
                          placeholder="Paste vendor data or metrics here..."
                          className="min-h-[300px] p-4 font-mono text-sm border-gray-300"
                        />

                        <div className="flex justify-end mt-4">
                          <Button
                            onClick={startAnalysis}
                            disabled={!vendorData}
                            className="bg-gray-900 hover:bg-gray-800 text-white"
                          >
                            <TrendingUp className="w-4 h-4 mr-2" />
                            Evaluate Vendor
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
                        <Building className="absolute inset-0 m-auto w-8 h-8 text-gray-900" />
                      </div>
                      
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Evaluating vendor performance...
                      </h3>
                      
                      <div className="w-full max-w-md">
                        <Progress value={analysisProgress} className="h-2" />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6">
                  {apiError ? (
                    /* API Error UI */
                    <div className="flex flex-col items-center justify-center py-16">
                      <div className="relative mb-6">
                        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center">
                          <AlertCircle className="w-10 h-10 text-red-500" />
                        </div>
                        <motion.div 
                          className="absolute -inset-1 rounded-full border-2 border-red-200"
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                      </div>
                      
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">Evaluation Service Unavailable</h3>
                      <p className="text-gray-600 text-center max-w-md mb-6">
                        We're unable to connect to our vendor evaluation service at the moment. This is just a demo - the full version has 99.9% uptime.
                      </p>
                      
                      <div className="glass p-4 rounded-lg border border-gray-200 mb-6 max-w-md w-full">
                        <div className="flex items-start gap-3">
                          <FileWarning className="w-5 h-5 text-amber-500 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-900 mb-1">What you can expect in the full version:</p>
                            <ul className="text-xs text-gray-600 space-y-1">
                              <li className="flex items-start gap-1">
                                <CheckCircle className="w-3 h-3 text-green-500 mt-0.5" />
                                <span>Real-time vendor performance evaluation</span>
                              </li>
                              <li className="flex items-start gap-1">
                                <CheckCircle className="w-3 h-3 text-green-500 mt-0.5" />
                                <span>Risk assessment and mitigation recommendations</span>
                              </li>
                              <li className="flex items-start gap-1">
                                <CheckCircle className="w-3 h-3 text-green-500 mt-0.5" />
                                <span>Financial impact analysis and savings opportunities</span>
                              </li>
                              <li className="flex items-start gap-1">
                                <CheckCircle className="w-3 h-3 text-green-500 mt-0.5" />
                                <span>Benchmarking against industry standards</span>
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowResults(false);
                            setVendorData('');
                            setApiError(false);
                          }}
                          className="border-gray-300"
                        >
                          Try Again
                        </Button>
                        <Button 
                          className="bg-gray-900 hover:bg-gray-800 text-white"
                          onClick={() => window.open('/auth/sign-up', '_blank')}
                        >
                          Sign Up for Full Access
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900">Evaluation Complete</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            Overall Score: {analysisData?.overallScore || 82}/100 • Performance Grade: {analysisData?.performanceGrade || 'B+'}
                          </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => {
                          setShowResults(false);
                          setVendorData('');
                        }}>
                          New Evaluation
                        </Button>
                      </div>

                  <div className="grid grid-cols-3 gap-6">
                    {/* Performance Metrics */}
                    <Card className="p-4 border-gray-300">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        Performance Metrics
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span>On-Time Delivery</span>
                            <span className="font-semibold">92%</span>
                          </div>
                          <Progress value={92} className="h-1.5" />
                        </div>
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span>Quality Score</span>
                            <span className="font-semibold">90%</span>
                          </div>
                          <Progress value={90} className="h-1.5" />
                        </div>
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span>Response Time</span>
                            <span className="font-semibold">85%</span>
                          </div>
                          <Progress value={85} className="h-1.5" />
                        </div>
                      </div>
                    </Card>

                    {/* Risk Assessment */}
                    <Card className="p-4 border-gray-300">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Risk Assessment
                      </h4>
                      <div className="space-y-2">
                        <div className="p-2 bg-red-50 border-l-2 border-red-500">
                          <p className="text-xs font-semibold text-red-900">High Risk</p>
                          <p className="text-xs text-red-700">Single point of failure</p>
                        </div>
                        <div className="p-2 bg-yellow-50 border-l-2 border-yellow-500">
                          <p className="text-xs font-semibold text-yellow-900">Medium Risk</p>
                          <p className="text-xs text-yellow-700">Price volatility concerns</p>
                        </div>
                        <div className="p-2 bg-green-50 border-l-2 border-green-500">
                          <p className="text-xs font-semibold text-green-900">Low Risk</p>
                          <p className="text-xs text-green-700">Strong compliance record</p>
                        </div>
                      </div>
                    </Card>

                    {/* Financial Impact */}
                    <Card className="p-4 border-gray-300">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        Financial Analysis
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600">Annual Spend</span>
                          <span className="font-semibold">$1.2M</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600">Cost Trend</span>
                          <span className="text-red-600">↑ 8%</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600">Payment Terms</span>
                          <span className="font-semibold">Net 45</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600">Savings Potential</span>
                          <span className="text-green-600">$120K</span>
                        </div>
                      </div>
                    </Card>
                  </div>

                  <div className="mt-6 flex gap-2 justify-end">
                    <Button variant="outline" size="sm">
                      <Download className="w-3 h-3 mr-1" />
                      Export Report
                    </Button>
                    <Button className="bg-gray-900 hover:bg-gray-800 text-white" size="sm">
                      Full Vendor Analysis
                    </Button>
                  </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
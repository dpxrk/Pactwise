'use client';

import React, { useState, useCallback, useRef, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DemoPaymentModal from '@/components/demo/DemoPaymentModal';
import { useDemoAccess } from '@/hooks/useDemoAccess';
import { 
  X, Upload, FileText, ArrowRight, AlertCircle, CheckCircle, Shield, Clock,
  FileSearch, Calendar, AlertTriangle, ChevronRight, Sparkles, Lock, Download,
  Copy, Eye, EyeOff, Highlighter, Search, Scale, FileWarning, TrendingUp,
  DollarSign, Target, BarChart3, Users, Briefcase, BookOpen, MessageSquare,
  Activity, Zap, Award, ExternalLink, ChevronDown, Info, Lightbulb, 
  ArrowUpRight, ArrowDownRight, Minus, Brain, Building, Globe, Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';

interface ContractAnalysisDemoProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ContractAnalysisDemoV2({ isOpen, onClose }: ContractAnalysisDemoProps) {
  const [contractText, setContractText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStage, setAnalysisStage] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [highlightMode, setHighlightMode] = useState(false);
  const [apiError, setApiError] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [analysisTime, setAnalysisTime] = useState(0);
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { isDemoUnlocked, unlockDemo } = useDemoAccess();
  const isUnlocked = isDemoUnlocked('contract-analysis');

  // Sample contract for quick demo
  const sampleContract = `SERVICE AGREEMENT

This Agreement is entered into as of March 1, 2024, between ABC Corporation ("Client") and XYZ Services ("Provider").

SERVICES: Provider agrees to deliver software development services as detailed in Schedule A.

PAYMENT TERMS: Client shall pay $50,000 monthly, due within 30 days of invoice.

INTELLECTUAL PROPERTY: All work product created under this Agreement shall be the exclusive property of Client.

CONFIDENTIALITY: Both parties agree to maintain strict confidentiality of all proprietary information.

TERM: This Agreement shall continue for 12 months and automatically renew unless terminated with 60 days notice.

LIABILITY: Provider's liability is limited to the fees paid in the preceding 6 months.

TERMINATION: Either party may terminate with 30 days written notice. Early termination incurs a penalty of 3 months fees.`;

  const analysisStages = [
    { stage: 'Uploading document...', progress: 10 },
    { stage: 'Extracting text content...', progress: 25 },
    { stage: 'Identifying key clauses...', progress: 40 },
    { stage: 'Analyzing payment terms...', progress: 55 },
    { stage: 'Evaluating risk factors...', progress: 70 },
    { stage: 'Checking compliance...', progress: 85 },
    { stage: 'Generating insights...', progress: 100 }
  ];

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setContractText(e.target?.result as string);
      };
      reader.readAsText(file);
    }
  }, []);

  const [analysisData, setAnalysisData] = useState<any>(null);

  const startAnalysis = async () => {
    setIsAnalyzing(true);
    setShowResults(false);
    setApiError(false);
    
    const startTime = Date.now();
    
    // Show progress animation
    let stageIndex = 0;
    const interval = setInterval(() => {
      if (stageIndex < analysisStages.length - 1) {
        setAnalysisStage(analysisStages[stageIndex].stage);
        setAnalysisProgress(analysisStages[stageIndex].progress);
        stageIndex++;
      }
    }, 600);

    try {
      const response = await fetch('/api/demo/contract-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contractText,
          analysisType: 'comprehensive'
        }),
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const data = await response.json();
      setAnalysisData(data.analysis || data);
      
      const endTime = Date.now();
      setAnalysisTime((endTime - startTime) / 1000);
      
      clearInterval(interval);
      setAnalysisStage(analysisStages[analysisStages.length - 1].stage);
      setAnalysisProgress(100);
      
      setTimeout(() => {
        setIsAnalyzing(false);
        setShowResults(true);
      }, 500);
    } catch (error) {
      console.error('Error analyzing contract:', error);
      clearInterval(interval);
      setIsAnalyzing(false);
      setApiError(true);
      setShowResults(true);
      
      const endTime = Date.now();
      setAnalysisTime((endTime - startTime) / 1000);
    }
  };

  const resetDemo = () => {
    setContractText('');
    setShowResults(false);
    setAnalysisProgress(0);
    setHighlightMode(false);
    setApiError(false);
    setActiveTab('overview');
  };

  const getRiskColor = (level: string) => {
    switch(level?.toLowerCase()) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getRiskIcon = (severity: string) => {
    switch(severity?.toLowerCase()) {
      case 'critical': return <AlertTriangle className="w-4 h-4" />;
      case 'high': return <AlertCircle className="w-4 h-4" />;
      case 'medium': return <Info className="w-4 h-4" />;
      case 'low': return <CheckCircle className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
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
            className="relative w-full max-w-7xl max-h-[90vh] overflow-hidden bg-white border border-gray-300 rounded-lg shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  AI-Powered Contract Analysis
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Enterprise-grade contract intelligence with deep insights and recommendations
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-gray-600 hover:text-gray-900"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
              {!showResults ? (
                <div className="p-6">
                  {!isAnalyzing ? (
                    <>
                      {/* Upload Section */}
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-4">
                          <Label className="text-sm font-semibold text-gray-700">
                            Upload Your Contract
                          </Label>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setContractText(sampleContract)}
                            >
                              <FileText className="w-3 h-3 mr-1" />
                              Use Sample
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => fileInputRef.current?.click()}
                            >
                              <Upload className="w-3 h-3 mr-1" />
                              Upload File
                            </Button>
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept=".txt,.pdf,.doc,.docx"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = (e) => {
                                    setContractText(e.target?.result as string);
                                  };
                                  reader.readAsText(file);
                                }
                              }}
                            />
                          </div>
                        </div>
                        
                        <div
                          className="relative"
                          onDrop={handleDrop}
                          onDragOver={(e) => e.preventDefault()}
                        >
                          <Textarea
                            value={contractText}
                            onChange={(e) => setContractText(e.target.value)}
                            placeholder="Paste your contract text here or drag and drop a file..."
                            className="min-h-[400px] p-4 font-mono text-sm border-gray-300"
                          />
                          {!contractText && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div className="text-center">
                                <Upload className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                <p className="text-gray-400 text-sm">
                                  Drag & drop your contract here
                                </p>
                                <p className="text-gray-400 text-xs mt-1">
                                  Supports PDF, DOC, DOCX, TXT
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-4">
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Shield className="w-3 h-3" />
                              Secure & Confidential
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Comprehensive analysis
                            </span>
                            <span className="flex items-center gap-1">
                              <Brain className="w-3 h-3" />
                              AI-powered insights
                            </span>
                          </div>
                          
                          <Button
                            onClick={startAnalysis}
                            disabled={!contractText}
                            className="bg-gradient-to-r from-gray-900 to-gray-700 hover:from-gray-800 hover:to-gray-600 text-white"
                          >
                            <Search className="w-4 h-4 mr-2" />
                            Analyze Contract
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    /* Analysis in Progress */
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
                        <FileSearch className="absolute inset-0 m-auto w-8 h-8 text-gray-900" />
                      </div>
                      
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{analysisStage}</h3>
                      
                      <div className="w-full max-w-md">
                        <Progress value={analysisProgress} className="h-2" />
                        <p className="text-xs text-gray-500 text-center mt-2">
                          {analysisProgress}% complete
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Comprehensive Analysis Results */
                <div className="p-6">
                  {apiError ? (
                    /* Error State */
                    <div className="flex flex-col items-center justify-center py-16">
                      <div className="relative mb-6">
                        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center">
                          <AlertCircle className="w-10 h-10 text-red-500" />
                        </div>
                      </div>
                      
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">Analysis Service Unavailable</h3>
                      <p className="text-gray-600 text-center max-w-md mb-6">
                        We're unable to connect to our analysis service at the moment.
                      </p>
                      
                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          onClick={resetDemo}
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
                      {/* Executive Summary Header */}
                      <div className="mb-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">
                              Contract Analysis Complete
                            </h3>
                            <div className="flex flex-wrap gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">Type:</span>
                                <span className="ml-2 font-semibold">{analysisData?.summary?.type}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Value:</span>
                                <span className="ml-2 font-semibold">{analysisData?.summary?.value}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Duration:</span>
                                <span className="ml-2 font-semibold">{analysisData?.summary?.duration}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Risk Score:</span>
                                <Badge 
                                  className={`ml-2 ${
                                    analysisData?.riskScore >= 80 ? 'bg-green-100 text-green-700' :
                                    analysisData?.riskScore >= 60 ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-red-100 text-red-700'
                                  }`}
                                >
                                  {analysisData?.riskScore}/100 - {analysisData?.riskLevel} Risk
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={resetDemo}
                            >
                              New Analysis
                            </Button>
                            <Button
                              size="sm"
                              className="bg-gray-900 hover:bg-gray-800 text-white"
                            >
                              <Download className="w-4 h-4 mr-1" />
                              Export Report
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Main Analysis Tabs */}
                      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid grid-cols-6 w-full mb-6">
                          <TabsTrigger value="overview">Overview</TabsTrigger>
                          <TabsTrigger value="risks">Risk Analysis</TabsTrigger>
                          <TabsTrigger value="financial">Financial</TabsTrigger>
                          <TabsTrigger value="compliance">Compliance</TabsTrigger>
                          <TabsTrigger value="negotiation">Negotiation</TabsTrigger>
                          <TabsTrigger value="insights">AI Insights</TabsTrigger>
                        </TabsList>

                        {/* Overview Tab */}
                        <TabsContent value="overview" className="space-y-6">
                          {/* Risk Breakdown */}
                          <Card className="p-6">
                            <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                              <Shield className="w-5 h-5" />
                              Risk Assessment Breakdown
                            </h4>
                            <div className="grid grid-cols-5 gap-4">
                              {Object.entries(analysisData?.riskBreakdown || {}).map(([category, data]: [string, any]) => (
                                <div key={category} className={`p-4 rounded-lg border ${getRiskColor(data.level)}`}>
                                  <div className="text-sm font-semibold capitalize mb-1">{category}</div>
                                  <div className="text-2xl font-bold mb-2">{data.score}</div>
                                  <Badge className="text-xs">{data.level}</Badge>
                                </div>
                              ))}
                            </div>
                          </Card>

                          {/* Key Terms Grid */}
                          <Card className="p-6">
                            <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                              <FileText className="w-5 h-5" />
                              Key Terms Analysis
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                              {analysisData?.keyTerms?.slice(0, 6).map((term: any, i: number) => (
                                <div key={i} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                                  <div className="flex items-start justify-between mb-2">
                                    <h5 className="font-semibold text-sm">{term.category}</h5>
                                    <Badge variant="outline" className="text-xs">
                                      {term.importance}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-gray-600 mb-2">{term.detail}</p>
                                  <div className="text-xs text-gray-500 mb-2">
                                    <span className="font-medium">Market Position:</span> {term.marketComparison}
                                  </div>
                                  {term.recommendations?.length > 0 && (
                                    <div className="mt-2 pt-2 border-t">
                                      <p className="text-xs font-medium text-gray-700 mb-1">Recommendations:</p>
                                      <ul className="text-xs text-gray-600 space-y-1">
                                        {term.recommendations.map((rec: string, idx: number) => (
                                          <li key={idx} className="flex items-start gap-1">
                                            <ChevronRight className="w-3 h-3 mt-0.5 text-gray-400" />
                                            <span>{rec}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </Card>

                          {/* Action Plan */}
                          <Card className="p-6">
                            <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                              <Target className="w-5 h-5" />
                              Recommended Action Plan
                            </h4>
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <h5 className="font-medium text-sm mb-3 text-red-600">Immediate (24-48 hrs)</h5>
                                <div className="space-y-2">
                                  {analysisData?.actionPlan?.immediate?.map((action: any, i: number) => (
                                    <div key={i} className="p-3 bg-red-50 rounded-lg border border-red-200">
                                      <p className="text-sm font-medium">{action.task}</p>
                                      <p className="text-xs text-gray-600 mt-1">Owner: {action.owner}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <h5 className="font-medium text-sm mb-3 text-yellow-600">Short Term (7-10 days)</h5>
                                <div className="space-y-2">
                                  {analysisData?.actionPlan?.shortTerm?.map((action: any, i: number) => (
                                    <div key={i} className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                                      <p className="text-sm font-medium">{action.task}</p>
                                      <p className="text-xs text-gray-600 mt-1">Owner: {action.owner}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <h5 className="font-medium text-sm mb-3 text-green-600">Long Term (30+ days)</h5>
                                <div className="space-y-2">
                                  {analysisData?.actionPlan?.longTerm?.map((action: any, i: number) => (
                                    <div key={i} className="p-3 bg-green-50 rounded-lg border border-green-200">
                                      <p className="text-sm font-medium">{action.task}</p>
                                      <p className="text-xs text-gray-600 mt-1">Owner: {action.owner}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </Card>
                        </TabsContent>

                        {/* Risk Analysis Tab */}
                        <TabsContent value="risks" className="space-y-6">
                          <Card className="p-6">
                            <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                              <AlertTriangle className="w-5 h-5" />
                              Critical Issues & Red Flags
                            </h4>
                            <div className="space-y-4">
                              {analysisData?.issues?.map((issue: any, i: number) => (
                                <div 
                                  key={i} 
                                  className={`p-4 rounded-lg border-l-4 ${
                                    issue.severity === 'critical' ? 'border-red-500 bg-red-50' :
                                    issue.severity === 'high' ? 'border-orange-500 bg-orange-50' :
                                    issue.severity === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                                    'border-green-500 bg-green-50'
                                  }`}
                                >
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-start gap-3">
                                      <div className={`mt-0.5 ${
                                        issue.severity === 'critical' ? 'text-red-600' :
                                        issue.severity === 'high' ? 'text-orange-600' :
                                        issue.severity === 'medium' ? 'text-yellow-600' :
                                        'text-green-600'
                                      }`}>
                                        {getRiskIcon(issue.severity)}
                                      </div>
                                      <div className="flex-1">
                                        <h5 className="font-semibold text-gray-900">{issue.title}</h5>
                                        <p className="text-sm text-gray-600 mt-1">{issue.description}</p>
                                        <div className="mt-2">
                                          <span className="text-xs font-medium text-gray-700">Impact: </span>
                                          <span className="text-xs text-gray-600">{issue.impact}</span>
                                        </div>
                                      </div>
                                    </div>
                                    <Badge variant="outline" className="text-xs">
                                      Priority {issue.priority}
                                    </Badge>
                                  </div>
                                  <div className="mt-3 p-3 bg-white rounded border">
                                    <p className="text-xs font-medium text-gray-700 mb-1">Recommendation:</p>
                                    <p className="text-xs text-gray-600">{issue.recommendation}</p>
                                    {issue.suggestedLanguage && (
                                      <div className="mt-2 p-2 bg-gray-50 rounded">
                                        <p className="text-xs font-medium text-gray-700 mb-1">Suggested Language:</p>
                                        <p className="text-xs text-gray-600 font-mono">{issue.suggestedLanguage}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </Card>
                        </TabsContent>

                        {/* Financial Tab */}
                        <TabsContent value="financial" className="space-y-6">
                          <div className="grid grid-cols-2 gap-6">
                            {/* Financial Overview */}
                            <Card className="p-6">
                              <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <DollarSign className="w-5 h-5" />
                                Financial Overview
                              </h4>
                              <div className="space-y-3">
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600">Total Contract Value</span>
                                  <span className="font-semibold">{analysisData?.financialAnalysis?.totalContractValue}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600">Monthly Burn</span>
                                  <span className="font-semibold">{analysisData?.financialAnalysis?.monthlyBurn}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600">Cost Per User</span>
                                  <span className="font-semibold">{analysisData?.financialAnalysis?.costPerUser}</span>
                                </div>
                                <div className="pt-3 border-t">
                                  <div className="flex justify-between mb-2">
                                    <span className="text-sm text-gray-600">Market Position</span>
                                    <Badge variant="outline" className="text-xs">
                                      {analysisData?.financialAnalysis?.marketComparison?.status}
                                    </Badge>
                                  </div>
                                  <Progress 
                                    value={parseInt(analysisData?.financialAnalysis?.marketComparison?.percentile || 0)} 
                                    className="h-2"
                                  />
                                  <p className="text-xs text-gray-500 mt-1">
                                    {analysisData?.financialAnalysis?.marketComparison?.percentile} percentile
                                  </p>
                                </div>
                              </div>
                            </Card>

                            {/* ROI Analysis */}
                            <Card className="p-6">
                              <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5" />
                                ROI Analysis
                              </h4>
                              <div className="space-y-3">
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600">Estimated ROI</span>
                                  <span className="font-semibold text-green-600">
                                    {analysisData?.financialAnalysis?.roi?.estimatedROI}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600">Payback Period</span>
                                  <span className="font-semibold">{analysisData?.financialAnalysis?.roi?.paybackPeriod}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600">5-Year TCV</span>
                                  <span className="font-semibold">{analysisData?.financialAnalysis?.roi?.fiveYearTCV}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600">Break-even Point</span>
                                  <span className="font-semibold">{analysisData?.financialAnalysis?.roi?.breakEvenPoint}</span>
                                </div>
                              </div>
                            </Card>
                          </div>

                          {/* Savings Opportunities */}
                          <Card className="p-6">
                            <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                              <Lightbulb className="w-5 h-5" />
                              Savings Opportunities
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                              {analysisData?.financialAnalysis?.savingsOpportunities?.map((opp: any, i: number) => (
                                <div key={i} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                                  <div className="flex items-start justify-between mb-2">
                                    <h5 className="font-medium text-sm">{opp.strategy}</h5>
                                    <Badge 
                                      variant="outline" 
                                      className={`text-xs ${
                                        opp.difficulty === 'Easy' ? 'text-green-600' :
                                        opp.difficulty === 'Medium' ? 'text-yellow-600' :
                                        'text-red-600'
                                      }`}
                                    >
                                      {opp.difficulty}
                                    </Badge>
                                  </div>
                                  <p className="text-lg font-bold text-green-600">{opp.savings}</p>
                                </div>
                              ))}
                            </div>
                          </Card>

                          {/* Hidden Costs */}
                          <Card className="p-6">
                            <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                              <AlertCircle className="w-5 h-5" />
                              Hidden Costs to Consider
                            </h4>
                            <div className="space-y-3">
                              {analysisData?.financialAnalysis?.hiddenCosts?.map((cost: any, i: number) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                  <div>
                                    <span className="text-sm font-medium">{cost.item}</span>
                                    <Badge 
                                      variant="outline" 
                                      className={`ml-2 text-xs ${
                                        cost.likelihood === 'High' ? 'text-red-600' :
                                        cost.likelihood === 'Medium' ? 'text-yellow-600' :
                                        'text-green-600'
                                      }`}
                                    >
                                      {cost.likelihood} likelihood
                                    </Badge>
                                  </div>
                                  <span className="font-semibold text-red-600">{cost.amount}</span>
                                </div>
                              ))}
                            </div>
                          </Card>
                        </TabsContent>

                        {/* Compliance Tab */}
                        <TabsContent value="compliance" className="space-y-6">
                          <Card className="p-6">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-lg font-semibold flex items-center gap-2">
                                <Scale className="w-5 h-5" />
                                Compliance Assessment
                              </h4>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600">Overall Score:</span>
                                <Badge className="bg-green-100 text-green-700">
                                  {analysisData?.compliance?.overallScore}/100
                                </Badge>
                              </div>
                            </div>
                            
                            {/* Framework Compliance */}
                            <div className="grid grid-cols-5 gap-4 mb-6">
                              {Object.entries(analysisData?.compliance?.frameworks || {}).map(([framework, data]: [string, any]) => (
                                <div key={framework} className="text-center">
                                  <div className="mb-2">
                                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${
                                      data.status === 'pass' ? 'bg-green-100' :
                                      data.status === 'warning' ? 'bg-yellow-100' :
                                      data.status === 'fail' ? 'bg-red-100' :
                                      'bg-gray-100'
                                    }`}>
                                      {data.status === 'pass' ? <CheckCircle className="w-6 h-6 text-green-600" /> :
                                       data.status === 'warning' ? <AlertCircle className="w-6 h-6 text-yellow-600" /> :
                                       data.status === 'fail' ? <X className="w-6 h-6 text-red-600" /> :
                                       <Minus className="w-6 h-6 text-gray-400" />}
                                    </div>
                                  </div>
                                  <p className="text-xs font-semibold uppercase">{framework}</p>
                                  {data.score && (
                                    <p className="text-xs text-gray-600">{data.score}%</p>
                                  )}
                                </div>
                              ))}
                            </div>

                            {/* Certifications */}
                            <div className="border-t pt-4">
                              <h5 className="font-medium text-sm mb-3">Required Certifications</h5>
                              <div className="grid grid-cols-3 gap-3">
                                {analysisData?.compliance?.certifications?.map((cert: any, i: number) => (
                                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center gap-2">
                                      <Award className={`w-4 h-4 ${
                                        cert.status === 'verified' ? 'text-green-600' :
                                        cert.status === 'pending' ? 'text-yellow-600' :
                                        'text-red-600'
                                      }`} />
                                      <span className="text-sm font-medium">{cert.cert}</span>
                                    </div>
                                    <Badge variant="outline" className="text-xs">
                                      {cert.status}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </Card>
                        </TabsContent>

                        {/* Negotiation Tab */}
                        <TabsContent value="negotiation" className="space-y-6">
                          <Card className="p-6">
                            <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                              <Briefcase className="w-5 h-5" />
                              Negotiation Strategy
                            </h4>
                            
                            <div className="grid grid-cols-2 gap-6 mb-6">
                              <div>
                                <p className="text-sm text-gray-600 mb-2">Your Leverage</p>
                                <Badge className="bg-green-100 text-green-700">
                                  {analysisData?.negotiationStrategy?.leverage}
                                </Badge>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600 mb-2">Timing Advantage</p>
                                <p className="text-sm font-medium">{analysisData?.negotiationStrategy?.timingAdvantage}</p>
                              </div>
                            </div>

                            {/* Recommended Tactics */}
                            <div className="space-y-4">
                              <h5 className="font-medium text-sm">Recommended Negotiation Tactics</h5>
                              {analysisData?.negotiationStrategy?.recommendedTactics?.map((tactic: any, i: number) => (
                                <div key={i} className="p-4 border rounded-lg">
                                  <div className="flex items-start justify-between mb-2">
                                    <h6 className="font-medium">{tactic.tactic}</h6>
                                    <Badge variant="outline" className={`text-xs ${
                                      tactic.risk === 'Low' ? 'text-green-600' :
                                      tactic.risk === 'Medium' ? 'text-yellow-600' :
                                      'text-red-600'
                                    }`}>
                                      {tactic.risk} risk
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-gray-600 mb-2">{tactic.description}</p>
                                  <div className="flex items-center gap-2">
                                    <Target className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm font-medium text-green-600">
                                      Expected: {tactic.expectedOutcome}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Walk-away Points */}
                            <div className="mt-6 p-4 bg-red-50 rounded-lg border border-red-200">
                              <h5 className="font-medium text-sm mb-3 text-red-700">Walk-away Points</h5>
                              <ul className="space-y-2">
                                {analysisData?.negotiationStrategy?.walkAwayPoints?.map((point: string, i: number) => (
                                  <li key={i} className="flex items-start gap-2 text-sm text-red-600">
                                    <X className="w-4 h-4 mt-0.5" />
                                    <span>{point}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </Card>
                        </TabsContent>

                        {/* AI Insights Tab */}
                        <TabsContent value="insights" className="space-y-6">
                          {/* Pattern Recognition */}
                          <Card className="p-6">
                            <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                              <Brain className="w-5 h-5" />
                              AI Pattern Recognition
                            </h4>
                            <div className="space-y-3">
                              {analysisData?.aiInsights?.patterns?.map((pattern: string, i: number) => (
                                <div key={i} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                                  <Sparkles className="w-4 h-4 text-blue-600 mt-0.5" />
                                  <p className="text-sm text-gray-700">{pattern}</p>
                                </div>
                              ))}
                            </div>
                          </Card>

                          {/* Predictions */}
                          <Card className="p-6">
                            <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                              <Activity className="w-5 h-5" />
                              Predictive Analysis
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                              {analysisData?.aiInsights?.predictions?.map((pred: any, i: number) => (
                                <div key={i} className="p-4 border rounded-lg">
                                  <div className="flex items-start justify-between mb-2">
                                    <p className="text-sm font-medium">{pred.event}</p>
                                    <Badge variant="outline" className={`text-xs ${
                                      pred.confidence === 'Very High' || pred.confidence === 'High' ? 'text-green-600' :
                                      pred.confidence === 'Medium' ? 'text-yellow-600' :
                                      'text-red-600'
                                    }`}>
                                      {pred.confidence}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Progress value={parseInt(pred.probability)} className="h-2 flex-1" />
                                    <span className="text-sm font-semibold">{pred.probability}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </Card>

                          {/* AI Recommendations */}
                          <Card className="p-6">
                            <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                              <Lightbulb className="w-5 h-5" />
                              AI Recommendations
                            </h4>
                            <div className="space-y-3">
                              {analysisData?.aiInsights?.recommendations?.map((rec: any, i: number) => (
                                <div key={i} className={`p-4 rounded-lg border-l-4 ${
                                  rec.priority === 'High' ? 'border-red-500 bg-red-50' :
                                  rec.priority === 'Medium' ? 'border-yellow-500 bg-yellow-50' :
                                  'border-green-500 bg-green-50'
                                }`}>
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <p className="font-medium text-sm">{rec.action}</p>
                                      <p className="text-xs text-gray-600 mt-1">{rec.reason}</p>
                                    </div>
                                    <Badge variant="outline" className="text-xs">
                                      {rec.priority}
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </Card>

                          {/* Similar Contracts */}
                          <Card className="p-6">
                            <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                              <Layers className="w-5 h-5" />
                              Similar Contract Analysis
                            </h4>
                            <div className="space-y-3">
                              {analysisData?.aiInsights?.similarContracts?.map((contract: any, i: number) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                  <div>
                                    <p className="text-sm font-medium">{contract.name}</p>
                                    <p className="text-xs text-gray-600">{contract.outcome}</p>
                                  </div>
                                  <Badge className="bg-blue-100 text-blue-700">
                                    {contract.similarity} match
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </Card>
                        </TabsContent>
                      </Tabs>

                      {/* Footer */}
                      <div className="mt-8 pt-6 border-t flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                          Analysis completed in {analysisTime.toFixed(1)} seconds • Powered by AI
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Copy className="w-4 h-4 mr-1" />
                            Copy Insights
                          </Button>
                          <Button className="bg-gradient-to-r from-gray-900 to-gray-700 hover:from-gray-800 hover:to-gray-600 text-white" size="sm">
                            Start Full Analysis
                            <ArrowRight className="w-4 h-4 ml-1" />
                          </Button>
                        </div>
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
    
    {/* Payment Modal */}
    <DemoPaymentModal
      isOpen={showPaymentModal}
      onClose={() => setShowPaymentModal(false)}
      onSuccess={() => {
        unlockDemo('contract-analysis');
        setShowPaymentModal(false);
      }}
      demoName="Contract Analysis"
    />
    </Fragment>
  );
}
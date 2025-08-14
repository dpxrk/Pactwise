'use client';

import React, { useState, useCallback, useRef, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DemoPaymentModal from '@/components/demo/DemoPaymentModal';
import { useDemoAccess } from '@/hooks/useDemoAccess';
import { 
  X, 
  Upload, 
  FileText, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle,
  Shield,
  Clock,
  FileSearch,
  Calendar,
  AlertTriangle,
  ChevronRight,
  Sparkles,
  Lock,
  Download,
  Copy,
  Eye,
  EyeOff,
  Highlighter,
  Search,
  Scale,
  FileWarning
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface ContractAnalysisDemoProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ContractAnalysisDemo({ isOpen, onClose }: ContractAnalysisDemoProps) {
  const [contractText, setContractText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStage, setAnalysisStage] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [highlightMode, setHighlightMode] = useState(false);
  const [apiError, setApiError] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [analysisTime, setAnalysisTime] = useState(0);
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
      // Call the local API route for demo
      const response = await fetch('/api/demo/contract-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contractText,
          analysisType: 'quick'
        }),
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const data = await response.json();
      setAnalysisData(data.analysis || data);
      
      // Calculate actual elapsed time
      const endTime = Date.now();
      setAnalysisTime((endTime - startTime) / 1000);
      
      // Complete the progress
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
      
      // Calculate elapsed time even on error
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
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">Contract Analysis Demo</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Upload any contract to see AI-powered analysis in action
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
            <div className="overflow-y-auto max-h-[calc(85vh-80px)]">
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
                              ~10 second analysis
                            </span>
                          </div>
                          
                          <Button
                            onClick={startAnalysis}
                            disabled={!contractText}
                            className="bg-gray-900 hover:bg-gray-800 text-white"
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
                /* Analysis Results or Error */
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
                      
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">Analysis Service Unavailable</h3>
                      <p className="text-gray-600 text-center max-w-md mb-6">
                        We're unable to connect to our analysis service at the moment. This is just a demo - the full version has 99.9% uptime.
                      </p>
                      
                      <div className="glass p-4 rounded-lg border border-gray-200 mb-6 max-w-md w-full">
                        <div className="flex items-start gap-3">
                          <FileWarning className="w-5 h-5 text-amber-500 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-900 mb-1">What you can expect in the full version:</p>
                            <ul className="text-xs text-gray-600 space-y-1">
                              <li className="flex items-start gap-1">
                                <CheckCircle className="w-3 h-3 text-green-500 mt-0.5" />
                                <span>Real-time AI contract analysis in under 10 seconds</span>
                              </li>
                              <li className="flex items-start gap-1">
                                <CheckCircle className="w-3 h-3 text-green-500 mt-0.5" />
                                <span>Risk detection and compliance checking</span>
                              </li>
                              <li className="flex items-start gap-1">
                                <CheckCircle className="w-3 h-3 text-green-500 mt-0.5" />
                                <span>Key terms extraction and insights</span>
                              </li>
                              <li className="flex items-start gap-1">
                                <CheckCircle className="w-3 h-3 text-green-500 mt-0.5" />
                                <span>99.9% uptime with enterprise-grade reliability</span>
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          onClick={resetDemo}
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
                          <h3 className="text-xl font-semibold text-gray-900">Analysis Complete</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {analysisData?.summary?.type ? 
                              `${analysisData.summary.type} • ${analysisData.summary.value} • ${analysisData.summary.duration}` : 
                              'Contract analyzed • Multiple findings identified'}
                          </p>
                          {analysisData?.riskScore && (
                            <div className="mt-2">
                              <span className="text-xs text-gray-600">Risk Score: </span>
                              <span className={`text-sm font-semibold ${
                                analysisData.riskScore >= 80 ? 'text-green-600' :
                                analysisData.riskScore >= 60 ? 'text-yellow-600' :
                                'text-red-600'
                              }`}>
                                {analysisData.riskScore}/100
                              </span>
                              <Badge 
                                variant="outline" 
                                className={`ml-2 ${
                                  analysisData.riskLevel === 'Low' ? 'border-green-500 text-green-700' :
                                  analysisData.riskLevel === 'Medium' ? 'border-yellow-500 text-yellow-700' :
                                  'border-red-500 text-red-700'
                                }`}
                              >
                                {analysisData.riskLevel} Risk
                              </Badge>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setHighlightMode(!highlightMode)}
                            className={highlightMode ? 'border-gray-900 bg-gray-100' : ''}
                          >
                            <Highlighter className="w-4 h-4 mr-1" />
                            Highlight
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={resetDemo}
                          >
                            New Analysis
                          </Button>
                        </div>
                      </div>

                  <div className="grid grid-cols-3 gap-6">
                    {/* Key Terms Extracted */}
                    <Card className="p-4 border-gray-300">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Key Terms Extracted
                      </h4>
                      <div className="space-y-2">
                        {analysisData?.keyTerms?.map((term: any, i: number) => (
                          <div key={i} className="p-2 bg-gray-50 border-l-2 border-gray-900">
                            <p className="text-xs font-semibold text-gray-900">{term.category}</p>
                            <p className="text-sm text-gray-700">{term.detail}</p>
                          </div>
                        )) || (
                          <>
                            <div className="p-2 bg-gray-50 border-l-2 border-gray-900">
                              <p className="text-xs font-semibold text-gray-900">Contract Value</p>
                              <p className="text-sm text-gray-700">$50,000/month</p>
                            </div>
                            <div className="p-2 bg-gray-50 border-l-2 border-gray-900">
                              <p className="text-xs font-semibold text-gray-900">Duration</p>
                              <p className="text-sm text-gray-700">12 months</p>
                            </div>
                          </>
                        )}
                      </div>
                    </Card>

                    {/* Risk Analysis */}
                    <Card className="p-4 border-gray-300 relative overflow-hidden">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Risk Analysis
                        {!isUnlocked && (
                          <Badge variant="secondary" className="ml-auto bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0">
                            <Lock className="w-3 h-3 mr-1" />
                            Premium
                          </Badge>
                        )}
                      </h4>
                      {!isUnlocked && (
                        <div className="absolute inset-0 z-10 backdrop-blur-sm bg-white/90 flex items-center justify-center">
                          <Button 
                            onClick={() => setShowPaymentModal(true)}
                            size="sm"
                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Unlock Full Analysis
                          </Button>
                        </div>
                      )}
                      <div className={`space-y-2 ${!isUnlocked ? 'select-none' : ''}`}>
                        {analysisData?.issues?.map((issue: any, i: number) => (
                          <div 
                            key={i} 
                            className={`p-2 border-l-2 ${
                              issue.severity === 'high' ? 'bg-red-50 border-red-500' :
                              issue.severity === 'medium' ? 'bg-yellow-50 border-yellow-500' :
                              'bg-green-50 border-green-500'
                            }`}
                          >
                            <p className={`text-xs font-semibold ${
                              issue.severity === 'high' ? 'text-red-900' :
                              issue.severity === 'medium' ? 'text-yellow-900' :
                              'text-green-900'
                            }`}>
                              {issue.title}
                            </p>
                            <p className={`text-xs ${
                              issue.severity === 'high' ? 'text-red-700' :
                              issue.severity === 'medium' ? 'text-yellow-700' :
                              'text-green-700'
                            }`}>
                              {issue.description}
                            </p>
                            {issue.recommendation && (
                              <p className="text-xs text-gray-600 mt-1 italic">
                                → {issue.recommendation}
                              </p>
                            )}
                          </div>
                        )) || (
                          <div className="p-2 bg-gray-50 text-center">
                            <p className="text-xs text-gray-500">No risks identified</p>
                          </div>
                        )}
                      </div>
                    </Card>

                    {/* Compliance Check */}
                    <Card className="p-4 border-gray-300 relative overflow-hidden">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Scale className="w-4 h-4" />
                        Compliance Status
                        {!isUnlocked && (
                          <Badge variant="secondary" className="ml-auto bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0">
                            <Lock className="w-3 h-3 mr-1" />
                            Premium
                          </Badge>
                        )}
                      </h4>
                      {!isUnlocked && (
                        <div className="absolute inset-0 z-10 backdrop-blur-sm bg-white/90 flex items-center justify-center">
                          <Button 
                            onClick={() => setShowPaymentModal(true)}
                            size="sm"
                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Compliance Details
                          </Button>
                        </div>
                      )}
                      <div className={`space-y-2 ${!isUnlocked ? 'select-none' : ''}`}>
                        {analysisData?.compliance?.checks?.map((item: any, i: number) => (
                          <div key={i} className="flex items-center gap-2">
                            {item.status === 'pass' ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : item.status === 'warning' ? (
                              <AlertCircle className="w-4 h-4 text-yellow-600" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-red-600" />
                            )}
                            <div className="flex-1">
                              <span className="text-xs text-gray-700">{item.item}</span>
                            </div>
                          </div>
                        )) || (
                          <div className="p-2 bg-gray-50 text-center">
                            <p className="text-xs text-gray-500">Compliance check pending</p>
                          </div>
                        )}
                      </div>
                    </Card>
                  </div>

                  {/* Highlighted Contract View */}
                  {highlightMode && (
                    <Card className="mt-6 p-4 border-gray-900 bg-gray-50">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        Highlighted Contract View
                      </h4>
                      <div className="font-mono text-xs space-y-2 text-gray-700">
                        <p>
                          Client shall pay <span className="bg-yellow-200">$50,000 monthly</span>, 
                          due within <span className="bg-yellow-200">30 days</span> of invoice.
                        </p>
                        <p>
                          This Agreement shall continue for <span className="bg-green-200">12 months</span> and 
                          <span className="bg-red-200">automatically renew</span> unless terminated with 
                          <span className="bg-yellow-200">60 days notice</span>.
                        </p>
                        <p>
                          Early termination incurs a <span className="bg-red-300">penalty of 3 months fees</span>.
                        </p>
                      </div>
                    </Card>
                  )}

                  {/* Action Buttons */}
                  <div className="mt-6 flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Analysis completed in {analysisTime.toFixed(1)} seconds
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Download className="w-3 h-3 mr-1" />
                        Export Report
                      </Button>
                      <Button variant="outline" size="sm">
                        <Copy className="w-3 h-3 mr-1" />
                        Copy Insights
                      </Button>
                      <Button className="bg-gray-900 hover:bg-gray-800 text-white" size="sm">
                        Start Full Analysis
                        <ArrowRight className="w-3 h-3 ml-1" />
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
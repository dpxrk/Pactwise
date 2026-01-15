'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Upload,
  FileText,
  AlertCircle,
  CheckCircle,
  Shield,
  FileSearch,
  AlertTriangle,
  Sparkles,
  TrendingUp,
  Users,
  BarChart,
  FileWarning,
  ChevronRight,
  Brain,
  Zap,
  Target,
  Lock
} from 'lucide-react';
import React, { useState, useCallback, useRef } from 'react';

import DemoPaymentModal from '@/components/demo/DemoPaymentModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { useDemoAccess } from '@/hooks/useDemoAccess';

import {
  generateSaaSContract
} from './sampleGenerators';

interface UnifiedDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface LoadingDetail {
  text: string;
  icon: React.ReactNode;
}

const loadingDetails: Record<string, LoadingDetail[]> = {
  'contract-analysis': [
    { text: 'Parsing document structure...', icon: <FileText className="w-4 h-4" /> },
    { text: 'Extracting key clauses...', icon: <FileSearch className="w-4 h-4" /> },
    { text: 'Analyzing payment terms...', icon: <TrendingUp className="w-4 h-4" /> },
    { text: 'Evaluating risk factors...', icon: <AlertTriangle className="w-4 h-4" /> },
    { text: 'Checking compliance requirements...', icon: <Shield className="w-4 h-4" /> },
    { text: 'Generating AI insights...', icon: <Brain className="w-4 h-4" /> },
    { text: 'Finalizing recommendations...', icon: <Sparkles className="w-4 h-4" /> }
  ],
  'vendor-evaluation': [
    { text: 'Collecting vendor data...', icon: <Users className="w-4 h-4" /> },
    { text: 'Analyzing financial stability...', icon: <TrendingUp className="w-4 h-4" /> },
    { text: 'Evaluating performance history...', icon: <BarChart className="w-4 h-4" /> },
    { text: 'Checking compliance certifications...', icon: <Shield className="w-4 h-4" /> },
    { text: 'Assessing risk factors...', icon: <AlertTriangle className="w-4 h-4" /> },
    { text: 'Calculating vendor score...', icon: <Target className="w-4 h-4" /> },
    { text: 'Preparing evaluation report...', icon: <FileText className="w-4 h-4" /> }
  ],
  'compliance-monitoring': [
    { text: 'Scanning regulatory databases...', icon: <Shield className="w-4 h-4" /> },
    { text: 'Identifying applicable regulations...', icon: <FileSearch className="w-4 h-4" /> },
    { text: 'Analyzing contract clauses...', icon: <FileText className="w-4 h-4" /> },
    { text: 'Detecting compliance gaps...', icon: <AlertTriangle className="w-4 h-4" /> },
    { text: 'Evaluating risk severity...', icon: <FileWarning className="w-4 h-4" /> },
    { text: 'Generating remediation steps...', icon: <CheckCircle className="w-4 h-4" /> },
    { text: 'Creating compliance report...', icon: <Sparkles className="w-4 h-4" /> }
  ],
  'negotiation-assistant': [
    { text: 'Analyzing current terms...', icon: <FileText className="w-4 h-4" /> },
    { text: 'Identifying negotiation points...', icon: <Target className="w-4 h-4" /> },
    { text: 'Researching market benchmarks...', icon: <BarChart className="w-4 h-4" /> },
    { text: 'Calculating leverage points...', icon: <TrendingUp className="w-4 h-4" /> },
    { text: 'Generating counter-proposals...', icon: <Brain className="w-4 h-4" /> },
    { text: 'Optimizing deal structure...', icon: <Zap className="w-4 h-4" /> },
    { text: 'Preparing negotiation strategy...', icon: <Sparkles className="w-4 h-4" /> }
  ]
};

export default function UnifiedDemoModal({ isOpen, onClose }: UnifiedDemoModalProps) {
  // Fixed demo type since we only have contract analysis now
  const demoType = 'contract-analysis';
  
  const [contractText, setContractText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [currentLoadingStep, setCurrentLoadingStep] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showFullResults, setShowFullResults] = useState(false);
  const [hasAnalyzedOnce, setHasAnalyzedOnce] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadComplete, setUploadComplete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Store analysis state per tab to preserve results when switching
  // Removed tab states since we only have contract analysis now
  /*const [tabStates, setTabStates] = useState<Record<string, {
    contractText: string;
    showResults: boolean;
    hasAnalyzedOnce: boolean;
  }>>({
    'contract-analysis': { contractText: '', showResults: false, hasAnalyzedOnce: false },
    'vendor-evaluation': { contractText: '', showResults: false, hasAnalyzedOnce: false },
    'compliance-monitoring': { contractText: '', showResults: false, hasAnalyzedOnce: false },
    'negotiation-assistant': { contractText: '', showResults: false, hasAnalyzedOnce: false }
  });*/
  
  const { isDemoUnlocked, unlockDemo } = useDemoAccess();

  const handleAnalyze = useCallback(async (demoType: string) => {
    setIsAnalyzing(true);
    setShowResults(false);
    setAnalysisProgress(0);
    setCurrentLoadingStep(0);

    const steps = loadingDetails[demoType];
    const totalSteps = steps.length;
    
    for (let i = 0; i < totalSteps; i++) {
      setCurrentLoadingStep(i);
      setAnalysisProgress((i + 1) * (100 / totalSteps));
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    setIsAnalyzing(false);
    setShowResults(true);
    setHasAnalyzedOnce(true);
    
    // Save state for this tab
    // No longer needed since we only have one analysis type
    // setTabStates(prev => ({
    //   ...prev,
    //   [demoType]: {
    //     contractText,
    //     showResults: true,
    //     hasAnalyzedOnce: true
    //   }
    // }));
  }, [contractText]);

  const handleLoadSample = (_demoType: string) => {
    // Always load SaaS contract for analysis demo
    const sampleText = generateSaaSContract();
    setContractText(sampleText);
  };

  const renderDemoContent = (demoType: string) => {
    const currentDetails = loadingDetails[demoType];
    const isUnlocked = isDemoUnlocked(demoType);

    return (
      <div className="space-y-6">
        {/* Input Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="contract-text" className="text-white">
              {demoType === 'negotiation-assistant' ? 'Current Contract Terms' : 'Contract Text'}
            </Label>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="glass border-white/10 hover:bg-white/5 text-gray-300"
              >
                <Upload className="w-4 h-4 mr-2" />
                Load Document
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleLoadSample(demoType)}
                className="glass border-white/10 hover:bg-white/5 text-gray-300"
              >
                <FileText className="w-4 h-4 mr-2" />
                Load Sample
              </Button>
            </div>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.pdf,.doc,.docx"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                // Reset states
                setIsUploadingFile(true);
                setUploadProgress(0);
                setUploadComplete(false);
                setContractText('');
                
                // Simulate upload progress
                const progressInterval = setInterval(() => {
                  setUploadProgress(prev => {
                    if (prev >= 90) {
                      clearInterval(progressInterval);
                      return 90;
                    }
                    return prev + 10;
                  });
                }, 100);

                // Read the file
                const reader = new FileReader();
                reader.onload = (event) => {
                  const text = event.target?.result as string;
                  
                  // Complete the upload progress
                  clearInterval(progressInterval);
                  setUploadProgress(100);
                  
                  // Show completion message
                  setTimeout(() => {
                    setContractText(text);
                    setUploadComplete(true);
                    
                    // Hide upload status after 2 seconds
                    setTimeout(() => {
                      setIsUploadingFile(false);
                      setUploadProgress(0);
                    }, 2000);
                  }, 300);
                };
                reader.readAsText(file);
              }
            }}
          />
          
          {/* Upload Status */}
          <AnimatePresence>
            {isUploadingFile && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <Card className="glass border-white/10 p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {uploadComplete ? (
                          <CheckCircle className="w-4 h-4 text-[#9e829c]" />
                        ) : (
                          <Upload className="w-4 h-4 text-white animate-pulse" />
                        )}
                        <span className="text-sm text-white font-medium">
                          {uploadComplete ? 'Document loaded successfully!' : 'Uploading document...'}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-1 bg-white/10" />
                    {uploadComplete && (
                      <p className="text-xs text-gray-400">
                        Your document has been fully loaded and is ready for analysis.
                      </p>
                    )}
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
          
          <Textarea
            id="contract-text"
            value={contractText}
            onChange={(e) => setContractText(e.target.value)}
            placeholder={`Paste your ${demoType === 'negotiation-assistant' ? 'contract terms' : 'contract'} here or load a sample...`}
            className="min-h-[200px] bg-white/5 border-white/10 text-white placeholder:text-gray-500"
            disabled={isAnalyzing || isUploadingFile}
          />

          <Button
            onClick={() => handleAnalyze(demoType)}
            disabled={!contractText || isAnalyzing || isUploadingFile}
            className="w-full bg-[#291528] hover:bg-[#000000] text-[#f0eff4]"
          >
            {isAnalyzing ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Analyzing...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Analyze Contract
              </span>
            )}
          </Button>
        </div>

        {/* Progress Section */}
        <AnimatePresence mode="wait">
          {isAnalyzing && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Analysis Progress</span>
                  <span className="text-white font-medium">{Math.round(analysisProgress)}%</span>
                </div>
                <Progress value={analysisProgress} className="h-2 bg-white/10" />
              </div>

              {/* Loading Details */}
              <div className="glass rounded-lg p-4 border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="animate-pulse">
                    {currentDetails[currentLoadingStep]?.icon}
                  </div>
                  <span className="text-sm text-gray-300">
                    {currentDetails[currentLoadingStep]?.text}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results Section */}
        <AnimatePresence>
          {showResults && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Comprehensive Results Section */}
              <div className="grid gap-4">
                {/* Executive Summary Card */}
                <Card className="glass border-white/10 p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-[#9e829c]" />
                      <h4 className="font-semibold text-white">Executive Summary</h4>
                    </div>
                    <Badge className="bg-[#9e829c] text-white border-[#9e829c]">
                      Complete
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-[#291528]">87</p>
                      <p className="text-xs text-gray-400">Overall Score</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-yellow-400">12</p>
                      <p className="text-xs text-gray-400">Risk Factors</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-[#9e829c]">23</p>
                      <p className="text-xs text-gray-400">Opportunities</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-400">$45K</p>
                      <p className="text-xs text-gray-400">Impact</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-300">
                    Comprehensive analysis reveals strong alignment with business objectives but identifies critical liability exposures and 12 negotiable terms that could save $45K annually.
                  </p>
                </Card>

                {/* Risk Assessment Matrix - Behind Paywall */}
                <Card className="glass border-white/10 p-4 relative overflow-hidden">
                  {!isUnlocked && !showFullResults && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-10 flex items-center justify-center">
                      <div className="text-center p-4">
                        <Lock className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                        <p className="text-white font-semibold mb-1">Premium Analysis</p>
                        <p className="text-xs text-gray-400 mb-3">Unlock to view detailed risk assessment</p>
                        <Button 
                          onClick={() => setShowPaymentModal(true)}
                          className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                          size="sm"
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          Unlock Full Analysis
                        </Button>
                      </div>
                    </div>
                  )}
                  <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-400" />
                    Risk Assessment Matrix
                  </h4>
                  <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 ${!isUnlocked && !showFullResults ? 'blur-sm' : ''}`}>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 bg-red-500/10 border border-red-500/20 rounded">
                        <span className="text-sm text-white">Critical Risks</span>
                        <Badge className="bg-red-500/20 text-red-400">3</Badge>
                      </div>
                      <ul className="space-y-1 text-xs text-gray-400 pl-4">
                        <li>• Unlimited liability exposure</li>
                        <li>• No termination for convenience clause</li>
                        <li>• Intellectual property assignment issues</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 bg-yellow-500/10 border border-yellow-500/20 rounded">
                        <span className="text-sm text-white">Medium Risks</span>
                        <Badge className="bg-yellow-500/20 text-yellow-400">5</Badge>
                      </div>
                      <ul className="space-y-1 text-xs text-gray-400 pl-4">
                        <li>• Payment terms exceed standards</li>
                        <li>• Ambiguous performance metrics</li>
                        <li>• Limited warranty coverage</li>
                        <li>• Unclear dispute resolution</li>
                        <li>• Auto-renewal provisions</li>
                      </ul>
                    </div>
                  </div>
                </Card>

                {/* Financial Analysis - Behind Paywall */}
                <Card className="glass border-white/10 p-4 relative overflow-hidden">
                  {!isUnlocked && !showFullResults && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-10 flex items-center justify-center">
                      <div className="text-center p-4">
                        <Lock className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                        <p className="text-white font-semibold mb-1">Premium Analysis</p>
                        <p className="text-xs text-gray-400 mb-3">Unlock to view financial impact analysis</p>
                        <Button 
                          onClick={() => setShowPaymentModal(true)}
                          className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                          size="sm"
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          Unlock Full Analysis
                        </Button>
                      </div>
                    </div>
                  )}
                  <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#9e829c]" />
                    Financial Impact Analysis
                  </h4>
                  <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${!isUnlocked && !showFullResults ? 'blur-sm' : ''}`}>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Annual Contract Value</p>
                      <p className="text-xl font-bold text-white">$1.2M</p>
                      <p className="text-xs text-[#9e829c]">+15% vs. previous</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Cost Savings Potential</p>
                      <p className="text-xl font-bold text-white">$180K</p>
                      <p className="text-xs text-yellow-400">15% negotiable</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Hidden Costs Identified</p>
                      <p className="text-xl font-bold text-white">$45K</p>
                      <p className="text-xs text-red-400">Not in base terms</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Total Contract Exposure</span>
                      <span className="text-white font-semibold">$3.6M over 3 years</span>
                    </div>
                  </div>
                </Card>

                {/* Detailed Clause Analysis - Behind Paywall */}
                <Card className="glass border-white/10 p-4 relative overflow-hidden">
                  {!isUnlocked && !showFullResults && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-10 flex items-center justify-center">
                      <div className="text-center p-4">
                        <Lock className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                        <p className="text-white font-semibold mb-1">Premium Analysis</p>
                        <p className="text-xs text-gray-400 mb-3">Unlock to view clause-by-clause breakdown</p>
                        <Button 
                          onClick={() => setShowPaymentModal(true)}
                          className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                          size="sm"
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          Unlock Full Analysis
                        </Button>
                      </div>
                    </div>
                  )}
                  <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                    <FileSearch className="w-4 h-4 text-blue-400" />
                    Clause-by-Clause Breakdown
                  </h4>
                  <div className={`space-y-2 max-h-64 overflow-y-auto pr-2 ${!isUnlocked && !showFullResults ? 'blur-sm' : ''}`}>
                    {[
                      { section: '2.1', title: 'Payment Terms', risk: 'high', issue: 'Net 90 days exceeds standard by 60 days' },
                      { section: '3.4', title: 'Service Levels', risk: 'medium', issue: '99.5% uptime SLA below industry 99.9%' },
                      { section: '4.2', title: 'Warranties', risk: 'low', issue: 'Standard warranties properly defined' },
                      { section: '5.1', title: 'Indemnification', risk: 'high', issue: 'Mutual indemnification missing IP coverage' },
                      { section: '6.3', title: 'Termination', risk: 'high', issue: 'No termination for convenience clause' },
                      { section: '7.2', title: 'Liability', risk: 'critical', issue: 'Unlimited liability for data breaches' },
                      { section: '8.1', title: 'Confidentiality', risk: 'low', issue: 'Standard NDA terms acceptable' },
                      { section: '9.4', title: 'Force Majeure', risk: 'medium', issue: 'Pandemic exclusion may limit protections' },
                      { section: '10.2', title: 'Governing Law', risk: 'low', issue: 'Delaware law and arbitration acceptable' },
                      { section: '11.1', title: 'Auto-Renewal', risk: 'medium', issue: '180-day notice period excessive' },
                    ].map((clause, index) => (
                      <div key={index} className="flex items-start gap-3 p-2 rounded hover:bg-white/5">
                        <div className="flex-shrink-0">
                          {clause.risk === 'critical' && <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5" />}
                          {clause.risk === 'high' && <AlertTriangle className="w-4 h-4 text-orange-400 mt-0.5" />}
                          {clause.risk === 'medium' && <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5" />}
                          {clause.risk === 'low' && <CheckCircle className="w-4 h-4 text-[#9e829c] mt-0.5" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">§{clause.section}</span>
                            <p className="text-sm text-white font-medium">{clause.title}</p>
                          </div>
                          <p className="text-xs text-gray-400">{clause.issue}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* AI-Powered Recommendations - Behind Paywall */}
                <Card className="glass border-white/10 p-4 relative overflow-hidden">
                  {!isUnlocked && !showFullResults && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-10 flex items-center justify-center">
                      <div className="text-center p-4">
                        <Lock className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                        <p className="text-white font-semibold mb-1">Premium Analysis</p>
                        <p className="text-xs text-gray-400 mb-3">Unlock to view AI recommendations</p>
                        <Button 
                          onClick={() => setShowPaymentModal(true)}
                          className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                          size="sm"
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          Unlock Full Analysis
                        </Button>
                      </div>
                    </div>
                  )}
                  <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                    <Brain className="w-4 h-4 text-purple-400" />
                    AI-Powered Recommendations
                  </h4>
                  <div className={`space-y-3 ${!isUnlocked && !showFullResults ? 'blur-sm' : ''}`}>
                    <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded">
                      <div className="flex items-start gap-2">
                        <Badge className="bg-purple-500/20 text-purple-400 text-xs">Priority 1</Badge>
                        <div className="flex-1">
                          <p className="text-sm text-white font-medium">Negotiate Liability Cap</p>
                          <p className="text-xs text-gray-400 mt-1">Request limitation to 12 months of fees for direct damages, excluding gross negligence</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded">
                      <div className="flex items-start gap-2">
                        <Badge className="bg-blue-500/20 text-blue-400 text-xs">Priority 2</Badge>
                        <div className="flex-1">
                          <p className="text-sm text-white font-medium">Improve Payment Terms</p>
                          <p className="text-xs text-gray-400 mt-1">Counter with Net 30 or offer 2% discount for Net 15 payment</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-3 bg-[#9e829c]/10 border border-[#9e829c]/20 rounded">
                      <div className="flex items-start gap-2">
                        <Badge className="bg-[#9e829c] text-white text-xs">Priority 3</Badge>
                        <div className="flex-1">
                          <p className="text-sm text-white font-medium">Add Performance Credits</p>
                          <p className="text-xs text-gray-400 mt-1">Include service credits for SLA breaches: 5% for &lt;99.5%, 10% for &lt;99%</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Compliance & Regulatory Matrix - Behind Paywall */}
                <Card className="glass border-white/10 p-4 relative overflow-hidden">
                  {!isUnlocked && !showFullResults && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-10 flex items-center justify-center">
                      <div className="text-center p-4">
                        <Lock className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                        <p className="text-white font-semibold mb-1">Premium Analysis</p>
                        <p className="text-xs text-gray-400 mb-3">Unlock to view compliance check</p>
                        <Button 
                          onClick={() => setShowPaymentModal(true)}
                          className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                          size="sm"
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          Unlock Full Analysis
                        </Button>
                      </div>
                    </div>
                  )}
                  <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#9e829c]" />
                    Compliance & Regulatory Check
                  </h4>
                  <div className={`grid grid-cols-2 md:grid-cols-4 gap-2 ${!isUnlocked && !showFullResults ? 'blur-sm' : ''}`}>
                    {[
                      { name: 'GDPR', status: 'compliant', score: '92%' },
                      { name: 'CCPA', status: 'compliant', score: '88%' },
                      { name: 'SOC 2', status: 'partial', score: '76%' },
                      { name: 'ISO 27001', status: 'compliant', score: '94%' },
                      { name: 'HIPAA', status: 'na', score: 'N/A' },
                      { name: 'PCI DSS', status: 'partial', score: '71%' },
                      { name: 'SOX', status: 'compliant', score: '90%' },
                      { name: 'NIST', status: 'compliant', score: '85%' },
                    ].map((item, index) => (
                      <div key={index} className="p-2 border border-white/10 rounded">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-white font-medium">{item.name}</span>
                          {item.status === 'compliant' && <CheckCircle className="w-3 h-3 text-[#9e829c]" />}
                          {item.status === 'partial' && <AlertCircle className="w-3 h-3 text-yellow-400" />}
                          {item.status === 'na' && <span className="w-3 h-3 text-gray-500">-</span>}
                        </div>
                        <p className="text-xs text-gray-400">{item.score}</p>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Action Items - Behind Paywall */}
                <Card className="glass border-white/10 p-4 relative overflow-hidden">
                  {!isUnlocked && !showFullResults && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-10 flex items-center justify-center">
                      <div className="text-center p-4">
                        <Lock className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                        <p className="text-white font-semibold mb-1">Premium Analysis</p>
                        <p className="text-xs text-gray-400 mb-3">Unlock to view action items</p>
                        <Button 
                          onClick={() => setShowPaymentModal(true)}
                          className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                          size="sm"
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          Unlock Full Analysis
                        </Button>
                      </div>
                    </div>
                  )}
                  <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[#9e829c]" />
                    Immediate Action Items
                  </h4>
                  <div className={`space-y-2 ${!isUnlocked && !showFullResults ? 'blur-sm' : ''}`}>
                    {[
                      { priority: 'high', action: 'Schedule legal review for liability clauses', due: 'Within 48 hours' },
                      { priority: 'high', action: 'Request amended payment terms from vendor', due: 'This week' },
                      { priority: 'medium', action: 'Document all identified cost savings opportunities', due: 'Next 5 days' },
                      { priority: 'medium', action: 'Review insurance coverage for identified risks', due: 'Next week' },
                      { priority: 'low', action: 'Update contract management system with findings', due: 'This month' },
                    ].map((item, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <input type="checkbox" className="mt-1 rounded border-white/20 bg-white/5" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-white">{item.action}</p>
                            {item.priority === 'high' && <Badge className="bg-red-500/20 text-red-400 text-xs">High</Badge>}
                            {item.priority === 'medium' && <Badge className="bg-yellow-500/20 text-yellow-400 text-xs">Med</Badge>}
                            {item.priority === 'low' && <Badge className="bg-gray-500/20 text-gray-400 text-xs">Low</Badge>}
                          </div>
                          <p className="text-xs text-gray-500">Due: {item.due}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Locked findings indicator - only show after first analysis - moved outside grid */}
              <div>
                  {!isUnlocked && !showFullResults && hasAnalyzedOnce && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs text-gray-400">
                          + 12 more findings available in premium analysis
                        </p>
                        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
                          Premium
                        </Badge>
                      </div>
                      <Button 
                        onClick={() => setShowPaymentModal(true)}
                        className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                        size="sm"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Unlock Full Analysis
                      </Button>
                    </div>
                  )}

                  {/* Show all findings if unlocked */}
                  {(isUnlocked || showFullResults) && (
                    <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                      <p className="text-xs text-[#9e829c] font-medium mb-2">Additional Findings:</p>
                      {/* Add more findings here based on demo type */}
                      <div className="flex items-start gap-3">
                        <FileText className="w-4 h-4 text-blue-400 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm text-white font-medium">Contract Optimization</p>
                          <p className="text-xs text-gray-400">5 clauses can be simplified to reduce ambiguity by 40%</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <BarChart className="w-4 h-4 text-purple-400 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm text-white font-medium">Cost Savings Identified</p>
                          <p className="text-xs text-gray-400">Potential annual savings of $125,000 through term renegotiation</p>
                        </div>
                      </div>
                    </div>
                  )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 mt-4">
                  <Button size="sm" variant="outline" className="glass border-white/10 hover:bg-white/5 text-gray-300 flex-1">
                    <FileText className="w-4 h-4 mr-2" />
                    Export Report
                  </Button>
                  <Button size="sm" variant="outline" className="glass border-white/10 hover:bg-white/5 text-gray-300 flex-1">
                    <ChevronRight className="w-4 h-4 mr-2" />
                    Next Steps
                  </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => {
              // Only close if clicking directly on the backdrop
              if (e.target === e.currentTarget) {
                onClose();
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="border-b border-white/10 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white">Interactive AI Demos</h2>
                    <p className="text-gray-400 mt-1">Experience the power of Pactwise AI</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="text-gray-400 hover:text-white hover:bg-white/10"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* Content - No Tabs, Just Analysis */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]" onClick={(e) => e.stopPropagation()}>
                <div className="w-full">
                  {/* Analysis Header */}
                  <div className="flex items-center gap-2 mb-6">
                    <FileSearch className="w-5 h-5 text-[#291528]" />
                    <h3 className="text-xl font-semibold text-white">Contract Analysis</h3>
                    <Badge className="bg-[#291528] text-[#f0eff4] border-[#291528]">AI-Powered</Badge>
                  </div>

                  {/* Render the contract analysis content directly */}
                  {renderDemoContent('contract-analysis')}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <DemoPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={() => {
          unlockDemo(demoType);
          setShowPaymentModal(false);
          setShowFullResults(true);
        }}
        demoType={demoType}
      />
    </>
  );
}
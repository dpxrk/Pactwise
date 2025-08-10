'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Upload, 
  FileText, 
  Building, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle,
  TrendingUp,
  Shield,
  Clock,
  DollarSign,
  BarChart3,
  Zap,
  Eye,
  EyeOff,
  FileSearch,
  Users,
  Calendar,
  AlertTriangle,
  ChevronRight,
  Loader2,
  Sparkles,
  Target,
  Activity,
  Copy,
  Download,
  Share2,
  Gauge
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Sample contract templates
const sampleContracts = {
  nda: {
    title: 'Non-Disclosure Agreement',
    type: 'NDA',
    riskLevel: 'Standard',
    content: `MUTUAL NON-DISCLOSURE AGREEMENT

This Agreement is entered into as of January 1, 2024 ("Effective Date") between TechCorp Inc., a Delaware corporation ("Party A"), and InnovateCo Ltd., a California corporation ("Party B").

1. CONFIDENTIAL INFORMATION
"Confidential Information" means any proprietary information, technical data, trade secrets, or know-how, including research, product plans, products, services, customers, customer lists, markets, software, developments, inventions, processes, formulas, technology, designs, drawings, engineering, hardware configuration information, marketing, finances, or other business information disclosed by either party.

2. TERM
This Agreement shall remain in effect for a period of three (3) years from the Effective Date, unless earlier terminated by either party upon thirty (30) days written notice.

3. NON-CIRCUMVENTION
For a period of five (5) years from the date of this Agreement, neither party shall attempt to circumvent, avoid, bypass, or obviate the other party, directly or indirectly.

4. LIQUIDATED DAMAGES
In the event of a breach of this Agreement, the breaching party shall pay liquidated damages in the amount of $500,000 USD.

5. GOVERNING LAW
This Agreement shall be governed by the laws of the State of Delaware, without regard to its conflict of law provisions.`
  },
  saas: {
    title: 'SaaS Service Agreement',
    type: 'Service Agreement',
    riskLevel: 'Complex',
    content: `SOFTWARE AS A SERVICE AGREEMENT

This SaaS Agreement is between CloudTech Solutions ("Provider") and Enterprise Corp ("Customer").

1. SERVICE LEVEL AGREEMENT
Provider guarantees 99.9% uptime availability. Credits: 10% for 99.0-99.9%, 25% for 95.0-99.0%, 50% for below 95%.

2. DATA OWNERSHIP
Customer retains all rights to their data. Provider may use aggregated, anonymized data for improvements.

3. PAYMENT TERMS
Annual payment due within 30 days of invoice. Late payments incur 1.5% monthly interest.

4. LIABILITY LIMITATION
Provider's total liability shall not exceed the fees paid in the 12 months preceding the claim.

5. AUTOMATIC RENEWAL
This Agreement automatically renews for successive one-year terms unless either party provides 90 days written notice.

6. PRICE INCREASES
Provider may increase prices with 60 days notice, not to exceed 8% annually.`
  },
  vendor: {
    title: 'Vendor Supply Agreement',
    type: 'Vendor Contract',
    riskLevel: 'High-Risk',
    content: `VENDOR SUPPLY AGREEMENT

Effective Date: January 15, 2024
Supplier: GlobalSupply Inc.
Buyer: ManufactureCo Ltd.

1. EXCLUSIVITY CLAUSE
Buyer agrees to purchase 100% of requirements exclusively from Supplier for all Widget products.

2. MINIMUM PURCHASE OBLIGATION
Buyer commits to minimum annual purchase of $2,000,000 or 10,000 units, whichever is greater.

3. PRICE ADJUSTMENT
Supplier may adjust prices quarterly based on market conditions with 30 days notice.

4. PENALTIES
Failure to meet minimum purchase: 50% of shortfall as penalty.
Late payment: 3% monthly compound interest.

5. TERMINATION
Supplier may terminate immediately upon any breach. Buyer requires 180 days notice and payment of early termination fee equal to 6 months average purchases.

6. INTELLECTUAL PROPERTY
All improvements, modifications, or developments become property of Supplier.`
  }
};

// Sample vendor data
const sampleVendors = {
  techVendor: {
    name: 'TechSupplier Pro',
    industry: 'Technology',
    annualSpend: '$1.2M',
    contractCount: 8,
    performanceScore: 85,
    riskFactors: ['Single point of failure', 'No backup supplier', 'Price volatility'],
    compliance: ['ISO 27001', 'SOC 2 Type II', 'GDPR']
  },
  serviceVendor: {
    name: 'ServicePartner LLC',
    industry: 'Professional Services',
    annualSpend: '$500K',
    contractCount: 3,
    performanceScore: 72,
    riskFactors: ['Delivery delays', 'Quality issues reported', 'Key person dependency'],
    compliance: ['SOC 2 Type I', 'State licenses']
  }
};

interface InteractiveDemoProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function InteractiveDemoModal({ isOpen, onClose }: InteractiveDemoProps) {
  const [demoMode, setDemoMode] = useState<'contract' | 'vendor'>('contract');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [contractText, setContractText] = useState('');
  const [vendorData, setVendorData] = useState({
    name: '',
    spend: '',
    contracts: '',
    industry: ''
  });
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStage, setAnalysisStage] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [xrayMode, setXrayMode] = useState(false);
  const [comparisonMode, setComparisonMode] = useState(false);
  
  const [streamedText, setStreamedText] = useState('');
  const [insights, setInsights] = useState<string[]>([]);
  const [risks, setRisks] = useState<any[]>([]);
  const [obligations, setObligations] = useState<any[]>([]);
  const [keyDates, setKeyDates] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Simulated analysis stages
  const analysisStages = [
    { stage: 'Extracting text...', progress: 15 },
    { stage: 'Identifying clauses...', progress: 30 },
    { stage: 'Analyzing risks...', progress: 50 },
    { stage: 'Evaluating obligations...', progress: 70 },
    { stage: 'Generating insights...', progress: 85 },
    { stage: 'Finalizing report...', progress: 100 }
  ];

  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'text/plain') {
      const reader = new FileReader();
      reader.onload = (e) => {
        setContractText(e.target?.result as string);
      };
      reader.readAsText(file);
    }
  }, []);

  // Start analysis
  const startAnalysis = () => {
    setIsAnalyzing(true);
    setShowResults(false);
    setStreamedText('');
    setInsights([]);
    setRisks([]);
    
    // Simulate progressive analysis
    let stageIndex = 0;
    const interval = setInterval(() => {
      if (stageIndex < analysisStages.length) {
        setAnalysisStage(analysisStages[stageIndex].stage);
        setAnalysisProgress(analysisStages[stageIndex].progress);
        stageIndex++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          generateResults();
        }, 500);
      }
    }, 800);
  };

  // Generate analysis results
  const generateResults = () => {
    setIsAnalyzing(false);
    setShowResults(true);
    
    // Simulated streaming text
    const analysisText = `This agreement presents several critical considerations that require immediate attention. The contract structure follows standard industry patterns with notable exceptions in key areas.`;
    
    let charIndex = 0;
    const textInterval = setInterval(() => {
      if (charIndex <= analysisText.length) {
        setStreamedText(analysisText.substring(0, charIndex));
        charIndex += 2;
      } else {
        clearInterval(textInterval);
      }
    }, 20);

    // Generate insights progressively
    const sampleInsights = [
      'Automatic renewal clause detected - requires 90 days notice',
      'Liability limitation may not cover consequential damages',
      'Price increase cap of 8% annually above market average',
      'Data ownership terms favor customer retention',
      'SLA credits may be insufficient for critical operations'
    ];

    sampleInsights.forEach((insight, index) => {
      setTimeout(() => {
        setInsights(prev => [...prev, insight]);
      }, 1000 + (index * 300));
    });

    // Generate risks
    setRisks([
      { level: 'high', description: 'Uncapped liability for data breaches', score: 85 },
      { level: 'medium', description: 'Automatic renewal with short notice period', score: 60 },
      { level: 'low', description: 'Standard governing law provisions', score: 25 }
    ]);

    // Generate obligations
    setObligations([
      { party: 'Customer', obligation: 'Annual payment within 30 days', date: '2024-01-30' },
      { party: 'Provider', obligation: 'Maintain 99.9% uptime SLA', date: 'Ongoing' },
      { party: 'Customer', obligation: 'Provide 90 days notice for non-renewal', date: '2024-10-01' }
    ]);

    // Extract key dates
    setKeyDates([
      { event: 'Contract Start', date: '2024-01-01' },
      { event: 'First Payment Due', date: '2024-01-30' },
      { event: 'Renewal Notice Deadline', date: '2024-10-01' },
      { event: 'Contract Renewal', date: '2025-01-01' }
    ]);
  };

  // Load template
  const loadTemplate = (templateKey: string) => {
    setSelectedTemplate(templateKey);
    setContractText(sampleContracts[templateKey as keyof typeof sampleContracts].content);
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
            className="relative w-full max-w-6xl max-h-[90vh] overflow-hidden bg-white border border-gray-300 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">Live Intelligence Experience</h2>
                <p className="text-sm text-gray-600 mt-1">Experience the power of intelligent contract analysis</p>
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
                <>
                  {/* Demo Mode Selector */}
                  <div className="p-6 border-b border-gray-200">
                    <Tabs value={demoMode} onValueChange={(v) => setDemoMode(v as 'contract' | 'vendor')}>
                      <TabsList className="grid w-full max-w-md grid-cols-2">
                        <TabsTrigger value="contract" className="flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Contract Analysis
                        </TabsTrigger>
                        <TabsTrigger value="vendor" className="flex items-center gap-2">
                          <Building className="w-4 h-4" />
                          Vendor Intelligence
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>

                  {demoMode === 'contract' ? (
                    <div className="p-6">
                      {!isAnalyzing ? (
                        <>
                          {/* Quick Start Templates */}
                          <div className="mb-6">
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">Quick Start Templates</h3>
                            <div className="grid grid-cols-3 gap-4">
                              {Object.entries(sampleContracts).map(([key, contract]) => (
                                <Card
                                  key={key}
                                  className={`p-4 cursor-pointer border transition-all ${
                                    selectedTemplate === key 
                                      ? 'border-gray-900 bg-gray-50' 
                                      : 'border-gray-300 hover:border-gray-600'
                                  }`}
                                  onClick={() => loadTemplate(key)}
                                >
                                  <FileText className="w-5 h-5 text-gray-700 mb-2" />
                                  <h4 className="font-semibold text-gray-900 text-sm">{contract.title}</h4>
                                  <p className="text-xs text-gray-600 mt-1">{contract.type}</p>
                                  <Badge 
                                    variant="outline" 
                                    className={`mt-2 text-xs ${
                                      contract.riskLevel === 'High-Risk' 
                                        ? 'border-red-300 text-red-700'
                                        : contract.riskLevel === 'Complex'
                                        ? 'border-yellow-300 text-yellow-700'
                                        : 'border-green-300 text-green-700'
                                    }`}
                                  >
                                    {contract.riskLevel}
                                  </Badge>
                                </Card>
                              ))}
                            </div>
                          </div>

                          {/* Contract Input Area */}
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <Label className="text-sm font-semibold text-gray-700">Contract Text</Label>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => fileInputRef.current?.click()}
                                  className="text-xs"
                                >
                                  <Upload className="w-3 h-3 mr-1" />
                                  Upload File
                                </Button>
                                <input
                                  ref={fileInputRef}
                                  type="file"
                                  accept=".txt,.pdf"
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
                                className="min-h-[300px] p-4 font-mono text-sm border-gray-300"
                              />
                              {!contractText && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                  <div className="text-center">
                                    <Upload className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                    <p className="text-gray-400 text-sm">Drop contract file here</p>
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center justify-between pt-4">
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  Analysis time: ~8 seconds
                                </span>
                                <span className="flex items-center gap-1">
                                  <Shield className="w-3 h-3" />
                                  Secure processing
                                </span>
                              </div>
                              
                              <Button
                                onClick={startAnalysis}
                                disabled={!contractText}
                                className="bg-gray-900 hover:bg-gray-800 text-white"
                              >
                                <Sparkles className="w-4 h-4 mr-2" />
                                Start Analysis
                              </Button>
                            </div>
                          </div>
                        </>
                      ) : (
                        /* Analysis in Progress */
                        <div className="flex flex-col items-center justify-center py-20">
                          <div className="relative mb-8">
                            <div className="w-24 h-24 border-4 border-gray-200 rounded-full"></div>
                            <motion.div
                              className="absolute inset-0 w-24 h-24 border-4 border-gray-900 rounded-full border-t-transparent"
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            />
                            <Sparkles className="absolute inset-0 m-auto w-10 h-10 text-gray-900" />
                          </div>
                          
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">{analysisStage}</h3>
                          
                          <div className="w-full max-w-md">
                            <Progress value={analysisProgress} className="h-2" />
                            <p className="text-xs text-gray-500 text-center mt-2">{analysisProgress}% complete</p>
                          </div>

                          <div className="mt-8 grid grid-cols-4 gap-4 text-center">
                            {['Extracting', 'Analyzing', 'Evaluating', 'Reporting'].map((step, i) => (
                              <div key={step} className="flex flex-col items-center">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                                  analysisProgress > (i + 1) * 25 
                                    ? 'bg-gray-900 text-white' 
                                    : 'bg-gray-200 text-gray-400'
                                }`}>
                                  {analysisProgress > (i + 1) * 25 ? (
                                    <CheckCircle className="w-5 h-5" />
                                  ) : (
                                    <span className="text-xs">{i + 1}</span>
                                  )}
                                </div>
                                <span className="text-xs text-gray-600">{step}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Vendor Intelligence Mode */
                    <div className="p-6">
                      <div className="mb-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Sample Vendors</h3>
                        <div className="grid grid-cols-2 gap-4 mb-6">
                          {Object.entries(sampleVendors).map(([key, vendor]) => (
                            <Card
                              key={key}
                              className="p-4 cursor-pointer border border-gray-300 hover:border-gray-600 transition-all"
                              onClick={() => {
                                setVendorData({
                                  name: vendor.name,
                                  spend: vendor.annualSpend,
                                  contracts: vendor.contractCount.toString(),
                                  industry: vendor.industry
                                });
                              }}
                            >
                              <Building className="w-5 h-5 text-gray-700 mb-2" />
                              <h4 className="font-semibold text-gray-900 text-sm">{vendor.name}</h4>
                              <p className="text-xs text-gray-600 mt-1">{vendor.industry}</p>
                              <div className="mt-2 flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  Score: {vendor.performanceScore}
                                </Badge>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="vendor-name" className="text-sm text-gray-700">Vendor Name</Label>
                            <Input
                              id="vendor-name"
                              value={vendorData.name}
                              onChange={(e) => setVendorData({...vendorData, name: e.target.value})}
                              placeholder="Enter vendor name"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor="vendor-industry" className="text-sm text-gray-700">Industry</Label>
                            <Input
                              id="vendor-industry"
                              value={vendorData.industry}
                              onChange={(e) => setVendorData({...vendorData, industry: e.target.value})}
                              placeholder="e.g., Technology, Services"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor="vendor-spend" className="text-sm text-gray-700">Annual Spend</Label>
                            <Input
                              id="vendor-spend"
                              value={vendorData.spend}
                              onChange={(e) => setVendorData({...vendorData, spend: e.target.value})}
                              placeholder="e.g., $500K"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor="vendor-contracts" className="text-sm text-gray-700">Active Contracts</Label>
                            <Input
                              id="vendor-contracts"
                              value={vendorData.contracts}
                              onChange={(e) => setVendorData({...vendorData, contracts: e.target.value})}
                              placeholder="Number of contracts"
                              className="mt-1"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end pt-4">
                          <Button
                            onClick={startAnalysis}
                            disabled={!vendorData.name}
                            className="bg-gray-900 hover:bg-gray-800 text-white"
                          >
                            <Target className="w-4 h-4 mr-2" />
                            Analyze Vendor
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* Results Dashboard */
                <div className="p-6">
                  {/* Results Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">Analysis Complete</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Processed in 8.2 seconds • {demoMode === 'contract' ? '2,847 words analyzed' : '12 data points evaluated'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* View Mode Toggles */}
                      {demoMode === 'contract' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setXrayMode(!xrayMode)}
                            className={xrayMode ? 'border-gray-900 bg-gray-100' : ''}
                          >
                            {xrayMode ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
                            X-Ray Vision
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setComparisonMode(!comparisonMode)}
                            className={comparisonMode ? 'border-gray-900 bg-gray-100' : ''}
                          >
                            <BarChart3 className="w-4 h-4 mr-1" />
                            Compare
                          </Button>
                        </>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowResults(false);
                          setContractText('');
                          setSelectedTemplate(null);
                        }}
                      >
                        New Analysis
                      </Button>
                    </div>
                  </div>

                  {/* Comparison Mode Banner */}
                  {comparisonMode && (
                    <Card className="mb-6 p-4 bg-gray-50 border-gray-300">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Clock className="w-5 h-5 text-gray-700" />
                          <div>
                            <p className="font-semibold text-gray-900">Time Comparison</p>
                            <p className="text-sm text-gray-600">Human Review: ~2 hours vs AI: 8 seconds</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-gray-900">900x</p>
                          <p className="text-xs text-gray-600">Faster</p>
                        </div>
                      </div>
                    </Card>
                  )}

                  {/* Main Results Grid */}
                  <div className="grid grid-cols-3 gap-6">
                    {/* Left Column - Risk Analysis */}
                    <div className="space-y-4">
                      <Card className="p-4 border-gray-300">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          Risk Assessment
                        </h4>
                        
                        {/* Risk Meter */}
                        <div className="relative mb-4">
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500"
                              initial={{ width: 0 }}
                              animate={{ width: '65%' }}
                              transition={{ duration: 1, delay: 0.5 }}
                            />
                          </div>
                          <motion.div
                            className="absolute -top-1 w-4 h-4 bg-gray-900 rounded-full border-2 border-white"
                            initial={{ left: 0 }}
                            animate={{ left: '65%' }}
                            transition={{ duration: 1, delay: 0.5 }}
                          />
                        </div>
                        <p className="text-center text-sm font-semibold text-gray-900 mb-4">
                          Medium Risk (65/100)
                        </p>

                        {/* Individual Risks */}
                        <div className="space-y-2">
                          {risks.map((risk, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.1 }}
                              className={`p-2 border-l-2 ${
                                risk.level === 'high' ? 'border-red-500 bg-red-50' :
                                risk.level === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                                'border-green-500 bg-green-50'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <p className="text-xs text-gray-700">{risk.description}</p>
                                <Badge variant="outline" className="text-xs">
                                  {risk.score}
                                </Badge>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </Card>

                      {/* Key Dates */}
                      <Card className="p-4 border-gray-300">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Critical Dates
                        </h4>
                        <div className="space-y-2">
                          {keyDates.map((date, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.5 + i * 0.1 }}
                              className="flex items-center justify-between py-1"
                            >
                              <span className="text-xs text-gray-600">{date.event}</span>
                              <span className="text-xs font-mono text-gray-900">{date.date}</span>
                            </motion.div>
                          ))}
                        </div>
                      </Card>
                    </div>

                    {/* Center Column - Main Analysis */}
                    <div className="space-y-4">
                      {/* Streaming Analysis Text */}
                      <Card className="p-4 border-gray-300">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <FileSearch className="w-4 h-4" />
                          Intelligence Summary
                        </h4>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {streamedText}
                          {streamedText.length < 100 && (
                            <span className="inline-block w-2 h-4 ml-1 bg-gray-900 animate-pulse" />
                          )}
                        </p>
                      </Card>

                      {/* Key Insights */}
                      <Card className="p-4 border-gray-300">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <Sparkles className="w-4 h-4" />
                          Key Insights
                        </h4>
                        <div className="space-y-2">
                          {insights.map((insight, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.2 }}
                              className="flex items-start gap-2"
                            >
                              <ChevronRight className="w-3 h-3 text-gray-500 mt-0.5 flex-shrink-0" />
                              <p className="text-xs text-gray-700">{insight}</p>
                            </motion.div>
                          ))}
                        </div>
                      </Card>

                      {/* X-Ray Vision Mode */}
                      {xrayMode && demoMode === 'contract' && (
                        <Card className="p-4 border-gray-900 bg-gray-50">
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Eye className="w-4 h-4" />
                            X-Ray Vision Active
                          </h4>
                          <div className="space-y-2 font-mono text-xs">
                            <p className="text-gray-700">
                              This Agreement shall remain in effect for a period of 
                              <span className="bg-yellow-200 px-1 mx-1">three (3) years</span>
                              from the Effective Date
                            </p>
                            <p className="text-gray-700">
                              In the event of a breach, the breaching party shall pay
                              <span className="bg-red-200 px-1 mx-1">liquidated damages of $500,000</span>
                            </p>
                            <p className="text-gray-700">
                              Provider guarantees
                              <span className="bg-green-200 px-1 mx-1">99.9% uptime availability</span>
                            </p>
                          </div>
                        </Card>
                      )}
                    </div>

                    {/* Right Column - Actions & Recommendations */}
                    <div className="space-y-4">
                      {/* Obligations */}
                      <Card className="p-4 border-gray-300">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <Target className="w-4 h-4" />
                          Obligations Matrix
                        </h4>
                        <div className="space-y-2">
                          {obligations.map((obligation, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.7 + i * 0.1 }}
                              className="p-2 bg-gray-50 border border-gray-200"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-semibold text-gray-900">{obligation.party}</span>
                                <span className="text-xs text-gray-500">{obligation.date}</span>
                              </div>
                              <p className="text-xs text-gray-600">{obligation.obligation}</p>
                            </motion.div>
                          ))}
                        </div>
                      </Card>

                      {/* Action Items */}
                      <Card className="p-4 border-gray-300">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <Zap className="w-4 h-4" />
                          Recommended Actions
                        </h4>
                        <div className="space-y-2">
                          <Button className="w-full justify-start text-left bg-gray-900 hover:bg-gray-800 text-white text-xs">
                            <AlertCircle className="w-3 h-3 mr-2 flex-shrink-0" />
                            Review liability limitations with legal
                          </Button>
                          <Button variant="outline" className="w-full justify-start text-left text-xs">
                            <Calendar className="w-3 h-3 mr-2 flex-shrink-0" />
                            Set renewal reminder for Oct 1, 2024
                          </Button>
                          <Button variant="outline" className="w-full justify-start text-left text-xs">
                            <DollarSign className="w-3 h-3 mr-2 flex-shrink-0" />
                            Negotiate price increase cap
                          </Button>
                        </div>
                      </Card>

                      {/* Export Options */}
                      <Card className="p-4 border-gray-300">
                        <h4 className="font-semibold text-gray-900 mb-3">Export Results</h4>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1">
                            <Download className="w-3 h-3 mr-1" />
                            PDF
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1">
                            <Copy className="w-3 h-3 mr-1" />
                            Copy
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1">
                            <Share2 className="w-3 h-3 mr-1" />
                            Share
                          </Button>
                        </div>
                      </Card>
                    </div>
                  </div>

                  {/* What-If Simulator */}
                  <Card className="mt-6 p-4 border-gray-300 bg-gray-50">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      What-If Simulator
                    </h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-gray-600 mb-1">If you accept current terms:</p>
                        <p className="text-sm font-semibold text-gray-900">Annual cost: $180,000</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">With negotiated 5% cap:</p>
                        <p className="text-sm font-semibold text-green-700">Annual cost: $171,000</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Potential savings:</p>
                        <p className="text-sm font-semibold text-blue-700">$9,000/year</p>
                      </div>
                    </div>
                  </Card>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
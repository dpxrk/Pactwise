'use client';

import {
  DollarSign,
  TrendingUp,
  Calculator,
  Target,
  Globe,
  Loader2,
  CheckCircle,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import React, { useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { agentsAPI } from '@/lib/api/agents';

interface ProcessingResult {
  taskId: string;
  status: 'processing' | 'completed' | 'error';
  result?: {
    value?: number;
    rate?: number;
    projections?: Array<{ period: number; value: number }>;
    roi?: number;
    converted?: { amount: number; currency: string };
    formatted?: string;
  };
  error?: string;
}

interface FinancialInputs {
  // NPV inputs
  initialInvestment?: number;
  discountRate?: number;
  cashFlows?: string;

  // IRR inputs
  irrCashFlows?: string;

  // Cash Flow Projection inputs
  baseAmount?: number;
  growthRate?: number;
  periods?: number;

  // ROI inputs
  investmentCost?: number;
  returnAmount?: number;

  // Currency Conversion inputs
  amount?: number;
  fromCurrency?: string;
  toCurrency?: string;
}

export default function FinancialAgentPage() {
  const { userProfile } = useAuth();
  const [activeCapability, setActiveCapability] = useState<string>('calculate-npv');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [inputs, setInputs] = useState<FinancialInputs>({
    discountRate: 10,
    growthRate: 5,
    periods: 5,
    fromCurrency: 'USD',
    toCurrency: 'EUR',
  });

  const capabilities = [
    {
      id: 'calculate-npv',
      name: 'Calculate NPV',
      icon: DollarSign,
      description: 'Net Present Value calculation for investment analysis',
    },
    {
      id: 'calculate-irr',
      name: 'Calculate IRR',
      icon: TrendingUp,
      description: 'Internal Rate of Return for project evaluation',
    },
    {
      id: 'cash-flow-projection',
      name: 'Cash Flow Projection',
      icon: Calculator,
      description: 'Multi-period cash flow forecasting with growth rates',
    },
    {
      id: 'roi-analysis',
      name: 'ROI Analysis',
      icon: Target,
      description: 'Return on Investment calculation and analysis',
    },
    {
      id: 'currency-conversion',
      name: 'Currency Conversion',
      icon: Globe,
      description: 'Multi-currency conversion with real-time rates',
    },
  ];

  const handleInputChange = (field: keyof FinancialInputs, value: string | number) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
    setResult(null);
  };

  const handleProcess = async () => {
    if (!userProfile?.enterprise_id) {
      toast.error('User profile not loaded');
      return;
    }

    // Validate inputs based on active capability
    if (activeCapability === 'calculate-npv') {
      if (!inputs.initialInvestment || !inputs.discountRate || !inputs.cashFlows) {
        toast.error('Please fill in all NPV fields');
        return;
      }
    } else if (activeCapability === 'calculate-irr') {
      if (!inputs.irrCashFlows) {
        toast.error('Please provide cash flows for IRR calculation');
        return;
      }
    } else if (activeCapability === 'cash-flow-projection') {
      if (!inputs.baseAmount || !inputs.growthRate || !inputs.periods) {
        toast.error('Please fill in all projection fields');
        return;
      }
    } else if (activeCapability === 'roi-analysis') {
      if (!inputs.investmentCost || !inputs.returnAmount) {
        toast.error('Please fill in all ROI fields');
        return;
      }
    } else if (activeCapability === 'currency-conversion') {
      if (!inputs.amount || !inputs.fromCurrency || !inputs.toCurrency) {
        toast.error('Please fill in all conversion fields');
        return;
      }
    }

    setProcessing(true);
    setResult({ taskId: '', status: 'processing' });

    try {
      // Create agent task
      const task = await agentsAPI.createAgentTask({
        type: 'financial',
        data: {
          capability: activeCapability,
          inputs,
        },
        priority: 7,
        userId: userProfile.id,
        enterpriseId: userProfile.enterprise_id,
      });

      setResult({
        taskId: task.id,
        status: 'processing',
      });

      // Poll for task completion
      const pollInterval = setInterval(async () => {
        try {
          const taskStatus = await agentsAPI.getTaskStatus(task.id);

          if (taskStatus.status === 'completed') {
            clearInterval(pollInterval);
            setResult({
              taskId: task.id,
              status: 'completed',
              result: taskStatus.result as ProcessingResult['result'],
            });
            setProcessing(false);
            toast.success('Calculation completed successfully!');
          } else if (taskStatus.status === 'failed') {
            clearInterval(pollInterval);
            setResult({
              taskId: task.id,
              status: 'error',
              error: taskStatus.error || 'Calculation failed',
            });
            setProcessing(false);
            toast.error('Calculation failed');
          }
        } catch (_error) {
          clearInterval(pollInterval);
          setProcessing(false);
          toast.error('Failed to check task status');
        }
      }, 2000);

      // Timeout after 2 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        if (processing) {
          setProcessing(false);
          toast.error('Processing timeout');
        }
      }, 120000);
    } catch (error) {
      console.error('Processing error:', error);
      setProcessing(false);
      setResult({
        taskId: '',
        status: 'error',
        error: 'Failed to start calculation',
      });
      toast.error('Failed to process calculation');
    }
  };

  const currentCapability = capabilities.find((c) => c.id === activeCapability);

  const renderInputForm = () => {
    switch (activeCapability) {
      case 'calculate-npv':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-purple-900 mb-2 font-mono uppercase tracking-wider">
                Initial Investment ($)
              </label>
              <Input
                type="number"
                placeholder="100000"
                value={inputs.initialInvestment || ''}
                onChange={(e) => handleInputChange('initialInvestment', parseFloat(e.target.value))}
                className="border-ghost-300 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-purple-900 mb-2 font-mono uppercase tracking-wider">
                Discount Rate (%)
              </label>
              <Input
                type="number"
                placeholder="10"
                value={inputs.discountRate || ''}
                onChange={(e) => handleInputChange('discountRate', parseFloat(e.target.value))}
                className="border-ghost-300 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-purple-900 mb-2 font-mono uppercase tracking-wider">
                Cash Flows (comma-separated)
              </label>
              <Input
                type="text"
                placeholder="20000, 25000, 30000, 35000, 40000"
                value={inputs.cashFlows || ''}
                onChange={(e) => handleInputChange('cashFlows', e.target.value)}
                className="border-ghost-300 font-mono"
              />
              <p className="text-xs text-ghost-600 mt-1">Enter expected cash flows for each period</p>
            </div>
          </div>
        );

      case 'calculate-irr':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-purple-900 mb-2 font-mono uppercase tracking-wider">
                Cash Flows (comma-separated, include initial investment as negative)
              </label>
              <Input
                type="text"
                placeholder="-100000, 20000, 25000, 30000, 35000, 40000"
                value={inputs.irrCashFlows || ''}
                onChange={(e) => handleInputChange('irrCashFlows', e.target.value)}
                className="border-ghost-300 font-mono"
              />
              <p className="text-xs text-ghost-600 mt-1">
                First value should be negative (initial investment)
              </p>
            </div>
          </div>
        );

      case 'cash-flow-projection':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-purple-900 mb-2 font-mono uppercase tracking-wider">
                Base Amount ($)
              </label>
              <Input
                type="number"
                placeholder="50000"
                value={inputs.baseAmount || ''}
                onChange={(e) => handleInputChange('baseAmount', parseFloat(e.target.value))}
                className="border-ghost-300 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-purple-900 mb-2 font-mono uppercase tracking-wider">
                Growth Rate (%)
              </label>
              <Input
                type="number"
                placeholder="5"
                value={inputs.growthRate || ''}
                onChange={(e) => handleInputChange('growthRate', parseFloat(e.target.value))}
                className="border-ghost-300 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-purple-900 mb-2 font-mono uppercase tracking-wider">
                Number of Periods
              </label>
              <Input
                type="number"
                placeholder="5"
                value={inputs.periods || ''}
                onChange={(e) => handleInputChange('periods', parseInt(e.target.value))}
                className="border-ghost-300 font-mono"
              />
            </div>
          </div>
        );

      case 'roi-analysis':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-purple-900 mb-2 font-mono uppercase tracking-wider">
                Investment Cost ($)
              </label>
              <Input
                type="number"
                placeholder="100000"
                value={inputs.investmentCost || ''}
                onChange={(e) => handleInputChange('investmentCost', parseFloat(e.target.value))}
                className="border-ghost-300 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-purple-900 mb-2 font-mono uppercase tracking-wider">
                Return Amount ($)
              </label>
              <Input
                type="number"
                placeholder="150000"
                value={inputs.returnAmount || ''}
                onChange={(e) => handleInputChange('returnAmount', parseFloat(e.target.value))}
                className="border-ghost-300 font-mono"
              />
            </div>
          </div>
        );

      case 'currency-conversion':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-purple-900 mb-2 font-mono uppercase tracking-wider">
                Amount
              </label>
              <Input
                type="number"
                placeholder="1000"
                value={inputs.amount || ''}
                onChange={(e) => handleInputChange('amount', parseFloat(e.target.value))}
                className="border-ghost-300 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-purple-900 mb-2 font-mono uppercase tracking-wider">
                From Currency
              </label>
              <Input
                type="text"
                placeholder="USD"
                value={inputs.fromCurrency || ''}
                onChange={(e) => handleInputChange('fromCurrency', e.target.value.toUpperCase())}
                className="border-ghost-300 font-mono uppercase"
                maxLength={3}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-purple-900 mb-2 font-mono uppercase tracking-wider">
                To Currency
              </label>
              <Input
                type="text"
                placeholder="EUR"
                value={inputs.toCurrency || ''}
                onChange={(e) => handleInputChange('toCurrency', e.target.value.toUpperCase())}
                className="border-ghost-300 font-mono uppercase"
                maxLength={3}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const formatResult = () => {
    if (!result?.result) return null;

    switch (activeCapability) {
      case 'calculate-npv':
        return (
          <div className="space-y-3">
            <div className="p-4 bg-purple-500/5 border border-purple-500/20">
              <div className="text-xs text-purple-900 font-mono uppercase tracking-wider mb-2">
                Net Present Value
              </div>
              <div className="text-3xl font-bold text-purple-900 font-mono">
                ${result.result.value?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              {result.result.value && result.result.value > 0 && (
                <div className="text-xs text-success mt-2 font-mono">
                  ✓ Positive NPV - Investment is profitable
                </div>
              )}
              {result.result.value && result.result.value < 0 && (
                <div className="text-xs text-error mt-2 font-mono">
                  ✗ Negative NPV - Investment may not be profitable
                </div>
              )}
            </div>
          </div>
        );

      case 'calculate-irr':
        return (
          <div className="space-y-3">
            <div className="p-4 bg-purple-500/5 border border-purple-500/20">
              <div className="text-xs text-purple-900 font-mono uppercase tracking-wider mb-2">
                Internal Rate of Return
              </div>
              <div className="text-3xl font-bold text-purple-900 font-mono">
                {result.result.rate?.toFixed(2)}%
              </div>
              {result.result.rate && result.result.rate > (inputs.discountRate || 0) && (
                <div className="text-xs text-success mt-2 font-mono">
                  ✓ IRR exceeds discount rate - Good investment
                </div>
              )}
            </div>
          </div>
        );

      case 'cash-flow-projection':
        return (
          <div className="space-y-3">
            <div className="p-4 bg-purple-500/5 border border-purple-500/20">
              <div className="text-xs text-purple-900 font-mono uppercase tracking-wider mb-3">
                Cash Flow Projections
              </div>
              <div className="space-y-2">
                {result.result.projections?.map((proj, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm font-mono">
                    <span className="text-ghost-700">Period {proj.period}</span>
                    <span className="text-purple-900 font-semibold">
                      ${proj.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'roi-analysis':
        return (
          <div className="space-y-3">
            <div className="p-4 bg-purple-500/5 border border-purple-500/20">
              <div className="text-xs text-purple-900 font-mono uppercase tracking-wider mb-2">
                Return on Investment
              </div>
              <div className="text-3xl font-bold text-purple-900 font-mono">
                {result.result.roi?.toFixed(2)}%
              </div>
              {result.result.roi && result.result.roi > 0 && (
                <div className="text-xs text-success mt-2 font-mono">
                  ✓ Positive ROI - Investment generated returns
                </div>
              )}
            </div>
          </div>
        );

      case 'currency-conversion':
        return (
          <div className="space-y-3">
            <div className="p-4 bg-purple-500/5 border border-purple-500/20">
              <div className="text-xs text-purple-900 font-mono uppercase tracking-wider mb-2">
                Converted Amount
              </div>
              <div className="text-3xl font-bold text-purple-900 font-mono">
                {result.result.converted?.amount.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                {result.result.converted?.currency}
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="p-4 bg-ghost-50 border border-ghost-300">
            <pre className="text-xs text-ghost-700 font-mono overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(result.result, null, 2)}
            </pre>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-ghost-100">
      {/* Grid Background */}
      <div
        className="fixed inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgb(210, 209, 222) 0.5px, transparent 0.5px),
            linear-gradient(to bottom, rgb(210, 209, 222) 0.5px, transparent 0.5px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-[1920px] mx-auto px-6 py-6">
        {/* Back Button */}
        <Link href="/dashboard/agents">
          <Button variant="ghost" className="mb-4 text-ghost-600 hover:text-purple-900">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Agents
          </Button>
        </Link>

        {/* Header */}
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-300/5 border-purple-500/20 p-6 mb-6">
          <div className="flex items-start gap-6">
            <div className="p-4 bg-purple-500/10 border border-purple-500/20">
              <DollarSign className="w-10 h-10 text-purple-500" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-semibold text-purple-900 font-mono">FINANCIAL ANALYST</h1>
                <Badge className="bg-success/20 text-success border-success/30 font-mono text-xs">
                  ACTIVE
                </Badge>
              </div>
              <p className="text-sm text-ghost-700 mb-4">
                Advanced financial calculations including NPV, IRR, ROI analysis, cash flow projections, and
                multi-currency conversions.
              </p>
              <div className="p-3 bg-white/50 border border-purple-500/10">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs text-purple-900 font-semibold mb-1 font-mono">USE WHEN:</div>
                    <div className="text-xs text-ghost-700">
                      Evaluating investment opportunities, performing financial analysis, forecasting cash flows, or
                      converting currencies for international contracts.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Capabilities */}
          <div className="lg:col-span-1">
            <Card className="bg-white border-ghost-300 p-6">
              <h2 className="text-sm font-semibold text-purple-900 mb-4 font-mono uppercase tracking-wider">
                CAPABILITIES
              </h2>
              <div className="space-y-2">
                {capabilities.map((capability) => (
                  <button
                    key={capability.id}
                    onClick={() => setActiveCapability(capability.id)}
                    className={`w-full p-4 text-left border transition-all ${
                      activeCapability === capability.id
                        ? 'border-purple-500 bg-purple-500/5'
                        : 'border-ghost-300 hover:border-purple-500/50 hover:bg-ghost-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <capability.icon
                        className={`w-5 h-5 mt-0.5 ${
                          activeCapability === capability.id ? 'text-purple-500' : 'text-ghost-600'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div
                          className={`text-sm font-semibold mb-1 font-mono ${
                            activeCapability === capability.id ? 'text-purple-900' : 'text-ghost-700'
                          }`}
                        >
                          {capability.name}
                        </div>
                        <div className="text-xs text-ghost-600 leading-relaxed">{capability.description}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          </div>

          {/* Right: Calculation Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Input Form */}
            <Card className="bg-white border-ghost-300 p-6">
              <h2 className="text-sm font-semibold text-purple-900 mb-4 font-mono uppercase tracking-wider">
                {currentCapability?.name}
              </h2>
              <p className="text-sm text-ghost-700 mb-6">{currentCapability?.description}</p>

              {/* Input Fields */}
              <div className="mb-6">{renderInputForm()}</div>

              {/* Calculate Button */}
              <Button
                onClick={handleProcess}
                disabled={processing}
                className="w-full bg-purple-900 hover:bg-purple-800 text-white"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Calculating...
                  </>
                ) : (
                  <>
                    <Calculator className="w-4 h-4 mr-2" />
                    Calculate
                  </>
                )}
              </Button>
            </Card>

            {/* Results */}
            {result && (
              <Card className="bg-white border-ghost-300 p-6">
                <h2 className="text-sm font-semibold text-purple-900 mb-4 font-mono uppercase tracking-wider">
                  RESULTS
                </h2>

                {result.status === 'processing' && (
                  <div className="text-center py-12">
                    <Loader2 className="w-12 h-12 mx-auto mb-4 text-purple-500 animate-spin" />
                    <p className="text-sm text-ghost-700 font-mono">Processing calculation...</p>
                    <p className="text-xs text-ghost-500 mt-2">This may take a few moments</p>
                  </div>
                )}

                {result.status === 'completed' && result.result && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-success mb-4">
                      <CheckCircle className="w-5 h-5" />
                      <span className="text-sm font-semibold font-mono">CALCULATION COMPLETE</span>
                    </div>

                    {formatResult()}
                  </div>
                )}

                {result.status === 'error' && (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-error/10 flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-error" />
                    </div>
                    <p className="text-sm text-error font-mono mb-2">Calculation Failed</p>
                    <p className="text-xs text-ghost-600">{result.error}</p>
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

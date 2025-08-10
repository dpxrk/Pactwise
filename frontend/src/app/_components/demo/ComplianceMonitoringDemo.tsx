'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Upload, Shield, AlertTriangle, CheckCircle, XCircle,
  FileSearch, Scale, Activity, Bell, TrendingUp, Clock,
  FileText, Download, RefreshCw, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface ComplianceMonitoringDemoProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ComplianceMonitoringDemo({ isOpen, onClose }: ComplianceMonitoringDemoProps) {
  const [contractData, setContractData] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sampleContract = `DATA PROCESSING AGREEMENT

Effective Date: January 1, 2024
Data Controller: ABC Corporation
Data Processor: XYZ Services

GDPR COMPLIANCE: Processor shall comply with all applicable GDPR requirements.
DATA RETENTION: Personal data shall be retained for no longer than necessary.
SECURITY MEASURES: Implement appropriate technical and organizational measures.
BREACH NOTIFICATION: Notify controller within 72 hours of becoming aware of breach.
SUBPROCESSORS: Written consent required before engaging any subprocessor.
AUDIT RIGHTS: Controller may audit processor's compliance annually.
CROSS-BORDER TRANSFERS: Standard contractual clauses shall apply.
LIABILITY: Each party's liability limited to direct damages only.`;

  const startAnalysis = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      setShowResults(true);
    }, 3500);
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
                <h2 className="text-2xl font-semibold text-gray-900">Compliance Monitoring Demo</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Real-time regulatory compliance checking across all contracts
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
                            Contract for Compliance Check
                          </Label>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setContractData(sampleContract)}
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
                              Upload Contract
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
                                    setContractData(e.target?.result as string);
                                  };
                                  reader.readAsText(file);
                                }
                              }}
                            />
                          </div>
                        </div>
                        
                        <Textarea
                          value={contractData}
                          onChange={(e) => setContractData(e.target.value)}
                          placeholder="Paste contract text for compliance analysis..."
                          className="min-h-[300px] p-4 font-mono text-sm border-gray-300"
                        />

                        <div className="mt-4 p-3 bg-gray-50 border border-gray-200">
                          <p className="text-xs text-gray-600">
                            <Shield className="w-3 h-3 inline mr-1" />
                            Checking against: GDPR, CCPA, SOC 2, ISO 27001, HIPAA
                          </p>
                        </div>

                        <div className="flex justify-end mt-4">
                          <Button
                            onClick={startAnalysis}
                            disabled={!contractData}
                            className="bg-gray-900 hover:bg-gray-800 text-white"
                          >
                            <Shield className="w-4 h-4 mr-2" />
                            Check Compliance
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
                        <Shield className="absolute inset-0 m-auto w-8 h-8 text-gray-900" />
                      </div>
                      
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Scanning for compliance issues...
                      </h3>
                      
                      <div className="mt-4 space-y-2 text-center">
                        <p className="text-xs text-gray-600">Checking GDPR requirements...</p>
                        <p className="text-xs text-gray-600">Validating data protection clauses...</p>
                        <p className="text-xs text-gray-600">Analyzing security measures...</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">Compliance Report</h3>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-sm text-gray-600">Overall Compliance: 78%</span>
                        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                          Attention Required
                        </Badge>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => {
                      setShowResults(false);
                      setContractData('');
                    }}>
                      New Check
                    </Button>
                  </div>

                  {/* Compliance Overview */}
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    <Card className="p-3 border-gray-300">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-600">GDPR</span>
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="text-lg font-semibold text-gray-900">85%</div>
                      <Progress value={85} className="h-1 mt-1" />
                    </Card>
                    <Card className="p-3 border-gray-300">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-600">CCPA</span>
                        <AlertCircle className="w-4 h-4 text-yellow-600" />
                      </div>
                      <div className="text-lg font-semibold text-gray-900">70%</div>
                      <Progress value={70} className="h-1 mt-1" />
                    </Card>
                    <Card className="p-3 border-gray-300">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-600">SOC 2</span>
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="text-lg font-semibold text-gray-900">92%</div>
                      <Progress value={92} className="h-1 mt-1" />
                    </Card>
                    <Card className="p-3 border-gray-300">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-600">ISO 27001</span>
                        <XCircle className="w-4 h-4 text-red-600" />
                      </div>
                      <div className="text-lg font-semibold text-gray-900">65%</div>
                      <Progress value={65} className="h-1 mt-1" />
                    </Card>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    {/* Critical Issues */}
                    <Card className="p-4 border-gray-300">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Critical Issues Found
                      </h4>
                      <div className="space-y-2">
                        <div className="p-2 bg-red-50 border-l-2 border-red-500">
                          <p className="text-xs font-semibold text-red-900">Missing Clause</p>
                          <p className="text-xs text-red-700">No data deletion rights specified</p>
                        </div>
                        <div className="p-2 bg-red-50 border-l-2 border-red-500">
                          <p className="text-xs font-semibold text-red-900">Non-Compliant</p>
                          <p className="text-xs text-red-700">Breach notification exceeds 72hr requirement</p>
                        </div>
                        <div className="p-2 bg-yellow-50 border-l-2 border-yellow-500">
                          <p className="text-xs font-semibold text-yellow-900">Incomplete</p>
                          <p className="text-xs text-yellow-700">Subprocessor approval process unclear</p>
                        </div>
                      </div>
                    </Card>

                    {/* Remediation Actions */}
                    <Card className="p-4 border-gray-300">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <RefreshCw className="w-4 h-4" />
                        Remediation Actions
                      </h4>
                      <div className="space-y-2">
                        <div className="p-2 bg-gray-50 border border-gray-200">
                          <div className="flex items-start gap-2">
                            <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">Urgent</span>
                            <p className="text-xs text-gray-700 flex-1">
                              Add data subject rights clause including deletion
                            </p>
                          </div>
                        </div>
                        <div className="p-2 bg-gray-50 border border-gray-200">
                          <div className="flex items-start gap-2">
                            <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">High</span>
                            <p className="text-xs text-gray-700 flex-1">
                              Update breach notification to 72-hour window
                            </p>
                          </div>
                        </div>
                        <div className="p-2 bg-gray-50 border border-gray-200">
                          <div className="flex items-start gap-2">
                            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Medium</span>
                            <p className="text-xs text-gray-700 flex-1">
                              Define subprocessor approval workflow
                            </p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>

                  {/* Regulatory Updates */}
                  <Card className="mt-6 p-4 border-gray-300 bg-gray-50">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Bell className="w-4 h-4" />
                      Recent Regulatory Updates
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">GDPR: New guidance on AI data processing</span>
                        <span className="text-gray-500">2 days ago</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">CCPA: Updated requirements for opt-out mechanisms</span>
                        <span className="text-gray-500">1 week ago</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">ISO 27001: 2024 version draft released</span>
                        <span className="text-gray-500">2 weeks ago</span>
                      </div>
                    </div>
                  </Card>

                  <div className="mt-6 flex gap-2 justify-end">
                    <Button variant="outline" size="sm">
                      <Download className="w-3 h-3 mr-1" />
                      Export Report
                    </Button>
                    <Button className="bg-gray-900 hover:bg-gray-800 text-white" size="sm">
                      Set Up Monitoring
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
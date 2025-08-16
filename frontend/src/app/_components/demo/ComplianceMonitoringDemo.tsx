'use client';

import React, { useState, useRef, Fragment, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DemoPaymentModal from '@/components/demo/DemoPaymentModal';
import { useDemoAccess } from '@/hooks/useDemoAccess';
import { generateGDPRContract, generateSaaSContract, generateHealthcareContract } from './sampleGenerators';
import { 
  X, Upload, Shield, AlertTriangle, CheckCircle, XCircle,
  FileSearch, Scale, Activity, Bell, TrendingUp, Clock,
  FileText, Download, RefreshCw, AlertCircle, Lock, Eye,
  ShieldCheck, ShieldAlert, ShieldOff, Database, Globe,
  BookOpen, Zap, ChevronRight, Info, Calendar, Target,
  TrendingDown, BarChart3, PieChart, FileWarning, CheckSquare,
  AlertOctagon, Timer, Layers, GitBranch, Search, Filter,
  ChevronDown, ChevronUp, Sparkles, Brain, Award, DollarSign,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';

interface ComplianceMonitoringDemoProps {
  isOpen: boolean;
  onClose: () => void;
}

// Comprehensive Regulatory Frameworks
const REGULATORY_FRAMEWORKS = {
  GDPR: {
    name: 'General Data Protection Regulation',
    region: 'EU',
    icon: Globe,
    requirements: [
      { id: 'gdpr-1', name: 'Lawful basis for processing', weight: 10, keywords: ['lawful', 'basis', 'consent', 'legitimate interest'] },
      { id: 'gdpr-2', name: 'Data subject rights', weight: 9, keywords: ['right', 'access', 'deletion', 'portability', 'rectification'] },
      { id: 'gdpr-3', name: 'Data breach notification (72 hours)', weight: 10, keywords: ['breach', 'notification', '72 hours', 'incident'] },
      { id: 'gdpr-4', name: 'Privacy by design', weight: 8, keywords: ['privacy', 'design', 'default', 'protection'] },
      { id: 'gdpr-5', name: 'Data Protection Officer', weight: 7, keywords: ['DPO', 'officer', 'protection officer'] },
      { id: 'gdpr-6', name: 'Cross-border transfers', weight: 8, keywords: ['transfer', 'cross-border', 'international', 'adequacy'] },
      { id: 'gdpr-7', name: 'Data retention limits', weight: 7, keywords: ['retention', 'storage', 'duration', 'period'] },
      { id: 'gdpr-8', name: 'Security measures', weight: 9, keywords: ['security', 'encryption', 'pseudonymization', 'technical'] }
    ]
  },
  CCPA: {
    name: 'California Consumer Privacy Act',
    region: 'US-CA',
    icon: Shield,
    requirements: [
      { id: 'ccpa-1', name: 'Consumer right to know', weight: 9, keywords: ['know', 'information', 'collected', 'disclosure'] },
      { id: 'ccpa-2', name: 'Right to delete', weight: 9, keywords: ['delete', 'deletion', 'remove', 'erasure'] },
      { id: 'ccpa-3', name: 'Right to opt-out', weight: 10, keywords: ['opt-out', 'sale', 'do not sell', 'opt out'] },
      { id: 'ccpa-4', name: 'Non-discrimination', weight: 8, keywords: ['discrimination', 'equal', 'service', 'price'] },
      { id: 'ccpa-5', name: 'Privacy notice', weight: 8, keywords: ['notice', 'privacy policy', 'disclosure', 'transparent'] },
      { id: 'ccpa-6', name: 'Verifiable requests', weight: 7, keywords: ['verify', 'authentication', 'identity', 'request'] }
    ]
  },
  SOC2: {
    name: 'Service Organization Control 2',
    region: 'Global',
    icon: ShieldCheck,
    requirements: [
      { id: 'soc2-1', name: 'Security principle', weight: 10, keywords: ['security', 'unauthorized', 'access', 'protection'] },
      { id: 'soc2-2', name: 'Availability principle', weight: 8, keywords: ['availability', 'uptime', 'SLA', 'operational'] },
      { id: 'soc2-3', name: 'Processing integrity', weight: 8, keywords: ['integrity', 'complete', 'valid', 'accurate'] },
      { id: 'soc2-4', name: 'Confidentiality principle', weight: 9, keywords: ['confidential', 'restricted', 'classified', 'sensitive'] },
      { id: 'soc2-5', name: 'Privacy principle', weight: 9, keywords: ['privacy', 'personal', 'PII', 'collection'] }
    ]
  },
  ISO27001: {
    name: 'ISO 27001 Information Security',
    region: 'Global',
    icon: Award,
    requirements: [
      { id: 'iso-1', name: 'Risk assessment', weight: 10, keywords: ['risk', 'assessment', 'analysis', 'evaluation'] },
      { id: 'iso-2', name: 'Access control', weight: 9, keywords: ['access', 'control', 'authentication', 'authorization'] },
      { id: 'iso-3', name: 'Incident management', weight: 9, keywords: ['incident', 'response', 'management', 'procedure'] },
      { id: 'iso-4', name: 'Business continuity', weight: 8, keywords: ['continuity', 'disaster', 'recovery', 'backup'] },
      { id: 'iso-5', name: 'Supplier relationships', weight: 7, keywords: ['supplier', 'vendor', 'third-party', 'subprocessor'] },
      { id: 'iso-6', name: 'Asset management', weight: 7, keywords: ['asset', 'inventory', 'classification', 'handling'] }
    ]
  },
  HIPAA: {
    name: 'Health Insurance Portability Act',
    region: 'US',
    icon: FileWarning,
    requirements: [
      { id: 'hipaa-1', name: 'PHI protection', weight: 10, keywords: ['PHI', 'health', 'medical', 'patient'] },
      { id: 'hipaa-2', name: 'Minimum necessary', weight: 8, keywords: ['minimum', 'necessary', 'limited', 'need-to-know'] },
      { id: 'hipaa-3', name: 'Business Associate Agreement', weight: 10, keywords: ['BAA', 'business associate', 'agreement'] },
      { id: 'hipaa-4', name: 'Audit controls', weight: 8, keywords: ['audit', 'log', 'monitoring', 'tracking'] },
      { id: 'hipaa-5', name: 'Transmission security', weight: 9, keywords: ['transmission', 'encryption', 'secure', 'transport'] }
    ]
  }
};

// Dynamic Compliance Analysis Engine
class ComplianceAnalyzer {
  private contract: string;
  private detectedFrameworks: Set<string>;
  private complianceScores: Map<string, number>;
  private issues: any[];
  private remediations: any[];
  
  constructor(contractText: string) {
    this.contract = contractText.toLowerCase();
    this.detectedFrameworks = new Set();
    this.complianceScores = new Map();
    this.issues = [];
    this.remediations = [];
  }
  
  // Detect which regulatory frameworks apply
  public detectApplicableFrameworks(): string[] {
    const frameworks: string[] = [];
    
    // GDPR detection
    if (this.contract.includes('gdpr') || 
        this.contract.includes('general data protection') ||
        this.contract.includes('eu') ||
        this.contract.includes('european') ||
        this.contract.includes('data controller') ||
        this.contract.includes('data processor')) {
      frameworks.push('GDPR');
    }
    
    // CCPA detection
    if (this.contract.includes('ccpa') || 
        this.contract.includes('california') ||
        this.contract.includes('consumer privacy') ||
        this.contract.includes('opt-out') ||
        this.contract.includes('do not sell')) {
      frameworks.push('CCPA');
    }
    
    // SOC2 detection
    if (this.contract.includes('soc 2') || 
        this.contract.includes('soc2') ||
        this.contract.includes('service organization') ||
        this.contract.includes('trust services')) {
      frameworks.push('SOC2');
    }
    
    // ISO 27001 detection
    if (this.contract.includes('iso 27001') || 
        this.contract.includes('iso27001') ||
        this.contract.includes('information security management') ||
        this.contract.includes('isms')) {
      frameworks.push('ISO27001');
    }
    
    // HIPAA detection
    if (this.contract.includes('hipaa') || 
        this.contract.includes('health insurance portability') ||
        this.contract.includes('phi') ||
        this.contract.includes('protected health') ||
        this.contract.includes('medical records')) {
      frameworks.push('HIPAA');
    }
    
    // Default to common frameworks if none detected
    if (frameworks.length === 0) {
      frameworks.push('GDPR', 'SOC2', 'ISO27001');
    }
    
    frameworks.forEach(f => this.detectedFrameworks.add(f));
    return frameworks;
  }
  
  // Analyze compliance for each framework
  public analyzeCompliance(): Map<string, any> {
    const results = new Map();
    
    this.detectedFrameworks.forEach(frameworkKey => {
      const framework = REGULATORY_FRAMEWORKS[frameworkKey as keyof typeof REGULATORY_FRAMEWORKS];
      if (!framework) return;
      
      const analysis = this.analyzeFrameworkCompliance(frameworkKey, framework);
      results.set(frameworkKey, analysis);
      this.complianceScores.set(frameworkKey, analysis.score);
    });
    
    return results;
  }
  
  private analyzeFrameworkCompliance(frameworkKey: string, framework: any): any {
    const requirementResults: any[] = [];
    let totalWeight = 0;
    let achievedWeight = 0;
    
    framework.requirements.forEach((req: any) => {
      const isCompliant = this.checkRequirement(req);
      const result = {
        id: req.id,
        name: req.name,
        weight: req.weight,
        status: isCompliant ? 'compliant' : this.partialCheck(req) ? 'partial' : 'missing',
        score: isCompliant ? req.weight : this.partialCheck(req) ? req.weight * 0.5 : 0
      };
      
      requirementResults.push(result);
      totalWeight += req.weight;
      achievedWeight += result.score;
      
      // Generate issues for non-compliant items
      if (result.status !== 'compliant') {
        this.generateIssue(frameworkKey, req, result.status);
      }
    });
    
    const overallScore = Math.round((achievedWeight / totalWeight) * 100);
    
    return {
      framework: frameworkKey,
      score: overallScore,
      status: this.getComplianceStatus(overallScore),
      requirements: requirementResults,
      totalRequirements: framework.requirements.length,
      compliantCount: requirementResults.filter(r => r.status === 'compliant').length,
      partialCount: requirementResults.filter(r => r.status === 'partial').length,
      missingCount: requirementResults.filter(r => r.status === 'missing').length
    };
  }
  
  private checkRequirement(requirement: any): boolean {
    // Check if all keywords are present
    const keywordMatches = requirement.keywords.filter((keyword: string) => 
      this.contract.includes(keyword.toLowerCase())
    );
    
    return keywordMatches.length >= Math.ceil(requirement.keywords.length * 0.6);
  }
  
  private partialCheck(requirement: any): boolean {
    // Check if some keywords are present
    const keywordMatches = requirement.keywords.filter((keyword: string) => 
      this.contract.includes(keyword.toLowerCase())
    );
    
    return keywordMatches.length > 0 && keywordMatches.length < Math.ceil(requirement.keywords.length * 0.6);
  }
  
  private getComplianceStatus(score: number): string {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 60) return 'attention';
    if (score >= 40) return 'critical';
    return 'failed';
  }
  
  private generateIssue(framework: string, requirement: any, status: string): void {
    const severity = requirement.weight >= 9 ? 'critical' : 
                    requirement.weight >= 7 ? 'high' : 
                    requirement.weight >= 5 ? 'medium' : 'low';
    
    this.issues.push({
      id: `issue-${this.issues.length + 1}`,
      framework,
      requirement: requirement.name,
      status,
      severity,
      description: status === 'missing' 
        ? `${requirement.name} clause is completely missing from the contract`
        : `${requirement.name} clause is incomplete or unclear`,
      impact: this.getImpactDescription(framework, requirement, severity),
      remediation: this.generateRemediation(framework, requirement, status)
    });
  }
  
  private getImpactDescription(framework: string, requirement: any, severity: string): string {
    const impacts = {
      critical: 'Could result in regulatory fines, legal action, or complete non-compliance',
      high: 'May lead to audit failures and significant compliance risks',
      medium: 'Could cause compliance gaps and require immediate attention',
      low: 'Minor compliance issue that should be addressed in next review'
    };
    
    return impacts[severity as keyof typeof impacts] || impacts.medium;
  }
  
  private generateRemediation(framework: string, requirement: any, status: string): string {
    const remediations: Record<string, Record<string, string>> = {
      GDPR: {
        'Data subject rights': 'Add comprehensive data subject rights clause including access, deletion, portability, and rectification rights with clear procedures',
        'Data breach notification (72 hours)': 'Include specific breach notification timeline of 72 hours to supervisory authority and without undue delay to data subjects',
        'Security measures': 'Specify technical and organizational measures including encryption, pseudonymization, and regular security testing',
        'Data retention limits': 'Define clear retention periods for each data category and deletion procedures'
      },
      CCPA: {
        'Right to opt-out': 'Add clear opt-out mechanism with "Do Not Sell My Personal Information" provisions',
        'Consumer right to know': 'Include disclosure requirements for data collection, use, and sharing practices',
        'Right to delete': 'Specify deletion request procedures and timelines (45-90 days)'
      },
      SOC2: {
        'Security principle': 'Define security controls including access management, encryption, and monitoring',
        'Availability principle': 'Include SLA commitments with uptime guarantees and remedies',
        'Processing integrity': 'Add data validation and error correction procedures'
      },
      ISO27001: {
        'Risk assessment': 'Include regular risk assessment procedures and mitigation strategies',
        'Incident management': 'Define incident response procedures with roles and responsibilities',
        'Access control': 'Specify access control measures including authentication and authorization'
      },
      HIPAA: {
        'PHI protection': 'Add specific safeguards for Protected Health Information',
        'Business Associate Agreement': 'Include comprehensive BAA terms with liability allocation',
        'Audit controls': 'Specify audit logging and monitoring requirements'
      }
    };
    
    return remediations[framework]?.[requirement.name] || 
           `Add specific clause addressing ${requirement.name} requirements for ${framework} compliance`;
  }
  
  public generateComplianceReport(): any {
    const frameworks = this.detectApplicableFrameworks();
    const complianceResults = this.analyzeCompliance();
    
    // Calculate overall compliance score
    let totalScore = 0;
    complianceResults.forEach(result => {
      totalScore += result.score;
    });
    const overallScore = Math.round(totalScore / complianceResults.size);
    
    // Identify critical gaps
    const criticalGaps = this.issues.filter(issue => issue.severity === 'critical');
    const highPriorityGaps = this.issues.filter(issue => issue.severity === 'high');
    
    // Generate remediation timeline
    const remediationTimeline = this.generateRemediationTimeline();
    
    // Risk assessment
    const riskLevel = this.assessOverallRisk(overallScore, criticalGaps.length);
    
    return {
      overallScore,
      overallStatus: this.getComplianceStatus(overallScore),
      riskLevel,
      frameworkResults: complianceResults,
      detectedFrameworks: frameworks,
      totalIssues: this.issues.length,
      criticalIssues: criticalGaps.length,
      highPriorityIssues: highPriorityGaps.length,
      issues: this.issues,
      remediationTimeline,
      estimatedRemediationEffort: this.estimateRemediationEffort(),
      regulatoryExposure: this.calculateRegulatoryExposure()
    };
  }
  
  private generateRemediationTimeline(): any[] {
    const timeline: any[] = [];
    
    // Group issues by severity
    const critical = this.issues.filter(i => i.severity === 'critical');
    const high = this.issues.filter(i => i.severity === 'high');
    const medium = this.issues.filter(i => i.severity === 'medium');
    const low = this.issues.filter(i => i.severity === 'low');
    
    if (critical.length > 0) {
      timeline.push({
        phase: 'Immediate (0-7 days)',
        items: critical.map(i => ({
          framework: i.framework,
          requirement: i.requirement,
          action: i.remediation
        })),
        priority: 'critical'
      });
    }
    
    if (high.length > 0) {
      timeline.push({
        phase: 'Short-term (1-4 weeks)',
        items: high.map(i => ({
          framework: i.framework,
          requirement: i.requirement,
          action: i.remediation
        })),
        priority: 'high'
      });
    }
    
    if (medium.length > 0) {
      timeline.push({
        phase: 'Medium-term (1-3 months)',
        items: medium.map(i => ({
          framework: i.framework,
          requirement: i.requirement,
          action: i.remediation
        })),
        priority: 'medium'
      });
    }
    
    if (low.length > 0) {
      timeline.push({
        phase: 'Long-term (3-6 months)',
        items: low.map(i => ({
          framework: i.framework,
          requirement: i.requirement,
          action: i.remediation
        })),
        priority: 'low'
      });
    }
    
    return timeline;
  }
  
  private assessOverallRisk(score: number, criticalIssues: number): string {
    if (criticalIssues > 3 || score < 40) return 'severe';
    if (criticalIssues > 1 || score < 60) return 'high';
    if (criticalIssues > 0 || score < 75) return 'medium';
    if (score < 90) return 'low';
    return 'minimal';
  }
  
  private estimateRemediationEffort(): any {
    const effortHours = {
      critical: 16,
      high: 8,
      medium: 4,
      low: 2
    };
    
    let totalHours = 0;
    let totalCost = 0;
    const hourlyRate = 150; // Estimated legal/compliance consultant rate
    
    this.issues.forEach(issue => {
      const hours = effortHours[issue.severity as keyof typeof effortHours] || 4;
      totalHours += hours;
      totalCost += hours * hourlyRate;
    });
    
    return {
      totalHours,
      totalCost,
      timeline: totalHours <= 40 ? '1 week' : totalHours <= 160 ? '1 month' : '2-3 months',
      resources: totalHours <= 40 ? '1 person' : '2-3 people'
    };
  }
  
  private calculateRegulatoryExposure(): any {
    const exposures: any = {};
    
    if (this.detectedFrameworks.has('GDPR')) {
      const gdprScore = this.complianceScores.get('GDPR') || 0;
      exposures.GDPR = {
        maxFine: gdprScore < 40 ? '€20M or 4% of revenue' : gdprScore < 70 ? '€10M or 2% of revenue' : 'Low risk',
        likelihood: gdprScore < 40 ? 'high' : gdprScore < 70 ? 'medium' : 'low'
      };
    }
    
    if (this.detectedFrameworks.has('CCPA')) {
      const ccpaScore = this.complianceScores.get('CCPA') || 0;
      exposures.CCPA = {
        maxFine: '$7,500 per violation',
        likelihood: ccpaScore < 40 ? 'high' : ccpaScore < 70 ? 'medium' : 'low'
      };
    }
    
    if (this.detectedFrameworks.has('HIPAA')) {
      const hipaaScore = this.complianceScores.get('HIPAA') || 0;
      exposures.HIPAA = {
        maxFine: hipaaScore < 40 ? '$2M per violation' : '$100K-$1.5M',
        likelihood: hipaaScore < 40 ? 'high' : hipaaScore < 70 ? 'medium' : 'low'
      };
    }
    
    return exposures;
  }
  
  public generateAIRecommendations(): any[] {
    const recommendations: any[] = [];
    
    // Prioritize by impact and effort
    recommendations.push({
      title: 'Quick Wins',
      description: 'High-impact, low-effort improvements',
      items: this.issues
        .filter(i => i.severity === 'medium' || i.severity === 'low')
        .slice(0, 3)
        .map(i => ({
          action: i.remediation,
          impact: 'Improves ' + i.framework + ' compliance by 5-10%',
          effort: '2-4 hours'
        }))
    });
    
    recommendations.push({
      title: 'Strategic Improvements',
      description: 'Comprehensive compliance enhancements',
      items: [
        {
          action: 'Implement automated compliance monitoring',
          impact: 'Continuous compliance validation',
          effort: '1-2 weeks implementation'
        },
        {
          action: 'Create compliance clause library',
          impact: 'Standardize all future contracts',
          effort: '3-5 days'
        },
        {
          action: 'Establish regular audit schedule',
          impact: 'Proactive issue detection',
          effort: 'Ongoing - 2 hours/month'
        }
      ]
    });
    
    return recommendations;
  }
}

export default function ComplianceMonitoringDemo({ isOpen, onClose }: ComplianceMonitoringDemoProps) {
  const [contractData, setContractData] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [analysisTime, setAnalysisTime] = useState(0);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedFrameworks, setSelectedFrameworks] = useState<string[]>([]);
  const [complianceReport, setComplianceReport] = useState<any>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [viewMode, setViewMode] = useState<'dashboard' | 'detailed'>('dashboard');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { isDemoUnlocked, unlockDemo } = useDemoAccess();
  const isUnlocked = isDemoUnlocked('compliance-monitoring');

  // Generate random sample contracts on each render
  const sampleContracts = useMemo(() => ({
    gdpr: generateGDPRContract(),
    saas: generateSaaSContract(),
    healthcare: generateHealthcareContract()
  }), []);

  // Analyze contract using business logic
  const analyzer = useMemo(() => {
    if (contractData) {
      return new ComplianceAnalyzer(contractData);
    }
    return null;
  }, [contractData]);

  const startAnalysis = () => {
    setIsAnalyzing(true);
    const startTime = Date.now();
    
    // Simulate progressive analysis stages
    const stages = [
      { message: 'Detecting regulatory frameworks...', duration: 600 },
      { message: 'Analyzing compliance requirements...', duration: 800 },
      { message: 'Identifying gaps and risks...', duration: 700 },
      { message: 'Generating remediation plan...', duration: 600 },
      { message: 'Calculating risk exposure...', duration: 500 },
      { message: 'Finalizing compliance report...', duration: 300 }
    ];
    
    let currentStage = 0;
    const runStage = () => {
      if (currentStage < stages.length) {
        setTimeout(() => {
          currentStage++;
          runStage();
        }, stages[currentStage].duration);
      } else {
        const endTime = Date.now();
        setAnalysisTime((endTime - startTime) / 1000);
        
        // Generate compliance report
        if (analyzer) {
          const report = analyzer.generateComplianceReport();
          setComplianceReport(report);
          setSelectedFrameworks(report.detectedFrameworks);
        }
        
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-600 bg-green-50 border-green-200';
      case 'good': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'attention': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'critical': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'failed': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-700 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'low': return 'bg-blue-100 text-blue-700 border-blue-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getRiskLevelColor = (risk: string) => {
    switch (risk) {
      case 'severe': return 'bg-red-600 text-white';
      case 'high': return 'bg-orange-600 text-white';
      case 'medium': return 'bg-yellow-600 text-white';
      case 'low': return 'bg-blue-600 text-white';
      case 'minimal': return 'bg-green-600 text-white';
      default: return 'bg-gray-600 text-white';
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
            className="relative w-full max-w-7xl max-h-[90vh] overflow-hidden bg-white border border-gray-300"
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">AI Compliance Monitor</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Real-time regulatory compliance analysis powered by intelligent detection
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
                      {/* Framework Selection */}
                      <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Compliance Frameworks</h3>
                        <div className="grid grid-cols-5 gap-3">
                          {Object.entries(REGULATORY_FRAMEWORKS).map(([key, framework]) => {
                            const Icon = framework.icon;
                            return (
                              <div key={key} className="flex items-center gap-2">
                                <Checkbox 
                                  id={key}
                                  checked={selectedFrameworks.includes(key)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedFrameworks([...selectedFrameworks, key]);
                                    } else {
                                      setSelectedFrameworks(selectedFrameworks.filter(f => f !== key));
                                    }
                                  }}
                                />
                                <Label htmlFor={key} className="flex items-center gap-1 cursor-pointer">
                                  <Icon className="w-4 h-4" />
                                  <span className="text-xs">{key}</span>
                                </Label>
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          <Info className="w-3 h-3 inline mr-1" />
                          AI will auto-detect applicable frameworks from contract content
                        </p>
                      </div>

                      {/* Contract Input */}
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-4">
                          <Label className="text-sm font-semibold text-gray-700">
                            Contract Analysis
                          </Label>
                          <div className="flex gap-2">
                            <Select 
                              value=""
                              onValueChange={(value) => setContractData(sampleContracts[value as keyof typeof sampleContracts])}
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue placeholder="Load Template" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="gdpr">GDPR Contract</SelectItem>
                                <SelectItem value="saas">SaaS Agreement</SelectItem>
                                <SelectItem value="healthcare">Healthcare BAA</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => fileInputRef.current?.click()}
                            >
                              <Upload className="w-3 h-3 mr-1" />
                              Upload
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
                          placeholder="Paste contract text for comprehensive compliance analysis..."
                          className="min-h-[300px] p-4 font-mono text-sm border-gray-300"
                        />

                        <div className="flex items-center justify-between mt-4">
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Brain className="w-3 h-3" />
                              AI-powered detection
                            </span>
                            <span className="flex items-center gap-1">
                              <Shield className="w-3 h-3" />
                              Multi-framework analysis
                            </span>
                            <span className="flex items-center gap-1">
                              <Zap className="w-3 h-3" />
                              Real-time risk scoring
                            </span>
                          </div>
                          <Button
                            onClick={startAnalysis}
                            disabled={!contractData}
                            className="bg-gray-900 hover:bg-gray-800 text-white"
                          >
                            <Sparkles className="w-4 h-4 mr-2" />
                            Analyze Compliance
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
                        Analyzing compliance requirements...
                      </h3>
                      <p className="text-sm text-gray-600">
                        AI is detecting frameworks and evaluating regulatory compliance
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6">
                  {/* Results Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">Compliance Analysis Report</h3>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">Overall Score:</span>
                          <span className="text-2xl font-bold text-gray-900">
                            {complianceReport?.overallScore}%
                          </span>
                          <Badge className={getRiskLevelColor(complianceReport?.riskLevel)}>
                            {complianceReport?.riskLevel?.toUpperCase()} RISK
                          </Badge>
                        </div>
                        <span className="text-sm text-gray-500">
                          Analyzed in {analysisTime.toFixed(1)}s
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setViewMode(viewMode === 'dashboard' ? 'detailed' : 'dashboard')}
                      >
                        {viewMode === 'dashboard' ? <FileText className="w-3 h-3 mr-1" /> : <PieChart className="w-3 h-3 mr-1" />}
                        {viewMode === 'dashboard' ? 'Detailed View' : 'Dashboard'}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => {
                        setShowResults(false);
                        setContractData('');
                        setComplianceReport(null);
                      }}>
                        New Analysis
                      </Button>
                    </div>
                  </div>

                  {/* Quick Metrics */}
                  <div className="grid grid-cols-6 gap-4 mb-6">
                    <Card className="p-3 border-gray-200">
                      <div className="flex items-center gap-2 mb-1">
                        <Shield className="w-4 h-4 text-blue-600" />
                        <span className="text-xs text-gray-600">Frameworks</span>
                      </div>
                      <p className="text-xl font-bold text-gray-900">
                        {complianceReport?.detectedFrameworks?.length || 0}
                      </p>
                    </Card>
                    <Card className="p-3 border-gray-200">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        <span className="text-xs text-gray-600">Critical</span>
                      </div>
                      <p className="text-xl font-bold text-gray-900">
                        {complianceReport?.criticalIssues || 0}
                      </p>
                    </Card>
                    <Card className="p-3 border-gray-200">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertCircle className="w-4 h-4 text-orange-600" />
                        <span className="text-xs text-gray-600">High Priority</span>
                      </div>
                      <p className="text-xl font-bold text-gray-900">
                        {complianceReport?.highPriorityIssues || 0}
                      </p>
                    </Card>
                    <Card className="p-3 border-gray-200">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="w-4 h-4 text-purple-600" />
                        <span className="text-xs text-gray-600">Timeline</span>
                      </div>
                      <p className="text-sm font-bold text-gray-900">
                        {complianceReport?.estimatedRemediationEffort?.timeline}
                      </p>
                    </Card>
                    <Card className="p-3 border-gray-200">
                      <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="w-4 h-4 text-green-600" />
                        <span className="text-xs text-gray-600">Est. Cost</span>
                      </div>
                      <p className="text-sm font-bold text-gray-900">
                        ${(complianceReport?.estimatedRemediationEffort?.totalCost / 1000).toFixed(0)}K
                      </p>
                    </Card>
                    <Card className="p-3 border-gray-200">
                      <div className="flex items-center gap-2 mb-1">
                        <Timer className="w-4 h-4 text-indigo-600" />
                        <span className="text-xs text-gray-600">Effort</span>
                      </div>
                      <p className="text-sm font-bold text-gray-900">
                        {complianceReport?.estimatedRemediationEffort?.totalHours}h
                      </p>
                    </Card>
                  </div>

                  {/* Tabbed Content */}
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-6">
                      <TabsTrigger value="overview">Overview</TabsTrigger>
                      <TabsTrigger value="frameworks">Frameworks</TabsTrigger>
                      <TabsTrigger value="issues">Issues</TabsTrigger>
                      <TabsTrigger value="remediation">Remediation</TabsTrigger>
                      <TabsTrigger value="exposure">Risk Exposure</TabsTrigger>
                      <TabsTrigger value="recommendations">AI Insights</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="mt-6">
                      <div className="grid grid-cols-2 gap-6">
                        {/* Framework Compliance Scores */}
                        <Card className="p-4 border-gray-300">
                          <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <BarChart3 className="w-4 h-4" />
                            Framework Compliance
                          </h4>
                          <div className="space-y-3">
                            {complianceReport?.frameworkResults && 
                              Array.from(complianceReport.frameworkResults.entries()).map(([framework, result]: [string, any]) => {
                                const Icon = REGULATORY_FRAMEWORKS[framework as keyof typeof REGULATORY_FRAMEWORKS]?.icon || Shield;
                                return (
                                  <div key={framework} className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <Icon className="w-4 h-4 text-gray-600" />
                                        <span className="text-sm font-semibold text-gray-900">{framework}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold">{result.score}%</span>
                                        <Badge variant="outline" className={`text-xs ${getStatusColor(result.status)}`}>
                                          {result.status}
                                        </Badge>
                                      </div>
                                    </div>
                                    <Progress value={result.score} className="h-2" />
                                    <div className="flex gap-4 text-xs text-gray-500">
                                      <span>✓ {result.compliantCount} Compliant</span>
                                      <span>⚠ {result.partialCount} Partial</span>
                                      <span>✗ {result.missingCount} Missing</span>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </Card>

                        {/* Compliance Status Distribution */}
                        <Card className="p-4 border-gray-300">
                          <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <PieChart className="w-4 h-4" />
                            Issue Distribution
                          </h4>
                          <div className="space-y-4">
                            {complianceReport?.remediationTimeline?.map((phase: any, i: number) => (
                              <div key={i} className="p-3 bg-gray-50 border border-gray-200 rounded">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-semibold text-gray-900">{phase.phase}</span>
                                  <Badge className={getSeverityColor(phase.priority)}>
                                    {phase.items.length} items
                                  </Badge>
                                </div>
                                <div className="space-y-1">
                                  {phase.items.slice(0, 2).map((item: any, j: number) => (
                                    <p key={j} className="text-xs text-gray-600">
                                      • {item.framework}: {item.requirement}
                                    </p>
                                  ))}
                                  {phase.items.length > 2 && (
                                    <p className="text-xs text-gray-500">
                                      +{phase.items.length - 2} more items
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </Card>
                      </div>
                    </TabsContent>

                    <TabsContent value="frameworks" className="mt-6">
                      <div className="space-y-4">
                        {complianceReport?.frameworkResults && 
                          Array.from(complianceReport.frameworkResults.entries()).map(([framework, result]: [string, any]) => {
                            const frameworkData = REGULATORY_FRAMEWORKS[framework as keyof typeof REGULATORY_FRAMEWORKS];
                            const Icon = frameworkData?.icon || Shield;
                            
                            return (
                              <Card key={framework} className="border-gray-300">
                                <div 
                                  className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                                  onClick={() => toggleSection(framework)}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <Icon className="w-5 h-5 text-gray-700" />
                                      <div>
                                        <h4 className="font-semibold text-gray-900">{frameworkData?.name}</h4>
                                        <p className="text-xs text-gray-600">Region: {frameworkData?.region}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <div className="text-right">
                                        <p className="text-2xl font-bold text-gray-900">{result.score}%</p>
                                        <Badge className={getStatusColor(result.status)}>
                                          {result.status?.toUpperCase()}
                                        </Badge>
                                      </div>
                                      {expandedSections.has(framework) ? 
                                        <ChevronUp className="w-4 h-4 text-gray-500" /> : 
                                        <ChevronDown className="w-4 h-4 text-gray-500" />
                                      }
                                    </div>
                                  </div>
                                </div>
                                
                                {expandedSections.has(framework) && (
                                  <div className="p-4 border-t border-gray-200">
                                    <div className="grid grid-cols-2 gap-4">
                                      {result.requirements?.map((req: any) => (
                                        <div key={req.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                          <span className="text-sm text-gray-700">{req.name}</span>
                                          <div className="flex items-center gap-2">
                                            {req.status === 'compliant' && <CheckCircle className="w-4 h-4 text-green-600" />}
                                            {req.status === 'partial' && <AlertCircle className="w-4 h-4 text-yellow-600" />}
                                            {req.status === 'missing' && <XCircle className="w-4 h-4 text-red-600" />}
                                            <span className="text-xs text-gray-500">{req.score}/{req.weight}</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </Card>
                            );
                          })}
                      </div>
                    </TabsContent>

                    <TabsContent value="issues" className="mt-6">
                      {/* Issue Filters */}
                      <div className="flex items-center gap-4 mb-4">
                        <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Severities</SelectItem>
                            <SelectItem value="critical">Critical Only</SelectItem>
                            <SelectItem value="high">High & Above</SelectItem>
                            <SelectItem value="medium">Medium & Above</SelectItem>
                          </SelectContent>
                        </Select>
                        <Badge variant="outline">
                          {complianceReport?.issues?.length || 0} Total Issues
                        </Badge>
                      </div>

                      <div className="space-y-3">
                        {complianceReport?.issues
                          ?.filter((issue: any) => {
                            if (filterSeverity === 'all') return true;
                            if (filterSeverity === 'critical') return issue.severity === 'critical';
                            if (filterSeverity === 'high') return ['critical', 'high'].includes(issue.severity);
                            if (filterSeverity === 'medium') return ['critical', 'high', 'medium'].includes(issue.severity);
                            return true;
                          })
                          .map((issue: any) => (
                            <Card key={issue.id} className="p-4 border-gray-300">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-start gap-3">
                                  <AlertOctagon className={`w-5 h-5 flex-shrink-0 ${
                                    issue.severity === 'critical' ? 'text-red-600' :
                                    issue.severity === 'high' ? 'text-orange-600' :
                                    issue.severity === 'medium' ? 'text-yellow-600' :
                                    'text-blue-600'
                                  }`} />
                                  <div>
                                    <h5 className="font-semibold text-gray-900">{issue.requirement}</h5>
                                    <p className="text-sm text-gray-600 mt-1">{issue.description}</p>
                                    <p className="text-xs text-gray-500 mt-2">
                                      <span className="font-semibold">Impact:</span> {issue.impact}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge className={getSeverityColor(issue.severity)}>
                                    {issue.severity}
                                  </Badge>
                                  <Badge variant="outline">
                                    {issue.framework}
                                  </Badge>
                                </div>
                              </div>
                              <div className="mt-3 p-2 bg-gray-50 border border-gray-200 rounded">
                                <p className="text-xs text-gray-700">
                                  <span className="font-semibold">Remediation:</span> {issue.remediation}
                                </p>
                              </div>
                            </Card>
                          ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="remediation" className="mt-6">
                      <div className="grid grid-cols-2 gap-6">
                        {/* Remediation Timeline */}
                        <Card className="p-4 border-gray-300">
                          <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Remediation Timeline
                          </h4>
                          <div className="space-y-3">
                            {complianceReport?.remediationTimeline?.map((phase: any, i: number) => (
                              <div key={i} className="relative">
                                {i < complianceReport.remediationTimeline.length - 1 && (
                                  <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-gray-300" />
                                )}
                                <div className="flex gap-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                    phase.priority === 'critical' ? 'bg-red-100' :
                                    phase.priority === 'high' ? 'bg-orange-100' :
                                    phase.priority === 'medium' ? 'bg-yellow-100' :
                                    'bg-blue-100'
                                  }`}>
                                    <span className="text-xs font-bold">{i + 1}</span>
                                  </div>
                                  <div className="flex-1 pb-4">
                                    <h5 className="font-semibold text-sm text-gray-900">{phase.phase}</h5>
                                    <p className="text-xs text-gray-600 mt-1">{phase.items.length} actions required</p>
                                    <div className="mt-2 space-y-1">
                                      {phase.items.slice(0, 2).map((item: any, j: number) => (
                                        <p key={j} className="text-xs text-gray-500">
                                          • {item.requirement}
                                        </p>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </Card>

                        {/* Remediation Resources */}
                        <Card className="p-4 border-gray-300">
                          <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Target className="w-4 h-4" />
                            Resource Requirements
                          </h4>
                          <div className="space-y-4">
                            <div className="p-3 bg-gray-50 border border-gray-200 rounded">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-semibold text-gray-900">Effort Estimate</span>
                                <Badge variant="outline">
                                  {complianceReport?.estimatedRemediationEffort?.totalHours} hours
                                </Badge>
                              </div>
                              <Progress value={65} className="h-2" />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                              <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                                <Clock className="w-4 h-4 text-blue-600 mb-1" />
                                <p className="text-xs font-semibold text-blue-900">Timeline</p>
                                <p className="text-sm text-blue-700">
                                  {complianceReport?.estimatedRemediationEffort?.timeline}
                                </p>
                              </div>
                              <div className="p-3 bg-green-50 border border-green-200 rounded">
                                <Users className="w-4 h-4 text-green-600 mb-1" />
                                <p className="text-xs font-semibold text-green-900">Resources</p>
                                <p className="text-sm text-green-700">
                                  {complianceReport?.estimatedRemediationEffort?.resources}
                                </p>
                              </div>
                            </div>
                            
                            <div className="p-3 bg-purple-50 border border-purple-200 rounded">
                              <DollarSign className="w-4 h-4 text-purple-600 mb-1" />
                              <p className="text-xs font-semibold text-purple-900">Estimated Cost</p>
                              <p className="text-2xl font-bold text-purple-700">
                                ${(complianceReport?.estimatedRemediationEffort?.totalCost / 1000).toFixed(0)}K
                              </p>
                              <p className="text-xs text-purple-600 mt-1">
                                Based on $150/hour compliance consultant rate
                              </p>
                            </div>
                          </div>
                        </Card>
                      </div>
                    </TabsContent>

                    <TabsContent value="exposure" className="mt-6">
                      <Card className="p-6 border-gray-300">
                        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <ShieldAlert className="w-4 h-4" />
                          Regulatory Exposure Analysis
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
                                  <Eye className="w-4 h-4 mr-2" />
                                  View Full Risk Analysis
                                </Button>
                              </div>
                            </div>
                            <div className="opacity-50 pointer-events-none">
                              <div className="grid grid-cols-3 gap-4">
                                <div className="p-4 bg-red-50 border border-red-200 rounded">
                                  <h5 className="font-semibold text-red-900 mb-2">GDPR</h5>
                                  <p className="text-sm text-red-700">Max Fine: €20M or 4% revenue</p>
                                  <p className="text-xs text-red-600">Likelihood: Medium</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                              {Object.entries(complianceReport?.regulatoryExposure || {}).map(([framework, exposure]: [string, any]) => (
                                <div key={framework} className={`p-4 border rounded ${
                                  exposure.likelihood === 'high' ? 'bg-red-50 border-red-200' :
                                  exposure.likelihood === 'medium' ? 'bg-yellow-50 border-yellow-200' :
                                  'bg-green-50 border-green-200'
                                }`}>
                                  <h5 className="font-semibold text-gray-900 mb-2">{framework}</h5>
                                  <p className="text-sm text-gray-700 mb-1">
                                    <span className="font-semibold">Max Fine:</span> {exposure.maxFine}
                                  </p>
                                  <p className="text-sm text-gray-700">
                                    <span className="font-semibold">Likelihood:</span> {exposure.likelihood}
                                  </p>
                                  <div className="mt-2">
                                    <Progress 
                                      value={exposure.likelihood === 'high' ? 75 : exposure.likelihood === 'medium' ? 50 : 25} 
                                      className="h-1"
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                            
                            <Alert className="border-orange-200 bg-orange-50">
                              <AlertTriangle className="w-4 h-4 text-orange-600" />
                              <div>
                                <p className="font-semibold text-orange-900">Risk Mitigation Priority</p>
                                <p className="text-sm text-orange-700 mt-1">
                                  Focus on critical GDPR gaps first to minimize exposure to significant fines. 
                                  Implement automated monitoring to maintain ongoing compliance.
                                </p>
                              </div>
                            </Alert>
                          </div>
                        )}
                      </Card>
                    </TabsContent>

                    <TabsContent value="recommendations" className="mt-6">
                      <div className="space-y-4">
                        {analyzer?.generateAIRecommendations().map((rec: any, i: number) => (
                          <Card key={i} className="p-4 border-gray-300">
                            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                              <Sparkles className="w-4 h-4" />
                              {rec.title}
                            </h4>
                            <p className="text-sm text-gray-600 mb-3">{rec.description}</p>
                            <div className="space-y-2">
                              {rec.items?.map((item: any, j: number) => (
                                <div key={j} className="p-3 bg-gray-50 border border-gray-200 rounded">
                                  <p className="text-sm font-semibold text-gray-900">{item.action}</p>
                                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-600">
                                    <span>Impact: {item.impact}</span>
                                    <span>Effort: {item.effort}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </Card>
                        ))}
                        
                        <Card className="p-4 border-gray-300 bg-gradient-to-r from-blue-50 to-purple-50">
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Brain className="w-4 h-4" />
                            AI-Powered Continuous Monitoring
                          </h4>
                          <p className="text-sm text-gray-700 mb-3">
                            Enable real-time compliance monitoring to automatically detect and alert on regulatory changes
                          </p>
                          <Button className="bg-gray-900 hover:bg-gray-800 text-white">
                            <Bell className="w-4 h-4 mr-2" />
                            Set Up Monitoring
                          </Button>
                        </Card>
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className="mt-6 flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Powered by AI compliance engine • {complianceReport?.detectedFrameworks?.length} frameworks analyzed
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Download className="w-3 h-3 mr-1" />
                        Export Report
                      </Button>
                      <Button className="bg-gray-900 hover:bg-gray-800 text-white" size="sm">
                        Implement Remediation
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
        unlockDemo('compliance-monitoring');
        setShowPaymentModal(false);
      }}
      demoName="Compliance Monitoring"
    />
    </Fragment>
  );
}

// Add Alert component if not imported
const Alert = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={`flex gap-3 p-4 rounded-lg border ${className}`}>
    {children}
  </div>
);
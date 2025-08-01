"use client";

import React, { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Info,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  FileText,
  Sparkles,
  TrendingUp,
  Copy,
  Download,
  Eye,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { toast } from 'sonner';

interface Clause {
  id: string;
  type: string;
  content: string;
  riskLevel: 'high' | 'medium' | 'low';
  confidence: number;
  suggestions?: string[];
  similarClauses?: {
    id: string;
    contractId: string;
    contractTitle: string;
    similarity: number;
  }[];
  category?: string;
  extractedTerms?: string[];
}

interface ClauseAnalysisProps {
  contractId: string;
  clauses: Clause[];
  analysisStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  onReanalyze?: () => void;
  isReanalyzing?: boolean;
}

export function ClauseAnalysis({
  contractId,
  clauses,
  analysisStatus = 'completed',
  onReanalyze,
  isReanalyzing = false,
}: ClauseAnalysisProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedClauses, setExpandedClauses] = useState<Set<string>>(new Set());
  const [feedbackGiven, setFeedbackGiven] = useState<Set<string>>(new Set());

  // Extract unique categories from clauses
  const categories = useMemo(() => {
    const cats = new Set<string>();
    clauses.forEach(clause => {
      if (clause.category) cats.add(clause.category);
    });
    return Array.from(cats);
  }, [clauses]);

  // Filter clauses based on search and filters
  const filteredClauses = useMemo(() => {
    return clauses.filter(clause => {
      const matchesSearch = !searchQuery || 
        clause.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        clause.type.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesRisk = selectedRiskLevel === 'all' || clause.riskLevel === selectedRiskLevel;
      const matchesCategory = selectedCategory === 'all' || clause.category === selectedCategory;
      
      return matchesSearch && matchesRisk && matchesCategory;
    });
  }, [clauses, searchQuery, selectedRiskLevel, selectedCategory]);

  // Calculate risk statistics
  const riskStats = useMemo(() => {
    const stats = {
      high: 0,
      medium: 0,
      low: 0,
      total: clauses.length,
    };
    
    clauses.forEach(clause => {
      stats[clause.riskLevel]++;
    });
    
    return stats;
  }, [clauses]);

  const toggleClauseExpansion = (clauseId: string) => {
    setExpandedClauses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(clauseId)) {
        newSet.delete(clauseId);
      } else {
        newSet.add(clauseId);
      }
      return newSet;
    });
  };

  const handleFeedback = (clauseId: string, isPositive: boolean) => {
    setFeedbackGiven(prev => new Set(prev).add(clauseId));
    toast.success(`Feedback recorded. Thank you for helping improve our AI!`);
  };

  const handleCopyClause = (clause: Clause) => {
    navigator.clipboard.writeText(clause.content);
    toast.success('Clause copied to clipboard');
  };

  const handleExportAnalysis = () => {
    // In a real implementation, this would generate a PDF or CSV
    toast.info('Export feature coming soon');
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'high':
        return <AlertTriangle className="h-4 w-4" />;
      case 'medium':
        return <Info className="h-4 w-4" />;
      case 'low':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (analysisStatus === 'pending' || analysisStatus === 'processing') {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Sparkles className="h-12 w-12 text-muted-foreground animate-pulse mb-4" />
          <p className="text-lg font-medium mb-2">AI Analysis in Progress</p>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Our AI is analyzing contract clauses for risks, obligations, and opportunities.
            This typically takes 1-2 minutes.
          </p>
          <Progress value={33} className="w-full max-w-xs mt-4" />
        </CardContent>
      </Card>
    );
  }

  if (analysisStatus === 'failed') {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Analysis Failed</AlertTitle>
        <AlertDescription>
          We encountered an error while analyzing this contract. Please try again.
          {onReanalyze && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={onReanalyze}
              disabled={isReanalyzing}
            >
              Retry Analysis
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                AI Clause Analysis
              </CardTitle>
              <CardDescription>
                Intelligent extraction and risk assessment of contract clauses
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportAnalysis}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              {onReanalyze && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onReanalyze}
                  disabled={isReanalyzing}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Re-analyze
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Risk Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Clauses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{riskStats.total}</div>
          </CardContent>
        </Card>
        
        <Card className="border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">
              High Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{riskStats.high}</div>
            <Progress value={(riskStats.high / riskStats.total) * 100} className="mt-2" />
          </CardContent>
        </Card>
        
        <Card className="border-yellow-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600">
              Medium Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{riskStats.medium}</div>
            <Progress value={(riskStats.medium / riskStats.total) * 100} className="mt-2" />
          </CardContent>
        </Card>
        
        <Card className="border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">
              Low Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{riskStats.low}</div>
            <Progress value={(riskStats.low / riskStats.total) * 100} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filter Clauses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search clauses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedRiskLevel} onValueChange={setSelectedRiskLevel}>
              <SelectTrigger className="w-full md:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Risk Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risk Levels</SelectItem>
                <SelectItem value="high">High Risk</SelectItem>
                <SelectItem value="medium">Medium Risk</SelectItem>
                <SelectItem value="low">Low Risk</SelectItem>
              </SelectContent>
            </Select>
            
            {categories.length > 0 && (
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Clauses List */}
      <div className="space-y-4">
        {filteredClauses.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                No clauses found matching your filters.
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredClauses.map((clause) => (
            <Card
              key={clause.id}
              className={`border ${getRiskColor(clause.riskLevel)} transition-all`}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      {getRiskIcon(clause.riskLevel)}
                      {clause.type}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={getRiskColor(clause.riskLevel)}>
                        {clause.riskLevel} risk
                      </Badge>
                      <Badge variant="outline">
                        {Math.round(clause.confidence * 100)}% confidence
                      </Badge>
                      {clause.category && (
                        <Badge variant="secondary">{clause.category}</Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleClauseExpansion(clause.id)}
                  >
                    {expandedClauses.has(clause.id) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-4">{clause.content}</p>
                
                <Collapsible open={expandedClauses.has(clause.id)}>
                  <CollapsibleContent className="space-y-4">
                    {/* Suggestions */}
                    {clause.suggestions && clause.suggestions.length > 0 && (
                      <div className="pt-4 border-t">
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          AI Suggestions
                        </h4>
                        <ul className="space-y-1">
                          {clause.suggestions.map((suggestion, idx) => (
                            <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-primary">•</span>
                              {suggestion}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* Similar Clauses */}
                    {clause.similarClauses && clause.similarClauses.length > 0 && (
                      <div className="pt-4 border-t">
                        <h4 className="text-sm font-medium mb-2">Similar Clauses in Other Contracts</h4>
                        <div className="space-y-2">
                          {clause.similarClauses.map((similar) => (
                            <div
                              key={similar.id}
                              className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                            >
                              <div className="text-sm">
                                <p className="font-medium">{similar.contractTitle}</p>
                                <p className="text-muted-foreground">
                                  {Math.round(similar.similarity * 100)}% similar
                                </p>
                              </div>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Extracted Terms */}
                    {clause.extractedTerms && clause.extractedTerms.length > 0 && (
                      <div className="pt-4 border-t">
                        <h4 className="text-sm font-medium mb-2">Key Terms</h4>
                        <div className="flex flex-wrap gap-2">
                          {clause.extractedTerms.map((term, idx) => (
                            <Badge key={idx} variant="outline">
                              {term}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Actions */}
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="flex gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopyClause(clause)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Copy clause</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      
                      {!feedbackGiven.has(clause.id) && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Was this helpful?</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleFeedback(clause.id, true)}
                          >
                            <ThumbsUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleFeedback(clause.id, false)}
                          >
                            <ThumbsDown className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
'use client';

import React, { useState, useCallback } from 'react';
// import { useQuery, useMutation } from 'convex/react';
// import { api } from '../../../../convex/_generated/api';
// import { Id } from '../../../../convex/_generated/dataModel';
import { 
  Search, 
  FileText, 
  AlertCircle, 
  Loader2,
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { useDebounce } from '@/hooks/useDebounce';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { trackBusinessMetric } from '@/lib/metrics';
import { useWebWorker } from '@/hooks/useWebWorker';

interface SimilarClause {
  id: string;
  contractId: Id<"contracts">;
  contractTitle: string;
  clauseText: string;
  clauseType: string;
  similarity: number;
  riskLevel?: 'high' | 'medium' | 'low';
  metadata?: {
    contractStatus?: string;
    contractDate?: string;
    vendorName?: string;
  };
}

interface SimilaritySearchProps {
  contractId?: Id<"contracts">;
  initialClauseText?: string;
  onSelectClause?: (clause: SimilarClause) => void;
  className?: string;
}

export const SimilaritySearch: React.FC<SimilaritySearchProps> = ({
  contractId,
  initialClauseText = '',
  onSelectClause,
  className
}) => {
  const [searchText, setSearchText] = useState(initialClauseText);
  const [clauseType, setClauseType] = useState<string>('all');
  const [similarityThreshold, setSimilarityThreshold] = useState([0.7]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SimilarClause[]>([]);
  const [expandedClauses, setExpandedClauses] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  const debouncedSearchText = useDebounce(searchText, 500);
  
  // Initialize similarity Web Worker
  const similarityWorker = useWebWorker('/workers/similarity.worker.js', {
    timeout: 30000,
    onProgress: (progress) => {
      logger.info('Similarity search progress', progress);
    }
  });
  
  // Mock search mutation - replace with actual Convex mutation
  // const searchSimilarClauses = useMutation(api.ai.searchSimilarClauses);
  const searchSimilarClauses = () => Promise.resolve(); // TODO: Replace with actual mutation

  const handleSearch = useCallback(async () => {
    if (!debouncedSearchText.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const startTime = performance.now();

    try {
      // First get the search results with embeddings from the API
      const results = await searchSimilarClauses({
        searchText: debouncedSearchText,
        clauseType: clauseType !== 'all' ? clauseType : undefined,
        similarityThreshold: similarityThreshold[0],
        excludeContractId: contractId,
        limit: 50, // Get more for Web Worker processing
        includeEmbeddings: true
      });

      // If we have embeddings, use Web Worker for advanced similarity calculations
      if (results && results.length > 0 && results[0].embedding) {
        const workerResults = await similarityWorker.postMessage('BATCH_SIMILARITY', {
          targetVector: results[0].queryEmbedding,
          vectorDatabase: results.map(r => ({
            ...r,
            vector: r.embedding
          })),
          options: {
            threshold: similarityThreshold[0],
            topK: 20,
            includeScores: true
          }
        });

        // Update results with Web Worker calculations
        setSearchResults(workerResults as SimilarClause[]);
        logger.info('Web Worker similarity calculations complete', { count: workerResults.length });
      } else {
        // Fallback to regular results
        setSearchResults(results as SimilarClause[]);
      }
      
      const duration = performance.now() - startTime;
      trackBusinessMetric.aiAgentExecution('similarity-search', duration, true);
      
      logger.info('Similarity search completed', {
        resultsCount: results.length,
        duration,
        threshold: similarityThreshold[0]
      });
    } catch (error) {
      logger.error('Similarity search failed', error as Error);
      trackBusinessMetric.aiAgentExecution('similarity-search', performance.now() - startTime, false);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [debouncedSearchText, clauseType, similarityThreshold, contractId, similarityWorker]);

  React.useEffect(() => {
    handleSearch();
  }, [debouncedSearchText, clauseType, similarityThreshold, handleSearch]);

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

  const getRiskBadgeVariant = (riskLevel?: string) => {
    switch (riskLevel) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'default';
    }
  };

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 0.9) return 'text-green-600';
    if (similarity >= 0.8) return 'text-blue-600';
    if (similarity >= 0.7) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const clauseTypes = [
    { value: 'all', label: 'All Types' },
    { value: 'payment', label: 'Payment Terms' },
    { value: 'liability', label: 'Liability' },
    { value: 'termination', label: 'Termination' },
    { value: 'confidentiality', label: 'Confidentiality' },
    { value: 'warranty', label: 'Warranty' },
    { value: 'indemnification', label: 'Indemnification' },
    { value: 'ip', label: 'Intellectual Property' },
    { value: 'other', label: 'Other' }
  ];

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Similarity Search
        </CardTitle>
        <CardDescription>
          Find similar clauses across your contract repository
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Input */}
        <div className="space-y-2">
          <Label htmlFor="clause-search">Clause Text</Label>
          <Textarea
            id="clause-search"
            placeholder="Enter clause text to find similar clauses..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="min-h-[100px] resize-none"
          />
        </div>

        {/* Filters */}
        <div className="space-y-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="w-full justify-between"
          >
            <span className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Advanced Filters
            </span>
            {showFilters ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>

          {showFilters && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              {/* Clause Type Filter */}
              <div className="space-y-2">
                <Label htmlFor="clause-type">Clause Type</Label>
                <Select value={clauseType} onValueChange={setClauseType}>
                  <SelectTrigger id="clause-type">
                    <SelectValue placeholder="Select clause type" />
                  </SelectTrigger>
                  <SelectContent>
                    {clauseTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Similarity Threshold */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="similarity-threshold">
                    Similarity Threshold
                  </Label>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(similarityThreshold[0] * 100)}%
                  </span>
                </div>
                <Slider
                  id="similarity-threshold"
                  min={0.5}
                  max={1}
                  step={0.05}
                  value={similarityThreshold}
                  onValueChange={setSimilarityThreshold}
                  className="w-full"
                />
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="space-y-4">
          {isSearching ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Searching...</span>
            </div>
          ) : searchResults.length > 0 ? (
            <>
              <div className="text-sm text-muted-foreground">
                Found {searchResults.length} similar clause{searchResults.length !== 1 ? 's' : ''}
              </div>
              <div className="space-y-3">
                {searchResults.map((result) => {
                  const isExpanded = expandedClauses.has(result.id);
                  
                  return (
                    <Card 
                      key={result.id} 
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => onSelectClause?.(result)}
                    >
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          {/* Header */}
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium text-sm">
                                  {result.contractTitle}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {result.metadata?.vendorName && (
                                  <span>{result.metadata.vendorName}</span>
                                )}
                                {result.metadata?.contractDate && (
                                  <>
                                    <span>•</span>
                                    <span>{new Date(result.metadata.contractDate).toLocaleDateString()}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant="outline"
                                className={cn(
                                  "text-xs",
                                  getSimilarityColor(result.similarity)
                                )}
                              >
                                {Math.round(result.similarity * 100)}% match
                              </Badge>
                              {result.riskLevel && (
                                <Badge variant={getRiskBadgeVariant(result.riskLevel)}>
                                  {result.riskLevel} risk
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Clause Text */}
                          <div 
                            className="space-y-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleClauseExpansion(result.id);
                            }}
                          >
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <span className="font-medium">{result.clauseType}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-4 w-4 p-0"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="h-3 w-3" />
                                ) : (
                                  <ChevronDown className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                            <p className={cn(
                              "text-sm text-muted-foreground",
                              !isExpanded && "line-clamp-2"
                            )}>
                              {result.clauseText}
                            </p>
                          </div>

                          {/* Actions */}
                          {isExpanded && (
                            <div className="flex items-center gap-2 pt-2 border-t">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(result.clauseText);
                                }}
                              >
                                <Copy className="h-3 w-3 mr-1" />
                                Copy
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Navigate to contract
                                  window.open(`/dashboard/contracts/${result.contractId}`, '_blank');
                                }}
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                View Contract
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          ) : searchText.trim() ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No similar clauses found. Try adjusting your search criteria or lowering the similarity threshold.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Enter clause text to search for similar clauses</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
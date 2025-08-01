'use client';

import React, { useState, useMemo } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  Search, 
  FileText, 
  Building, 
  Users, 
  TrendingUp, 
  Calendar,
  DollarSign,
  Clock,
  ExternalLink,
  Star,
  Bookmark,
  Eye,
  MoreHorizontal,
  Filter,
  Grid,
  List,
  SortAsc,
  SortDesc,
  ArrowRight,
  Tag,
  MapPin,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

// Search result interface (reusing from GlobalSearch)
export interface SearchResult {
  id: string;
  type: 'contract' | 'vendor' | 'user' | 'workflow' | 'document';
  title: string;
  description?: string;
  metadata?: Record<string, any>;
  score: number; // relevance score
  url?: string;
  entityId?: string;
  timestamp?: Date;
  status?: string;
  category?: string;
  tags?: string[];
  assignedTo?: {
    id: string;
    name: string;
    avatar?: string;
  }[];
  value?: number;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  progress?: number;
}

// Search filters
export interface SearchFilters {
  types: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  status?: string[];
  category?: string[];
  assignedTo?: string[];
  tags?: string[];
}

// Search results props
export interface SearchResultsProps {
  results: SearchResult[];
  query: string;
  totalResults?: number;
  isLoading?: boolean;
  filters?: SearchFilters;
  onFilterChange?: (filters: SearchFilters) => void;
  onResultClick?: (result: SearchResult) => void;
  onBookmark?: (resultId: string) => void;
  onShare?: (result: SearchResult) => void;
  variant?: 'grid' | 'list' | 'compact';
  showFilters?: boolean;
  showSorting?: boolean;
  className?: string;
}

// Mock data for demonstration
const mockSearchResults: SearchResult[] = [
  {
    id: '1',
    type: 'contract',
    title: 'Microsoft Enterprise License Agreement',
    description: 'Annual software licensing contract for Microsoft 365 Enterprise suite including Teams, SharePoint, and advanced security features',
    score: 0.95,
    status: 'active',
    category: 'software',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    url: '/dashboard/contracts/1',
    value: 150000,
    tags: ['enterprise', 'software', 'annual'],
    assignedTo: [
      { id: '1', name: 'Sarah Johnson' },
      { id: '2', name: 'Mike Chen' }
    ],
    metadata: {
      vendor: 'Microsoft Corporation',
      renewalDate: '2024-12-31',
      department: 'IT'
    }
  },
  {
    id: '2',
    type: 'vendor',
    title: 'TechCorp Solutions Inc.',
    description: 'Full-service IT consulting and software development vendor specializing in cloud infrastructure and enterprise applications',
    score: 0.87,
    status: 'active',
    category: 'technology',
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    url: '/dashboard/vendors/2',
    tags: ['technology', 'consulting', 'cloud'],
    metadata: {
      riskLevel: 'low',
      complianceScore: 92,
      totalSpend: 75000,
      location: 'San Francisco, CA'
    }
  },
  {
    id: '3',
    type: 'workflow',
    title: 'Contract Approval Process - High Value',
    description: 'Multi-stage approval workflow for contracts exceeding $50,000 requiring legal, financial, and executive approval',
    score: 0.76,
    status: 'running',
    category: 'approval',
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
    url: '/dashboard/workflows/3',
    progress: 65,
    tags: ['approval', 'high-value', 'multi-stage'],
    assignedTo: [
      { id: '3', name: 'Legal Team' }
    ]
  },
  {
    id: '4',
    type: 'document',
    title: 'Q4 Vendor Performance Report',
    description: 'Comprehensive quarterly analysis of vendor performance metrics, compliance scores, and cost optimization opportunities',
    score: 0.68,
    status: 'final',
    category: 'report',
    timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    url: '/documents/4',
    tags: ['report', 'quarterly', 'performance'],
    metadata: {
      fileType: 'PDF',
      size: '2.4 MB',
      department: 'Procurement'
    }
  }
];

// Type icons mapping
const getTypeIcon = (type: string) => {
  switch (type) {
    case 'contract':
      return FileText;
    case 'vendor':
      return Building;
    case 'user':
      return Users;
    case 'workflow':
      return TrendingUp;
    case 'document':
      return FileText;
    default:
      return FileText;
  }
};

// Status colors
const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
    case 'running':
    case 'approved':
      return 'bg-green-100 text-green-800';
    case 'pending':
    case 'review':
      return 'bg-yellow-100 text-yellow-800';
    case 'inactive':
    case 'expired':
    case 'rejected':
      return 'bg-red-100 text-red-800';
    case 'draft':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-blue-100 text-blue-800';
  }
};

export const SearchResults: React.FC<SearchResultsProps> = ({
  results: initialResults = mockSearchResults,
  query,
  totalResults,
  isLoading = false,
  filters = { types: [] },
  onFilterChange,
  onResultClick,
  onBookmark,
  onShare,
  variant = 'list',
  showFilters = true,
  showSorting = true,
  className
}) => {
  // State
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'title' | 'value'>('relevance');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(filters.types);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'compact'>(variant);

  // Filter and sort results
  const results = useMemo(() => {
    let filtered = initialResults;

    // Apply type filter
    if (selectedTypes.length > 0) {
      filtered = filtered.filter(result => selectedTypes.includes(result.type));
    }

    // Sort results
    filtered.sort((a, b) => {
      let aValue: string | number, bValue: string | number;
      
      switch (sortBy) {
        case 'relevance':
          aValue = a.score;
          bValue = b.score;
          break;
        case 'date':
          aValue = a.timestamp?.getTime() || 0;
          bValue = b.timestamp?.getTime() || 0;
          break;
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'value':
          aValue = a.value || 0;
          bValue = b.value || 0;
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string') {
        return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return filtered;
  }, [initialResults, selectedTypes, sortBy, sortDirection]);

  // Get unique types for filtering
  const availableTypes = useMemo(() => {
    const types = Array.from(new Set(initialResults.map(r => r.type)));
    return types.map(type => ({
      value: type,
      label: type.charAt(0).toUpperCase() + type.slice(1),
      count: initialResults.filter(r => r.type === type).length
    }));
  }, [initialResults]);

  // Handle result click
  const handleResultClick = (result: SearchResult) => {
    if (onResultClick) {
      onResultClick(result);
    } else if (result.url) {
      window.open(result.url, '_blank');
    }
  };

  // Result card component
  const ResultCard: React.FC<{ result: SearchResult; mode: 'grid' | 'list' | 'compact' }> = ({ result, mode }) => {
    const IconComponent = getTypeIcon(result.type);

    if (mode === 'compact') {
      return (
        <div 
          className="flex items-center gap-3 p-3 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => handleResultClick(result)}
        >
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
              <IconComponent className="h-4 w-4 text-primary" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-sm truncate">{result.title}</h3>
              <Badge variant="outline" className="text-xs">
                {result.type}
              </Badge>
              {result.status && (
                <Badge className={cn('text-xs', getStatusColor(result.status))}>
                  {result.status}
                </Badge>
              )}
            </div>
            {result.description && (
              <p className="text-xs text-muted-foreground line-clamp-1">
                {result.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {Math.round(result.score * 100)}% match
            </span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      );
    }

    if (mode === 'grid') {
      return (
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleResultClick(result)}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                  <IconComponent className="h-4 w-4 text-primary" />
                </div>
                <Badge variant="outline" className="text-xs">
                  {result.type}
                </Badge>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleResultClick(result)}>
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </DropdownMenuItem>
                  {onBookmark && (
                    <DropdownMenuItem onClick={() => onBookmark(result.id)}>
                      <Bookmark className="h-4 w-4 mr-2" />
                      Bookmark
                    </DropdownMenuItem>
                  )}
                  {onShare && (
                    <DropdownMenuItem onClick={() => onShare(result)}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Share
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            <CardTitle className="text-base line-clamp-2">{result.title}</CardTitle>
          </CardHeader>
          
          <CardContent className="pt-0">
            {result.description && (
              <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                {result.description}
              </p>
            )}
            
            <div className="space-y-2">
              {result.status && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Status:</span>
                  <Badge className={cn('text-xs', getStatusColor(result.status))}>
                    {result.status}
                  </Badge>
                </div>
              )}
              
              {result.progress !== undefined && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Progress:</span>
                    <span>{result.progress}%</span>
                  </div>
                  <Progress value={result.progress} className="h-1" />
                </div>
              )}
              
              {result.value && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Value:</span>
                  <span className="text-sm font-medium">${result.value.toLocaleString()}</span>
                </div>
              )}
              
              {result.timestamp && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(result.timestamp, { addSuffix: true })}
                </div>
              )}
            </div>
            
            {result.tags && result.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {result.tags.slice(0, 3).map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {result.tags.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{result.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      );
    }

    // List mode
    return (
      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleResultClick(result)}>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center">
                <IconComponent className="h-5 w-5 text-primary" />
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium line-clamp-1">{result.title}</h3>
                    <Badge variant="outline" className="text-xs">
                      {result.type}
                    </Badge>
                    {result.status && (
                      <Badge className={cn('text-xs', getStatusColor(result.status))}>
                        {result.status}
                      </Badge>
                    )}
                  </div>
                  
                  {result.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {result.description}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  <span className="text-xs text-muted-foreground">
                    {Math.round(result.score * 100)}% match
                  </span>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleResultClick(result)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </DropdownMenuItem>
                      {onBookmark && (
                        <DropdownMenuItem onClick={() => onBookmark(result.id)}>
                          <Bookmark className="h-4 w-4 mr-2" />
                          Bookmark
                        </DropdownMenuItem>
                      )}
                      {onShare && (
                        <DropdownMenuItem onClick={() => onShare(result)}>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Share
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm">
                  {result.assignedTo && result.assignedTo.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      <div className="flex gap-1">
                        {result.assignedTo.slice(0, 3).map(person => (
                          <Avatar key={person.id} className="h-5 w-5">
                            <AvatarImage src={person.avatar} />
                            <AvatarFallback className="text-xs">
                              {person.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {result.assignedTo.length > 3 && (
                          <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center">
                            <span className="text-xs">+{result.assignedTo.length - 3}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {result.value && (
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">${result.value.toLocaleString()}</span>
                    </div>
                  )}
                  
                  {result.progress !== undefined && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Progress:</span>
                      <Progress value={result.progress} className="h-1 w-16" />
                      <span className="text-xs text-muted-foreground">{result.progress}%</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {result.timestamp && formatDistanceToNow(result.timestamp, { addSuffix: true })}
                </div>
              </div>
              
              {result.tags && result.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {result.tags.slice(0, 5).map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {result.tags.length > 5 && (
                    <Badge variant="secondary" className="text-xs">
                      +{result.tags.length - 5}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Filter controls
  const FilterControls: React.FC = () => (
    <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Filters:</span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {availableTypes.map(type => (
          <Button
            key={type.value}
            variant={selectedTypes.includes(type.value) ? "default" : "outline"}
            size="sm"
            onClick={() => {
              const newTypes = selectedTypes.includes(type.value)
                ? selectedTypes.filter(t => t !== type.value)
                : [...selectedTypes, type.value];
              setSelectedTypes(newTypes);
            }}
          >
            {type.label}
            <Badge variant="secondary" className="ml-1 text-xs">
              {type.count}
            </Badge>
          </Button>
        ))}
      </div>
      
      {selectedTypes.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedTypes([])}
        >
          Clear
        </Button>
      )}
    </div>
  );

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Search Results</h2>
          <p className="text-muted-foreground">
            {isLoading ? 'Searching...' : (
              <>
                {results.length} of {totalResults || results.length} results
                {query && ` for "${query}"`}
              </>
            )}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center border rounded-lg">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-r-none"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-none"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'compact' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('compact')}
              className="rounded-l-none"
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
          
          {showSorting && (
            <>
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as 'relevance' | 'date' | 'title' | 'type')}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevance</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="value">Value</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
              >
                {sortDirection === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
              </Button>
            </>
          )}
        </div>
      </div>
      
      {/* Filters */}
      {showFilters && <FilterControls />}
      
      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Searching...</span>
        </div>
      )}
      
      {/* Results */}
      {!isLoading && (
        <>
          {results.length > 0 ? (
            <div className={cn(
              viewMode === 'grid' && 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',
              viewMode === 'list' && 'space-y-4',
              viewMode === 'compact' && 'space-y-2'
            )}>
              {results.map(result => (
                <ResultCard key={result.id} result={result} mode={viewMode} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">No results found</h3>
              <p className="text-muted-foreground">
                {query ? `No results found for "${query}"` : 'Try adjusting your search criteria'}
              </p>
              {selectedTypes.length > 0 && (
                <Button variant="outline" className="mt-4" onClick={() => setSelectedTypes([])}>
                  Clear filters
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SearchResults;
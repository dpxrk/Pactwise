'use client';

import { 
  Search, 
  X, 
  Clock, 
  FileText, 
  Building, 
  Users, 
  TrendingUp,
  Filter,
  ArrowRight,
  Star,
  History,
  Sparkles,
  Loader2,
  Command
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect, useCallback, useMemo } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Command as CommandPrimitive, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { VisuallyHidden } from '@/components/ui/visually-hidden';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import type { Id } from '@/types/id.types';

// Search result types
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
}

// Search suggestions
export interface SearchSuggestion {
  id: string;
  query: string;
  type: 'recent' | 'popular' | 'suggested';
  count?: number;
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
}

// Global search props
export interface GlobalSearchProps {
  variant?: 'commandBar' | 'overlay' | 'inline';
  placeholder?: string;
  showSuggestions?: boolean;
  showRecentSearches?: boolean;
  maxResults?: number;
  onResultSelect?: (result: SearchResult) => void;
  onSearch?: (query: string, filters?: SearchFilters) => void;
  className?: string;
}

// Mock search data for demonstration
const mockSearchResults: SearchResult[] = [
  {
    id: '1',
    type: 'contract',
    title: 'Microsoft Enterprise License Agreement',
    description: 'Annual software licensing contract for Microsoft 365 Enterprise',
    score: 0.95,
    status: 'active',
    category: 'software',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    url: '/dashboard/contracts/1'
  },
  {
    id: '2',
    type: 'vendor',
    title: 'TechCorp Solutions Inc.',
    description: 'IT services and software development vendor',
    score: 0.87,
    status: 'active',
    category: 'technology',
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    url: '/dashboard/vendors/2'
  },
  {
    id: '3',
    type: 'contract',
    title: 'Office Lease Agreement - Downtown Building',
    description: 'Commercial lease for main office space',
    score: 0.76,
    status: 'active',
    category: 'real_estate',
    timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    url: '/dashboard/contracts/3'
  }
];

const mockSuggestions: SearchSuggestion[] = [
  { id: '1', query: 'microsoft license', type: 'recent' },
  { id: '2', query: 'active contracts', type: 'popular', count: 45 },
  { id: '3', query: 'vendor performance', type: 'suggested' },
  { id: '4', query: 'expiring soon', type: 'popular', count: 23 }
];

// Debounce hook
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Main global search component
export const GlobalSearch: React.FC<GlobalSearchProps> = ({
  variant = 'commandBar',
  placeholder = 'Search contracts, vendors, documents...',
  showSuggestions = true,
  showRecentSearches = true,
  maxResults = 10,
  onResultSelect,
  onSearch,
  className
}) => {
  const router = useRouter();
  const { user, userProfile } = useAuth();
  
  // State
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>(mockSuggestions);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Debounced query for API calls
  const debouncedQuery = useDebounce(query, 300);

  // Enterprise ID from user profile
  const enterpriseId = userProfile?.enterprise_id;

  // Search function
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || !enterpriseId) {
      setResults([]);
      return;
    }

    setIsSearching(true);

    try {
      // In a real implementation, this would call your search API
      // For now, we'll filter mock data
      const filteredResults = mockSearchResults
        .filter(result => 
          result.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          result.description?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice(0, maxResults)
        .sort((a, b) => b.score - a.score);

      setResults(filteredResults);
      
      // Add to recent searches
      if (searchQuery.length > 2) {
        setRecentSearches(prev => {
          const updated = [searchQuery, ...prev.filter(s => s !== searchQuery)].slice(0, 5);
          localStorage.setItem('pactwise-recent-searches', JSON.stringify(updated));
          return updated;
        });
      }

      onSearch?.(searchQuery);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [enterpriseId, maxResults, onSearch]);

  // Effect to perform search when debounced query changes
  useEffect(() => {
    performSearch(debouncedQuery);
  }, [debouncedQuery, performSearch]);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('pactwise-recent-searches');
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to load recent searches:', error);
    }
  }, []);

  // Handle result selection
  const handleResultSelect = useCallback((result: SearchResult) => {
    if (onResultSelect) {
      onResultSelect(result);
    } else if (result.url) {
      router.push(result.url);
    }
    setIsOpen(false);
    setQuery('');
  }, [onResultSelect, router]);

  // Handle suggestion click
  const handleSuggestionClick = useCallback((suggestion: SearchSuggestion) => {
    setQuery(suggestion.query);
    performSearch(suggestion.query);
  }, [performSearch]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && results[selectedIndex]) {
          handleResultSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setQuery('');
        setSelectedIndex(-1);
        break;
    }
  }, [isOpen, results, selectedIndex, handleResultSelect]);

  // Global keyboard shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Get result icon
  const getResultIcon = (type: string) => {
    switch (type) {
      case 'contract':
        return FileText;
      case 'vendor':
        return Building;
      case 'user':
        return Users;
      case 'workflow':
        return TrendingUp;
      default:
        return FileText;
    }
  };

  // Result item component
  const SearchResultItem: React.FC<{ 
    result: SearchResult; 
    isSelected: boolean;
    onClick: () => void;
  }> = ({ result, isSelected, onClick }) => {
    const IconComponent = getResultIcon(result.type);

    return (
      <div
        className={cn(
          'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors',
          isSelected ? 'bg-muted' : 'hover:bg-muted/50'
        )}
        onClick={onClick}
      >
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
            <IconComponent className="h-4 w-4 text-primary" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-medium text-sm truncate">{result.title}</p>
            <Badge variant="outline" className="text-xs">
              {result.type}
            </Badge>
            {result.status && (
              <Badge variant="secondary" className="text-xs">
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

        <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      </div>
    );
  };

  // Command bar variant
  if (variant === 'commandBar') {
    return (
      <>
        <Button
          variant="outline"
          onClick={() => setIsOpen(true)}
          className={cn(
            'w-full max-w-md justify-start text-muted-foreground',
            className
          )}
        >
          <Search className="h-4 w-4 mr-2" />
          {placeholder}
          <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="p-0 max-w-2xl">
            <VisuallyHidden>
              <DialogTitle>Search</DialogTitle>
            </VisuallyHidden>
            <div className="flex items-center border-b px-4 py-3">
              <Search className="h-4 w-4 mr-2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="border-0 focus-visible:ring-0 flex-1"
                autoFocus
              />
              {isSearching && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {query.trim() === '' ? (
                // Show suggestions and recent searches
                <div className="p-4 space-y-4">
                  {showRecentSearches && recentSearches.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <History className="h-4 w-4" />
                        Recent Searches
                      </h4>
                      <div className="space-y-1">
                        {recentSearches.map((search, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                            onClick={() => handleSuggestionClick({ id: `recent-${index}`, query: search, type: 'recent' })}
                          >
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{search}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {showSuggestions && (
                    <div>
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        Suggestions
                      </h4>
                      <div className="space-y-1">
                        {suggestions.map(suggestion => (
                          <div
                            key={suggestion.id}
                            className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                            onClick={() => handleSuggestionClick(suggestion)}
                          >
                            <div className="flex items-center gap-2 flex-1">
                              {suggestion.type === 'popular' && <TrendingUp className="h-3 w-3 text-muted-foreground" />}
                              {suggestion.type === 'suggested' && <Star className="h-3 w-3 text-muted-foreground" />}
                              <span className="text-sm">{suggestion.query}</span>
                            </div>
                            {suggestion.count && (
                              <Badge variant="secondary" className="text-xs">
                                {suggestion.count}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // Show search results
                <div className="p-4">
                  {results.length > 0 ? (
                    <div className="space-y-2">
                      {results.map((result, index) => (
                        <SearchResultItem
                          key={result.id}
                          result={result}
                          isSelected={index === selectedIndex}
                          onClick={() => handleResultSelect(result)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      {isSearching ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm text-muted-foreground">Searching...</span>
                        </div>
                      ) : (
                        <div>
                          <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">
                            No results found for "{query}"
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t px-4 py-2 text-xs text-muted-foreground flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">↑↓</kbd>
                  <span>Navigate</span>
                </div>
                <div className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">Enter</kbd>
                  <span>Select</span>
                </div>
                <div className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">Esc</kbd>
                  <span>Close</span>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="h-6 text-xs">
                <Filter className="h-3 w-3 mr-1" />
                Advanced
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Inline variant
  if (variant === 'inline') {
    return (
      <div className={cn('relative', className)}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            className="pl-9"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>

        {isOpen && (query.trim() !== '' || showSuggestions) && (
          <Card className="absolute top-full left-0 right-0 z-50 mt-1 shadow-lg">
            <CardContent className="p-0 max-h-96 overflow-y-auto">
              {/* Results or suggestions go here - similar to command bar */}
              {query.trim() === '' ? (
                <div className="p-4">
                  <p className="text-sm text-muted-foreground">Start typing to search...</p>
                </div>
              ) : results.length > 0 ? (
                <div className="p-2">
                  {results.map(result => (
                    <SearchResultItem
                      key={result.id}
                      result={result}
                      isSelected={false}
                      onClick={() => handleResultSelect(result)}
                    />
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">No results found</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return null;
};

export default GlobalSearch;

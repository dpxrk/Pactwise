'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Search,
  Loader2,
  Sparkles,
  Check,
  AlertCircle,
  ChevronDown,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface HTSSuggestion {
  code: string;
  description: string;
  confidence?: number;
  method?: string;
}

interface HTSCodeSelectorProps {
  value: string | null | undefined;
  onChange: (code: string, description?: string) => void;
  itemName?: string;
  itemDescription?: string;
  originCountry?: string;
  confidence?: number;
  matchMethod?: string;
  disabled?: boolean;
  className?: string;
  onSuggestionApplied?: (suggestion: HTSSuggestion) => void;
}

/**
 * HTS Code Selector with AI-powered suggestions and search
 * Bloomberg Terminal aesthetic with dense information display
 */
export default function HTSCodeSelector({
  value,
  onChange,
  itemName,
  itemDescription,
  originCountry,
  confidence,
  matchMethod,
  disabled = false,
  className,
  onSuggestionApplied,
}: HTSCodeSelectorProps) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [searchResults, setSearchResults] = useState<HTSSuggestion[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<HTSSuggestion[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Search HTS codes as user types
  const handleSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      // Type assertion needed until database types are regenerated
      const { data, error } = await supabase.rpc('search_hts_codes_by_text', {
        p_query: query,
        p_limit: 10,
      } as Record<string, unknown>) as { data: Array<{ code: string; description: string }> | null; error: Error | null };

      if (error) throw error;

      setSearchResults(
        (data || []).map((item) => ({
          code: item.code,
          description: item.description,
        }))
      );
    } catch (error) {
      console.error('HTS search error:', error);
    } finally {
      setSearching(false);
    }
  }, [supabase]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      handleSearch(searchQuery);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery, handleSearch]);

  // Get AI suggestions for item
  const getAISuggestions = async () => {
    if (!itemName) {
      toast.error('Item name is required for AI suggestions');
      return;
    }

    setSuggesting(true);
    try {
      const session = await supabase.auth.getSession();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/hts-suggestion`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.data.session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            item_name: itemName,
            item_description: itemDescription,
            origin_country: originCountry,
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to get AI suggestions');

      const result = await response.json();

      if (result.data?.success) {
        const suggestions: HTSSuggestion[] = [];

        if (result.data.primary_code) {
          suggestions.push({
            code: result.data.primary_code,
            description: result.data.primary_description || '',
            confidence: result.data.confidence,
            method: result.data.fallback_used ? 'database' : 'ai',
          });
        }

        if (result.data.alternative_codes) {
          suggestions.push(
            ...result.data.alternative_codes.map((alt: { hts_code: string; description: string; confidence: number }) => ({
              code: alt.hts_code,
              description: alt.description,
              confidence: alt.confidence,
              method: 'ai_alternative',
            }))
          );
        }

        setAiSuggestions(suggestions);
        if (suggestions.length > 0) {
          toast.success(`Found ${suggestions.length} HTS suggestion${suggestions.length > 1 ? 's' : ''}`);
        } else {
          toast.info('No HTS suggestions found for this item');
        }
      } else {
        toast.error(result.data?.error || 'Failed to get suggestions');
      }
    } catch (error) {
      console.error('AI suggestion error:', error);
      toast.error('Failed to get AI suggestions');
    } finally {
      setSuggesting(false);
    }
  };

  const handleSelect = (suggestion: HTSSuggestion) => {
    onChange(suggestion.code, suggestion.description);
    onSuggestionApplied?.(suggestion);
    setOpen(false);
    setSearchQuery('');
  };

  const handleClear = () => {
    onChange('', undefined);
    setSearchQuery('');
  };

  const getConfidenceBadge = (conf?: number) => {
    if (!conf) return null;
    const percentage = Math.round(conf * 100);
    const color =
      percentage >= 80
        ? 'bg-green-50 text-green-700 border-green-200'
        : percentage >= 60
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-red-50 text-red-700 border-red-200';

    return (
      <Badge className={cn('text-xs px-1.5 py-0 border', color)}>
        {percentage}%
      </Badge>
    );
  };

  const getMethodBadge = (method?: string) => {
    if (!method) return null;
    const labels: Record<string, { label: string; color: string }> = {
      ai_suggested: { label: 'AI', color: 'bg-purple-50 text-purple-700 border-purple-200' },
      manual: { label: 'Manual', color: 'bg-blue-50 text-blue-700 border-blue-200' },
      auto_matched: { label: 'Auto', color: 'bg-green-50 text-green-700 border-green-200' },
      taxonomy_mapped: { label: 'Taxonomy', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
      ai: { label: 'AI', color: 'bg-purple-50 text-purple-700 border-purple-200' },
      database: { label: 'DB', color: 'bg-gray-50 text-gray-700 border-gray-200' },
      ai_alternative: { label: 'Alt', color: 'bg-purple-50/50 text-purple-600 border-purple-100' },
    };

    const info = labels[method] || { label: method, color: 'bg-gray-50 text-gray-600 border-gray-200' };

    return (
      <Badge className={cn('text-xs px-1.5 py-0 border', info.color)}>
        {info.label}
      </Badge>
    );
  };

  return (
    <div className={cn('relative', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              'w-full justify-between font-mono text-sm border-ghost-300 hover:border-purple-500',
              !value && 'text-ghost-500'
            )}
          >
            <div className="flex items-center gap-2 truncate">
              {value ? (
                <>
                  <span className="font-semibold">{value}</span>
                  {confidence && getConfidenceBadge(confidence)}
                  {matchMethod && getMethodBadge(matchMethod)}
                </>
              ) : (
                <span>Select HTS code...</span>
              )}
            </div>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0 border-ghost-300" align="start">
          {/* Search Header */}
          <div className="flex items-center border-b border-ghost-200 p-2 gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-ghost-400" />
              <Input
                ref={inputRef}
                placeholder="Search HTS codes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 font-mono text-sm border-ghost-300"
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={getAISuggestions}
              disabled={suggesting || !itemName}
              className="border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              {suggesting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              <span className="ml-1.5">AI Suggest</span>
            </Button>
          </div>

          {/* Results */}
          <div className="max-h-[300px] overflow-y-auto">
            {/* AI Suggestions */}
            {aiSuggestions.length > 0 && (
              <div className="p-2 border-b border-ghost-200 bg-purple-50/50">
                <p className="text-xs font-semibold text-purple-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  AI Suggestions
                </p>
                {aiSuggestions.map((suggestion) => (
                  <button
                    key={suggestion.code}
                    onClick={() => handleSelect(suggestion)}
                    className="w-full text-left px-2 py-2 hover:bg-purple-100 flex items-start gap-2 group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-purple-900">
                          {suggestion.code}
                        </span>
                        {getConfidenceBadge(suggestion.confidence)}
                        {getMethodBadge(suggestion.method)}
                      </div>
                      <p className="text-xs text-ghost-600 truncate mt-0.5">
                        {suggestion.description}
                      </p>
                    </div>
                    <Check className="h-4 w-4 text-purple-500 opacity-0 group-hover:opacity-100 flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}

            {/* Search Results */}
            {searching ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
                <span className="ml-2 text-sm text-ghost-600">Searching...</span>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="p-2">
                <p className="text-xs font-semibold text-ghost-600 uppercase tracking-wider mb-2">
                  Search Results
                </p>
                {searchResults.map((result) => (
                  <button
                    key={result.code}
                    onClick={() => handleSelect(result)}
                    className="w-full text-left px-2 py-2 hover:bg-ghost-100 flex items-start gap-2 group"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="font-mono text-sm font-semibold text-ghost-900">
                        {result.code}
                      </span>
                      <p className="text-xs text-ghost-600 truncate mt-0.5">
                        {result.description}
                      </p>
                    </div>
                    <Check className="h-4 w-4 text-green-500 opacity-0 group-hover:opacity-100 flex-shrink-0" />
                  </button>
                ))}
              </div>
            ) : searchQuery.length >= 2 ? (
              <div className="flex flex-col items-center justify-center py-8 text-ghost-500">
                <AlertCircle className="h-5 w-5 mb-2" />
                <span className="text-sm">No HTS codes found</span>
              </div>
            ) : (
              <div className="p-4 text-center text-ghost-500 text-sm">
                Start typing to search HTS codes or use AI Suggest
              </div>
            )}
          </div>

          {/* Footer with clear button */}
          {value && (
            <div className="border-t border-ghost-200 p-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="w-full text-ghost-600 hover:text-red-600"
              >
                <X className="h-4 w-4 mr-1" />
                Clear selection
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}

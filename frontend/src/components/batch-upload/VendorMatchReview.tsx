'use client';

import { Check, X, AlertCircle, Building2, Mail, Phone, MapPin } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface VendorMatchReviewProps {
  enterpriseId: string;
  onReviewComplete?: () => void;
}

interface VendorMatchSuggestion {
  id: string;
  contract_id: string;
  suggested_vendor_name: string;
  suggested_vendor_data: {
    email?: string;
    phone?: string;
    address?: string;
    contact_person?: string;
  };
  matched_vendor_id: string | null;
  matched_vendor?: {
    id: string;
    name: string;
    contact_email?: string;
    contact_phone?: string;
    address?: string;
  };
  confidence_score: number;
  match_type: 'exact' | 'fuzzy' | 'phonetic' | 'new' | 'manual';
  matching_algorithm: string;
  is_confirmed: boolean;
  is_rejected: boolean;
  created_at: string;
}

export function VendorMatchReview({ enterpriseId, onReviewComplete }: VendorMatchReviewProps) {
  const [suggestions, setSuggestions] = useState<VendorMatchSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  // Fetch pending vendor match suggestions
  const fetchSuggestions = async () => {
    try {
      const response = await fetch(`/api/vendor-match-suggestions?enterpriseId=${enterpriseId}&pending=true`);
      if (!response.ok) {
        throw new Error('Failed to fetch suggestions');
      }
      const data = await response.json();
      setSuggestions(data.suggestions || []);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, [enterpriseId]);

  const handleConfirm = async (suggestionId: string) => {
    setProcessing(suggestionId);
    try {
      const response = await fetch(`/api/vendor-match-suggestions/${suggestionId}/confirm`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to confirm match');
      }

      // Remove from list
      setSuggestions(prev => prev.filter(s => s.id !== suggestionId));

      if (suggestions.length === 1 && onReviewComplete) {
        onReviewComplete();
      }
    } catch (err) {
      console.error('Error confirming match:', err);
      alert(err instanceof Error ? err.message : 'Failed to confirm match');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (suggestionId: string, createNew: boolean = false) => {
    setProcessing(suggestionId);
    try {
      const response = await fetch(`/api/vendor-match-suggestions/${suggestionId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ createNew }),
      });

      if (!response.ok) {
        throw new Error('Failed to reject match');
      }

      // Remove from list
      setSuggestions(prev => prev.filter(s => s.id !== suggestionId));

      if (suggestions.length === 1 && onReviewComplete) {
        onReviewComplete();
      }
    } catch (err) {
      console.error('Error rejecting match:', err);
      alert(err instanceof Error ? err.message : 'Failed to reject match');
    } finally {
      setProcessing(null);
    }
  };

  const handleBulkConfirm = async () => {
    const highConfidenceSuggestions = suggestions.filter(s => s.confidence_score >= 80);

    for (const suggestion of highConfidenceSuggestions) {
      await handleConfirm(suggestion.id);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading vendor matches...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (suggestions.length === 0) {
    return (
      <Alert>
        <Check className="h-4 w-4" />
        <AlertTitle>All Set!</AlertTitle>
        <AlertDescription>
          No pending vendor matches to review. All vendors have been matched or created.
        </AlertDescription>
      </Alert>
    );
  }

  const highConfidenceCount = suggestions.filter(s => s.confidence_score >= 80).length;

  return (
    <div className="space-y-4">
      {/* Header with Bulk Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Vendor Match Review</CardTitle>
              <CardDescription>
                {suggestions.length} vendor match{suggestions.length === 1 ? '' : 'es'} pending your review
              </CardDescription>
            </div>
            {highConfidenceCount > 0 && (
              <Button onClick={handleBulkConfirm} variant="outline">
                <Check className="mr-2 h-4 w-4" />
                Confirm All High-Confidence ({highConfidenceCount})
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Match Suggestions */}
      {suggestions.map((suggestion) => (
        <Card key={suggestion.id} className="overflow-hidden">
          <CardHeader className="bg-gray-50">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">
                    {suggestion.suggested_vendor_name}
                  </CardTitle>
                  <Badge
                    variant={suggestion.confidence_score >= 90 ? 'default' : suggestion.confidence_score >= 70 ? 'secondary' : 'outline'}
                    className="font-mono"
                  >
                    {suggestion.confidence_score}% match
                  </Badge>
                  <Badge variant="outline" className="capitalize text-xs">
                    {suggestion.match_type}
                  </Badge>
                </div>
                <CardDescription className="mt-1">
                  Matched using {suggestion.matching_algorithm.replace(/_/g, ' ')}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            {suggestion.matched_vendor_id ? (
              <div className="grid md:grid-cols-2 gap-6">
                {/* Extracted Info */}
                <div>
                  <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-500" />
                    Extracted from Contract
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <Building2 className="h-4 w-4 text-gray-400 mt-0.5" />
                      <span>{suggestion.suggested_vendor_name}</span>
                    </div>
                    {suggestion.suggested_vendor_data.email && (
                      <div className="flex items-start gap-2">
                        <Mail className="h-4 w-4 text-gray-400 mt-0.5" />
                        <span className="text-muted-foreground">{suggestion.suggested_vendor_data.email}</span>
                      </div>
                    )}
                    {suggestion.suggested_vendor_data.phone && (
                      <div className="flex items-start gap-2">
                        <Phone className="h-4 w-4 text-gray-400 mt-0.5" />
                        <span className="text-muted-foreground">{suggestion.suggested_vendor_data.phone}</span>
                      </div>
                    )}
                    {suggestion.suggested_vendor_data.address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                        <span className="text-muted-foreground text-xs">{suggestion.suggested_vendor_data.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Matched Vendor */}
                <div>
                  <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Matched with Existing Vendor
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <Building2 className="h-4 w-4 text-gray-400 mt-0.5" />
                      <span className="font-medium">{suggestion.matched_vendor?.name}</span>
                    </div>
                    {suggestion.matched_vendor?.contact_email && (
                      <div className="flex items-start gap-2">
                        <Mail className="h-4 w-4 text-gray-400 mt-0.5" />
                        <span className="text-muted-foreground">{suggestion.matched_vendor.contact_email}</span>
                      </div>
                    )}
                    {suggestion.matched_vendor?.contact_phone && (
                      <div className="flex items-start gap-2">
                        <Phone className="h-4 w-4 text-gray-400 mt-0.5" />
                        <span className="text-muted-foreground">{suggestion.matched_vendor.contact_phone}</span>
                      </div>
                    )}
                    {suggestion.matched_vendor?.address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                        <span className="text-muted-foreground text-xs">{suggestion.matched_vendor.address}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  No existing vendor found. A new vendor will be created.
                </p>
              </div>
            )}

            <Separator className="my-4" />

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              {suggestion.matched_vendor_id ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => handleReject(suggestion.id, true)}
                    disabled={processing === suggestion.id}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Reject & Create New
                  </Button>
                  <Button
                    onClick={() => handleConfirm(suggestion.id)}
                    disabled={processing === suggestion.id}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Confirm Match
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={() => handleReject(suggestion.id, false)}
                    disabled={processing === suggestion.id}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Skip
                  </Button>
                  <Button
                    onClick={() => handleConfirm(suggestion.id)}
                    disabled={processing === suggestion.id}
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Create Vendor
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

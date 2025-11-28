'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Check,
  X,
  AlertTriangle,
  Eye,
  Edit3,
  Save,
  RotateCcw,
  FileText,
  Users,
  Calendar,
  DollarSign,
  FileCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/utils/supabase/client';

interface EntityHighlight {
  text: string;
  position: { start: number; end: number };
  confidence: number;
  parsedDate?: string;
  value?: number;
}

interface EntityHighlights {
  parties: EntityHighlight[];
  dates: EntityHighlight[];
  amounts: EntityHighlight[];
  clauses: Array<{
    text: string;
    position: { start: number; end: number };
    type: string;
    risk_level?: string;
  }>;
  signatures: Array<{
    position: { start: number; end: number };
    type: string;
  }>;
}

interface ExtractedData {
  title?: string;
  parties?: Array<{name: string; confidence: number}>;
  dates?: {
    effectiveDate?: string;
    expirationDate?: string;
    allDates?: string[];
  };
  amounts?: Array<{value: number; text: string; confidence: number}>;
  documentType?: string;
  hasSignatures?: boolean;
  language?: string;
  wordCount?: number;
  [key: string]: unknown;
}

interface ExtractedDataReviewProps {
  reviewId: string;
  documentId: string;
  onApprove?: () => void;
  onReject?: () => void;
}

export default function DataExtractionReview({
  reviewId,
  documentId,
  onApprove,
  onReject,
}: ExtractedDataReviewProps) {
  const [review, setReview] = useState<{
    id: string;
    status: string;
    extracted_data: ExtractedData;
    corrected_data: ExtractedData | null;
    confidence_scores: Record<string, number>;
    entity_highlights: EntityHighlights;
    extraction_quality_score: number;
  } | null>(null);
  const [documentText, setDocumentText] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<ExtractedData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<{type: string; index: number} | null>(null);

  const supabase = createClient();

  useEffect(() => {
    loadReviewData();
  }, [reviewId, documentId]);

  const loadReviewData = async () => {
    setLoading(true);
    try {
      // Load review data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: reviewData, error: reviewError } = await (supabase as any)
        .from('extracted_data_reviews')
        .select('*')
        .eq('id', reviewId)
        .single();

      if (reviewError) throw reviewError;
      setReview(reviewData);
      setEditedData(reviewData.extracted_data);

      // Load document text
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: documentData, error: documentError } = await (supabase as any)
        .from('documents')
        .select('extracted_text')
        .eq('id', documentId)
        .single();

      if (documentError) throw documentError;
      setDocumentText(documentData.extracted_text || '');
    } catch (error) {
      console.error('Error loading review data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .rpc('approve_extracted_data', {
          p_review_id: reviewId,
          p_user_id: user.id,
          p_corrected_data: isEditing ? editedData : null,
          p_review_notes: null,
        });

      if (error) throw error;

      onApprove?.();
    } catch (error) {
      console.error('Error approving review:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleReject = () => {
    onReject?.();
  };

  const handleFieldChange = (field: string, value: unknown) => {
    setEditedData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.9) return 'text-green-600 bg-green-50 border-green-200';
    if (confidence >= 0.7) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getConfidenceLabel = (confidence: number): string => {
    if (confidence >= 0.9) return 'High';
    if (confidence >= 0.7) return 'Medium';
    return 'Low';
  };

  const renderHighlightedText = () => {
    if (!review) return null;

    const highlights: Array<{start: number; end: number; type: string; data: unknown}> = [];

    // Collect all highlights
    review.entity_highlights.parties.forEach((p, i) =>
      highlights.push({...p.position, type: 'party', data: {index: i, ...p}}));

    review.entity_highlights.dates.forEach((d, i) =>
      highlights.push({...d.position, type: 'date', data: {index: i, ...d}}));

    review.entity_highlights.amounts.forEach((a, i) =>
      highlights.push({...a.position, type: 'amount', data: {index: i, ...a}}));

    // Sort by position
    highlights.sort((a, b) => a.start - b.start);

    // Build segments
    const segments: React.ReactNode[] = [];
    let lastPos = 0;

    highlights.forEach((highlight, idx) => {
      // Add text before highlight
      if (highlight.start > lastPos) {
        segments.push(
          <span key={`text-${idx}`}>
            {documentText.substring(lastPos, highlight.start)}
          </span>
        );
      }

      // Add highlighted text
      const highlightClass = cn(
        'cursor-pointer transition-all',
        highlight.type === 'party' && 'bg-purple-100 border-b-2 border-purple-500',
        highlight.type === 'date' && 'bg-blue-100 border-b-2 border-blue-500',
        highlight.type === 'amount' && 'bg-green-100 border-b-2 border-green-500',
        selectedEntity?.type === highlight.type &&
        selectedEntity?.index === (highlight.data as {index: number}).index &&
        'ring-2 ring-offset-1'
      );

      segments.push(
        <span
          key={`highlight-${idx}`}
          className={highlightClass}
          onClick={() => setSelectedEntity({
            type: highlight.type,
            index: (highlight.data as {index: number}).index
          })}
        >
          {documentText.substring(highlight.start, highlight.end)}
        </span>
      );

      lastPos = highlight.end;
    });

    // Add remaining text
    if (lastPos < documentText.length) {
      segments.push(
        <span key="text-end">{documentText.substring(lastPos)}</span>
      );
    }

    return <div className="whitespace-pre-wrap font-mono text-sm">{segments}</div>;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!review) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Review data not found
        </AlertDescription>
      </Alert>
    );
  }

  const overallQuality = review.extraction_quality_score;
  const data = isEditing ? editedData : review.extracted_data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Data Extraction Review</CardTitle>
              <CardDescription>
                Review and correct extracted data before approval
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={getConfidenceColor(overallQuality)}
              >
                {getConfidenceLabel(overallQuality)} Quality ({(overallQuality * 100).toFixed(0)}%)
              </Badge>
              <Badge variant="outline" className="capitalize">
                {review.status.replace('_', ' ')}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Extraction Quality</span>
              <span>{(overallQuality * 100).toFixed(0)}%</span>
            </div>
            <Progress value={overallQuality * 100} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Extracted Data Form */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Extracted Data</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? <Eye className="h-4 w-4 mr-2" /> : <Edit3 className="h-4 w-4 mr-2" />}
                {isEditing ? 'View Mode' : 'Edit Mode'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="document" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="document"><FileText className="h-4 w-4" /></TabsTrigger>
                <TabsTrigger value="parties"><Users className="h-4 w-4" /></TabsTrigger>
                <TabsTrigger value="dates"><Calendar className="h-4 w-4" /></TabsTrigger>
                <TabsTrigger value="amounts"><DollarSign className="h-4 w-4" /></TabsTrigger>
              </TabsList>

              <TabsContent value="document" className="space-y-4">
                <div>
                  <Label>Document Title</Label>
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <Input
                        value={data.title || ''}
                        onChange={(e) => handleFieldChange('title', e.target.value)}
                      />
                    ) : (
                      <p className="text-sm font-medium">{data.title || 'Untitled'}</p>
                    )}
                    <Badge variant="outline" className={getConfidenceColor(review.confidence_scores.title || 0.5)}>
                      {((review.confidence_scores.title || 0.5) * 100).toFixed(0)}%
                    </Badge>
                  </div>
                </div>

                <div>
                  <Label>Document Type</Label>
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <Input
                        value={data.documentType || ''}
                        onChange={(e) => handleFieldChange('documentType', e.target.value)}
                      />
                    ) : (
                      <p className="text-sm capitalize">{data.documentType || 'Unknown'}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Language</Label>
                    <p className="text-sm">{data.language?.toUpperCase() || 'EN'}</p>
                  </div>
                  <div>
                    <Label>Word Count</Label>
                    <p className="text-sm">{data.wordCount?.toLocaleString() || 0}</p>
                  </div>
                </div>

                <div>
                  <Label className="flex items-center gap-2">
                    <FileCheck className="h-4 w-4" />
                    Signatures Detected
                  </Label>
                  <p className="text-sm">{data.hasSignatures ? 'Yes' : 'No'}</p>
                </div>
              </TabsContent>

              <TabsContent value="parties" className="space-y-4">
                <div>
                  <Label>Parties ({data.parties?.length || 0})</Label>
                  <div className="space-y-2 mt-2">
                    {data.parties?.map((party, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 border rounded">
                        {isEditing ? (
                          <Input
                            value={party.name}
                            onChange={(e) => {
                              const newParties = [...(data.parties || [])];
                              newParties[idx] = {...party, name: e.target.value};
                              handleFieldChange('parties', newParties);
                            }}
                          />
                        ) : (
                          <span className="text-sm">{party.name}</span>
                        )}
                        <Badge variant="outline" className={getConfidenceColor(party.confidence)}>
                          {(party.confidence * 100).toFixed(0)}%
                        </Badge>
                      </div>
                    ))}
                    {(!data.parties || data.parties.length === 0) && (
                      <p className="text-sm text-gray-500 italic">No parties detected</p>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="dates" className="space-y-4">
                <div>
                  <Label>Effective Date</Label>
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <Input
                        type="date"
                        value={data.dates?.effectiveDate || ''}
                        onChange={(e) => handleFieldChange('dates', {
                          ...data.dates,
                          effectiveDate: e.target.value,
                        })}
                      />
                    ) : (
                      <p className="text-sm">{data.dates?.effectiveDate || 'Not detected'}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label>Expiration Date</Label>
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <Input
                        type="date"
                        value={data.dates?.expirationDate || ''}
                        onChange={(e) => handleFieldChange('dates', {
                          ...data.dates,
                          expirationDate: e.target.value,
                        })}
                      />
                    ) : (
                      <p className="text-sm">{data.dates?.expirationDate || 'Not detected'}</p>
                    )}
                  </div>
                </div>

                {data.dates?.allDates && data.dates.allDates.length > 0 && (
                  <div>
                    <Label>Other Dates ({data.dates.allDates.length})</Label>
                    <div className="space-y-1 mt-2">
                      {data.dates.allDates.slice(0, 5).map((date, idx) => (
                        <p key={idx} className="text-sm text-gray-600">{date}</p>
                      ))}
                      {data.dates.allDates.length > 5 && (
                        <p className="text-xs text-gray-500">+{data.dates.allDates.length - 5} more</p>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="amounts" className="space-y-4">
                <div>
                  <Label>Amounts ({data.amounts?.length || 0})</Label>
                  <div className="space-y-2 mt-2">
                    {data.amounts?.map((amount, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          {isEditing ? (
                            <Input
                              type="number"
                              value={amount.value}
                              onChange={(e) => {
                                const newAmounts = [...(data.amounts || [])];
                                newAmounts[idx] = {...amount, value: parseFloat(e.target.value)};
                                handleFieldChange('amounts', newAmounts);
                              }}
                            />
                          ) : (
                            <span className="text-sm font-medium">${amount.value.toLocaleString()}</span>
                          )}
                          <p className="text-xs text-gray-500">{amount.text}</p>
                        </div>
                        <Badge variant="outline" className={getConfidenceColor(amount.confidence)}>
                          {(amount.confidence * 100).toFixed(0)}%
                        </Badge>
                      </div>
                    ))}
                    {(!data.amounts || data.amounts.length === 0) && (
                      <p className="text-sm text-gray-500 italic">No amounts detected</p>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Right: Document Preview with Highlights */}
        <Card className="lg:sticky lg:top-6 h-fit">
          <CardHeader>
            <CardTitle className="text-lg">Document Preview</CardTitle>
            <CardDescription>Click highlighted text to view details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Legend */}
              <div className="flex flex-wrap gap-2 pb-2 border-b">
                <Badge variant="outline" className="bg-purple-100 border-purple-500">
                  <Users className="h-3 w-3 mr-1" />
                  Parties
                </Badge>
                <Badge variant="outline" className="bg-blue-100 border-blue-500">
                  <Calendar className="h-3 w-3 mr-1" />
                  Dates
                </Badge>
                <Badge variant="outline" className="bg-green-100 border-green-500">
                  <DollarSign className="h-3 w-3 mr-1" />
                  Amounts
                </Badge>
              </div>

              {/* Document Text */}
              <div className="max-h-96 overflow-y-auto p-4 bg-gray-50 rounded border">
                {renderHighlightedText()}
              </div>

              {/* Selected Entity Details */}
              {selectedEntity && (
                <Card>
                  <CardContent className="pt-4">
                    <h4 className="font-semibold text-sm mb-2 capitalize">{selectedEntity.type} Details</h4>
                    <div className="text-sm space-y-1">
                      {selectedEntity.type === 'party' && review.entity_highlights.parties[selectedEntity.index] && (
                        <>
                          <p><strong>Name:</strong> {review.entity_highlights.parties[selectedEntity.index].text}</p>
                          <p><strong>Confidence:</strong> {(review.entity_highlights.parties[selectedEntity.index].confidence * 100).toFixed(0)}%</p>
                        </>
                      )}
                      {selectedEntity.type === 'date' && review.entity_highlights.dates[selectedEntity.index] && (
                        <>
                          <p><strong>Text:</strong> {review.entity_highlights.dates[selectedEntity.index].text}</p>
                          <p><strong>Parsed:</strong> {review.entity_highlights.dates[selectedEntity.index].parsedDate || 'N/A'}</p>
                          <p><strong>Confidence:</strong> {(review.entity_highlights.dates[selectedEntity.index].confidence * 100).toFixed(0)}%</p>
                        </>
                      )}
                      {selectedEntity.type === 'amount' && review.entity_highlights.amounts[selectedEntity.index] && (
                        <>
                          <p><strong>Text:</strong> {review.entity_highlights.amounts[selectedEntity.index].text}</p>
                          <p><strong>Value:</strong> ${review.entity_highlights.amounts[selectedEntity.index].value?.toLocaleString()}</p>
                          <p><strong>Confidence:</strong> {(review.entity_highlights.amounts[selectedEntity.index].confidence * 100).toFixed(0)}%</p>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {isEditing && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditedData(review.extracted_data);
                    setIsEditing(false);
                  }}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset Changes
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleReject}
                disabled={saving}
              >
                <X className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button
                onClick={handleApprove}
                disabled={saving}
                className="bg-purple-900 hover:bg-purple-800"
              >
                {saving ? (
                  <>Approving...</>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Approve {isEditing && 'with Corrections'}
                  </>
                )}
              </Button>
            </div>
          </div>

          {isEditing && (
            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                You have unsaved changes. Click "Approve with Corrections" to save and approve.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

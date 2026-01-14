'use client';

import { useState } from 'react';
import { BatchOcrUpload, DataExtractionReview } from '@/components/ocr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function OcrWorkflowPage() {
  const [currentView, setCurrentView] = useState<'upload' | 'review'>('upload');
  const [currentReview, setCurrentReview] = useState<{reviewId: string; documentId: string} | null>(null);

  const handleJobComplete = (jobId: string) => {
    // Job completed
  };

  const handleReviewReady = (reviewId: string, documentId: string) => {
    setCurrentReview({ reviewId, documentId });
    setCurrentView('review');
  };

  const handleReviewApprove = () => {
    alert('Data approved successfully!');
    setCurrentView('upload');
    setCurrentReview(null);
  };

  const handleReviewReject = () => {
    alert('Review rejected. Document flagged for manual processing.');
    setCurrentView('upload');
    setCurrentReview(null);
  };

  return (
    <div className="container mx-auto py-8 px-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-purple-900 mb-2">
          OCR & Data Extraction
        </h1>
        <p className="text-gray-600">
          Upload documents, extract data with OCR, and review before approval
        </p>
      </div>

      {currentView === 'review' && currentReview && (
        <div className="mb-4">
          <Button
            variant="outline"
            onClick={() => {
              setCurrentView('upload');
              setCurrentReview(null);
            }}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Upload
          </Button>
        </div>
      )}

      {currentView === 'upload' && (
        <BatchOcrUpload
          onComplete={handleJobComplete}
          onReviewReady={handleReviewReady}
        />
      )}

      {currentView === 'review' && currentReview && (
        <DataExtractionReview
          reviewId={currentReview.reviewId}
          documentId={currentReview.documentId}
          onApprove={handleReviewApprove}
          onReject={handleReviewReject}
        />
      )}
    </div>
  );
}

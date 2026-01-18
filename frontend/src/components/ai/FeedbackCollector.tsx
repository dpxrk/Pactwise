'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Send,
  X,
  CheckCircle
} from 'lucide-react';
import React, { useState } from 'react';

import { useToast } from '@/components/premium/Toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
// Import real data hooks - NO HARDCODED DATA
import { useTrainAgent, useUpdateInteractionOutcome } from '@/hooks/useAgentData';

/** Feedback context data */
type FeedbackContext = Record<string, unknown>;

interface FeedbackCollectorProps {
  interactionId?: string;
  recommendationId?: string;
  agentType: string;
  action: string;
  context: FeedbackContext;
  onClose?: () => void;
  embedded?: boolean;
  autoShow?: boolean;
}

type FeedbackType = 'positive' | 'negative' | null;

export const FeedbackCollector: React.FC<FeedbackCollectorProps> = ({
  interactionId,
  recommendationId,
  agentType,
  action,
  context,
  onClose,
  embedded = false,
  autoShow = false
}) => {
  const [isOpen, setIsOpen] = useState(autoShow);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { toast } = useToast();
  const trainAgentMutation = useTrainAgent();
  const updateOutcomeMutation = useUpdateInteractionOutcome();

  const handleSubmitFeedback = async () => {
    if (!feedbackType && !feedbackText.trim()) {
      toast({
        type: "error",
        title: "Feedback Required",
        description: "Please provide a rating or written feedback."
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Update interaction outcome if we have an interactionId
      if (interactionId) {
        await updateOutcomeMutation.mutateAsync({
          interactionId,
          outcome: feedbackType === 'positive' ? 'success' : 
                  feedbackType === 'negative' ? 'failure' : 'partial',
          metadata: {
            feedbackText,
            recommendationId
          }
        });
      }

      // Train the agent with the feedback
      await trainAgentMutation.mutateAsync({
        agentType,
        action,
        context,
        wasHelpful: feedbackType === 'positive',
        improvement: feedbackText || undefined
      });

      setSubmitted(true);
      
      // Auto-close after success
      setTimeout(() => {
        if (embedded) {
          setIsOpen(false);
          setSubmitted(false);
          setFeedbackType(null);
          setFeedbackText('');
        } else if (onClose) {
          onClose();
        }
      }, 2000);

    } catch (error) {
      console.error('Failed to submit feedback:', error);
      toast({
        type: "error",
        title: "Error",
        description: "Failed to submit feedback. Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickFeedback = async (type: 'positive' | 'negative') => {
    setFeedbackType(type);
    
    // If no text feedback, submit immediately
    if (!feedbackText) {
      await handleSubmitFeedback();
    }
  };

  const content = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
        >
          <Card className={embedded ? 'border-0 shadow-none' : ''}>
            {!embedded && (
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">
                    How was this recommendation?
                  </CardTitle>
                  {onClose && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onClose}
                      className="h-6 w-6"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
            )}
            
            <CardContent className={embedded ? 'p-0' : 'pt-0'}>
              {submitted ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-4 space-y-2"
                >
                  <CheckCircle className="h-8 w-8 text-green-500" />
                  <p className="text-sm font-medium">Thank you for your feedback!</p>
                  <p className="text-xs text-gray-500">
                    This helps improve our AI recommendations
                  </p>
                </motion.div>
              ) : (
                <div className="space-y-3">
                  {/* Quick feedback buttons */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant={feedbackType === 'positive' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleQuickFeedback('positive')}
                      disabled={isSubmitting}
                      className="flex-1"
                    >
                      <ThumbsUp className="h-4 w-4 mr-1" />
                      Helpful
                    </Button>
                    <Button
                      variant={feedbackType === 'negative' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleQuickFeedback('negative')}
                      disabled={isSubmitting}
                      className="flex-1"
                    >
                      <ThumbsDown className="h-4 w-4 mr-1" />
                      Not Helpful
                    </Button>
                  </div>

                  {/* Detailed feedback */}
                  {feedbackType && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      transition={{ duration: 0.2 }}
                      className="space-y-2"
                    >
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <MessageSquare className="h-3 w-3" />
                        <span>Tell us more (optional)</span>
                      </div>
                      <Textarea
                        placeholder={
                          feedbackType === 'positive' 
                            ? "What was particularly helpful?"
                            : "How could this be improved?"
                        }
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        className="min-h-[60px] text-sm"
                        disabled={isSubmitting}
                      />
                      <Button
                        size="sm"
                        onClick={handleSubmitFeedback}
                        disabled={isSubmitting}
                        className="w-full"
                      >
                        {isSubmitting ? (
                          <>Submitting...</>
                        ) : (
                          <>
                            <Send className="h-3 w-3 mr-1" />
                            Submit Feedback
                          </>
                        )}
                      </Button>
                    </motion.div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (embedded) {
    return content;
  }

  // Non-embedded mode - floating feedback widget
  return (
    <>
      {/* Trigger button */}
      {!isOpen && (
        <motion.button
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(true)}
          className="fixed bottom-24 right-6 z-40 p-3 rounded-full bg-white border border-gray-200 shadow-lg hover:shadow-xl transition-all"
        >
          <MessageSquare className="h-5 w-5 text-gray-700" />
        </motion.button>
      )}

      {/* Floating feedback card */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-80">
          {content}
        </div>
      )}
    </>
  );
};

// Inline feedback component for embedding in other components
export const InlineFeedback: React.FC<{
  interactionId?: string;
  agentType: string;
  action: string;
  context: FeedbackContext;
  className?: string;
}> = ({ interactionId, agentType, action, context, className }) => {
  const [showFeedback, setShowFeedback] = useState(false);

  return (
    <div className={className}>
      {!showFeedback ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowFeedback(true)}
          className="text-xs"
        >
          <MessageSquare className="h-3 w-3 mr-1" />
          Give Feedback
        </Button>
      ) : (
        <FeedbackCollector
          interactionId={interactionId}
          agentType={agentType}
          action={action}
          context={context}
          embedded={true}
          autoShow={true}
          onClose={() => setShowFeedback(false)}
        />
      )}
    </div>
  );
};

/** Feedback trigger context */
interface FeedbackTriggerContext {
  interactionId?: string;
  agentType: string;
  action: string;
  contextData: FeedbackContext;
}

// Auto-trigger feedback after certain interactions
export const useFeedbackTrigger = () => {
  const [shouldShowFeedback, setShouldShowFeedback] = useState(false);
  const [feedbackContext, setFeedbackContext] = useState<FeedbackTriggerContext | null>(null);

  const triggerFeedback = (context: FeedbackTriggerContext) => {
    // Only trigger feedback for significant actions
    const significantActions = [
      'contract_analysis',
      'vendor_recommendation',
      'workflow_automation',
      'risk_assessment'
    ];

    if (significantActions.includes(context.action)) {
      setFeedbackContext(context);
      // Delay showing feedback to not interrupt the user flow
      setTimeout(() => {
        setShouldShowFeedback(true);
      }, 3000);
    }
  };

  const dismissFeedback = () => {
    setShouldShowFeedback(false);
    setFeedbackContext(null);
  };

  return {
    shouldShowFeedback,
    feedbackContext,
    triggerFeedback,
    dismissFeedback,
    FeedbackComponent: shouldShowFeedback && feedbackContext ? (
      <FeedbackCollector
        interactionId={feedbackContext.interactionId}
        agentType={feedbackContext.agentType}
        action={feedbackContext.action}
        context={feedbackContext.contextData}
        onClose={dismissFeedback}
      />
    ) : null
  };
};

export default FeedbackCollector;
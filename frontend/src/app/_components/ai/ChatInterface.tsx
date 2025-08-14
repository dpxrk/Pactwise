'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
// import { useQuery, useMutation } from 'convex/react';
// import { api } from '../../../../convex/_generated/api';
// import { Id } from '../../../../convex/_generated/dataModel';
import {
  Send,
  Loader2,
  Bot,
  User,
  Paperclip,
  X,
  Copy,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  AlertCircle,
  FileText,
  Minimize2,
  Maximize2
} from 'lucide-react';
import { Button } from '@/components/ui/button';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { trackBusinessMetric } from '@/lib/metrics';
import { format } from '@/lib/date';
import { useWebWorker } from '@/hooks/useWebWorker';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  attachments?: {
    type: 'contract' | 'clause' | 'vendor';
    id: string;
    title: string;
  }[];
  metadata?: {
    confidence?: number;
    sources?: string[];
    actions?: {
      label: string;
      action: string;
      data?: Record<string, unknown>;
    }[];
  };
  feedback?: 'positive' | 'negative';
}

interface ChatInterfaceProps {
  contractId?: string;
  vendorId?: string;
  initialMessage?: string;
  mode?: 'embedded' | 'floating' | 'fullscreen';
  onClose?: () => void;
  className?: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  contractId,
  vendorId,
  initialMessage = '',
  mode = 'embedded',
  onClose,
  className
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState(initialMessage);
  const [isTyping, setIsTyping] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [selectedContext, setSelectedContext] = useState<{
    type: 'contract' | 'vendor';
    id: string;
    title: string;
  } | null>(null);
  const [conversationSummary, setConversationSummary] = useState<string>('');
  
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Initialize Web Workers for memory operations
  const memoryWorker = useWebWorker('/workers/chat-memory.worker.js', {
    timeout: 30000
  });

  // Mock chat mutations - replace with Supabase implementation
  const sendMessage = async (params: { message: string; context: { contractId?: string; vendorId?: string; attachments?: { type: 'contract' | 'vendor'; id: string; title: string; }[] }; conversationHistory: { role: 'user' | 'assistant' | 'system'; content: string; }[] }) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    // Mock AI response
    return {
      content: `I understand your question about ${params.message}. Based on the context provided, here are my insights: This is a mock response for demonstration purposes. In the actual implementation, this would connect to AI services to provide real contract analysis and recommendations.`,
      metadata: {
        confidence: 0.85,
        sources: ['Contract Database', 'Compliance Rules'],
        actions: [
          { label: 'View Related Contracts', action: 'view_contract', data: { id: 'mock-id' } },
          { label: 'Download Report', action: 'download_report', data: { type: 'analysis' } }
        ]
      }
    };
  };
  
  const provideFeedback = async (params: { messageId: string; feedback: 'positive' | 'negative' }) => {
    // Mock feedback submission
    console.log('Feedback submitted:', params);
    return { success: true };
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // Analyze conversation patterns when messages change
  useEffect(() => {
    if (messages.length > 5) {
      // Use Web Worker to analyze conversation patterns
      memoryWorker.postMessage('ANALYZE_PATTERNS', { messages })
        .then(patterns => {
          logger.info('Conversation patterns analyzed', patterns);
        })
        .catch(err => {
          logger.error('Failed to analyze patterns', err);
        });
    }

    // Generate summary for long conversations
    if (messages.length > 10 && messages.length % 5 === 0) {
      memoryWorker.postMessage('GENERATE_SUMMARY', { 
        messages,
        options: { maxLength: 300, includeInsights: true }
      })
        .then(summary => {
          setConversationSummary(summary);
          logger.info('Conversation summary generated', summary);
        })
        .catch(err => {
          logger.error('Failed to generate summary', err);
        });
    }
  }, [messages, memoryWorker]);

  // Set initial context
  useEffect(() => {
    if (contractId) {
      setSelectedContext({
        type: 'contract',
        id: contractId,
        title: 'Current Contract' // Replace with actual contract title
      });
    } else if (vendorId) {
      setSelectedContext({
        type: 'vendor',
        id: vendorId,
        title: 'Current Vendor' // Replace with actual vendor name
      });
    }
  }, [contractId, vendorId]);

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
      ...(selectedContext && { attachments: [selectedContext] })
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    const startTime = performance.now();

    try {
      const response = await sendMessage({
        message: inputValue,
        context: {
          ...(contractId && { contractId }),
          ...(vendorId && { vendorId }),
          ...(selectedContext && { attachments: [selectedContext] })
        },
        conversationHistory: messages.map(m => ({
          role: m.role,
          content: m.content
        }))
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        metadata: response.metadata
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      const duration = performance.now() - startTime;
      trackBusinessMetric.aiAgentExecution('chat-response', duration, true);
      
      logger.info('Chat message sent', { duration });
    } catch (error) {
      logger.error('Failed to send chat message', error as Error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'system',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      trackBusinessMetric.aiAgentExecution('chat-response', performance.now() - startTime, false);
    } finally {
      setIsTyping(false);
    }
  }, [inputValue, selectedContext, messages, contractId, vendorId]);

  const handleFeedback = async (messageId: string, feedback: 'positive' | 'negative') => {
    try {
      await provideFeedback({
        messageId,
        feedback
      });
      
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, feedback } : msg
      ));
      
      trackBusinessMetric.userAction('chat-feedback', 'ai');
    } catch (error) {
      logger.error('Failed to submit feedback', error as Error);
    }
  };

  const handleAction = (action: string, data?: Record<string, unknown>) => {
    // Handle predefined actions
    switch (action) {
      case 'view_contract':
        if (data?.id) window.open(`/dashboard/contracts/${data.id}`, '_blank');
        break;
      case 'view_vendor':
        if (data?.id) window.open(`/dashboard/vendors/${data.id}`, '_blank');
        break;
      case 'download_report':
        // Implement download logic
        break;
      default:
        logger.warn('Unknown action', { action, data });
    }
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    // Could add a toast notification here
  };

  const clearChat = () => {
    setMessages([]);
    setSelectedContext(null);
  };

  const suggestedQuestions = [
    "What are the key risks in this contract?",
    "Show me payment terms across all contracts",
    "Which contracts are expiring soon?",
    "Analyze vendor performance metrics",
    "Find similar clauses in other contracts"
  ];

  if (mode === 'floating' && isMinimized) {
    return (
      <Card className="fixed bottom-4 right-4 w-80 shadow-lg">
        <CardHeader 
          className="cursor-pointer"
          onClick={() => setIsMinimized(false)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bot className="h-4 w-4" />
              AI Assistant
            </CardTitle>
            <Maximize2 className="h-4 w-4" />
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "flex flex-col",
      mode === 'floating' && "fixed bottom-4 right-4 w-96 h-[600px] shadow-lg z-50",
      mode === 'fullscreen' && "h-screen",
      mode === 'embedded' && "h-[600px]",
      className
    )}>
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Contract Assistant
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearChat}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            {mode === 'floating' && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMinimized(true)}
                  className="h-8 w-8 p-0"
                >
                  <Minimize2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
        
        {selectedContext && (
          <div className="mt-2">
            <Badge variant="secondary" className="gap-1">
              <FileText className="h-3 w-3" />
              {selectedContext.title}
              <button
                onClick={() => setSelectedContext(null)}
                className="ml-1 hover:bg-muted rounded"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Messages */}
        <ScrollArea 
          ref={scrollAreaRef}
          className="flex-1 px-4 py-2"
        >
          {messages.length === 0 ? (
            <div className="space-y-4 py-8">
              <div className="text-center text-muted-foreground">
                <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm mb-4">
                  Hi! I am your AI contract assistant. I can help you with:
                </p>
                <ul className="text-xs space-y-1 text-left max-w-xs mx-auto">
                  <li>• Analyzing contract terms and risks</li>
                  <li>• Finding similar clauses across contracts</li>
                  <li>• Vendor performance insights</li>
                  <li>• Compliance recommendations</li>
                  <li>• Contract optimization suggestions</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground text-center">
                  Try asking:
                </p>
                {suggestedQuestions.map((question, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-xs"
                    onClick={() => setInputValue(question)}
                  >
                    {question}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    message.role === 'user' && "justify-end"
                  )}
                >
                  {message.role !== 'user' && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {message.role === 'assistant' ? (
                          <Bot className="h-4 w-4" />
                        ) : (
                          <AlertCircle className="h-4 w-4" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div className={cn(
                    "flex-1 space-y-2",
                    message.role === 'user' && "max-w-[80%]"
                  )}>
                    <div className={cn(
                      "rounded-lg px-4 py-2",
                      message.role === 'user' && "bg-primary text-primary-foreground",
                      message.role === 'assistant' && "bg-muted",
                      message.role === 'system' && "bg-destructive/10 text-destructive"
                    )}>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {message.attachments.map((attachment, idx) => (
                            <Badge 
                              key={idx}
                              variant="secondary" 
                              className="text-xs"
                            >
                              <FileText className="h-3 w-3 mr-1" />
                              {attachment.title}
                            </Badge>
                          ))}
                        </div>
                      )}
                      
                      {message.metadata?.actions && (
                        <div className="mt-2 space-x-2">
                          {message.metadata.actions.map((action, idx) => (
                            <Button
                              key={idx}
                              variant="secondary"
                              size="sm"
                              className="text-xs"
                              onClick={() => handleAction(action.action, action.data)}
                            >
                              {action.label}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {message.role === 'assistant' && (
                      <div className="flex items-center gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => copyMessage(message.content)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Copy message</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                              "h-6 w-6 p-0",
                              message.feedback === 'positive' && "text-green-600"
                            )}
                            onClick={() => handleFeedback(message.id, 'positive')}
                          >
                            <ThumbsUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                              "h-6 w-6 p-0",
                              message.feedback === 'negative' && "text-red-600"
                            )}
                            onClick={() => handleFeedback(message.id, 'negative')}
                          >
                            <ThumbsDown className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        {message.metadata?.confidence && (
                          <span className="text-xs text-muted-foreground">
                            {Math.round(message.metadata.confidence * 100)}% confident
                          </span>
                        )}
                        
                        <span className="text-xs text-muted-foreground">
                          {format(message.timestamp, 'HH:mm')}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {message.role === 'user' && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              
              {isTyping && (
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-muted rounded-lg px-4 py-2">
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-muted-foreground">AI is thinking</span>
                      <Loader2 className="h-3 w-3 animate-spin" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="border-t p-4 space-y-2">
          <div className="flex gap-2">
            <Textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Ask about contracts, vendors, or compliance..."
              className="flex-1 min-h-[40px] max-h-[120px] resize-none"
              disabled={isTyping}
            />
            <div className="flex flex-col gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-[40px] w-[40px] p-0"
                      disabled
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Attach contract or vendor</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isTyping}
                size="sm"
                className="h-[40px] w-[40px] p-0"
              >
                {isTyping ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground text-center">
            AI responses may not be 100% accurate. Always verify important information.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
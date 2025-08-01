'use client';

import React, { useState, useRef, useEffect } from 'react';
// import { useQuery, useMutation } from 'convex/react';
// import { api } from '../../../convex/_generated/api';
// import { Id } from '../../../convex/_generated/dataModel';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Send,
  Loader2,
  Bot,
  User,
  X,
  Minus,
  Maximize2,
  Minimize2,
  Paperclip,
  FileText,
  Building2,
  RotateCw,
  Trash2,
  Brain,
  TrendingUp,
  Lightbulb,
  Shield
} from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useUser } from '@clerk/nextjs';
import { useToast } from '@/components/premium/Toast';

interface GlobalAIChatProps {
  contractId?: string;
  vendorId?: string;
}

type ChatState = 'minimized' | 'normal' | 'maximized';

export const GlobalAIChat: React.FC<GlobalAIChatProps> = ({ contractId, vendorId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [chatState, setChatState] = useState<ChatState>('normal');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useUser();
  const { toast } = useToast();

  // Mock AI queries and mutations - replace with Supabase implementation
  const sessions = [
    { _id: '1', title: 'Contract Analysis Session', lastMessage: 'Analyzed payment terms', createdAt: Date.now() - 86400000 },
    { _id: '2', title: 'Vendor Review', lastMessage: 'Reviewed vendor performance', createdAt: Date.now() - 172800000 }
  ];
  
  const currentSession = selectedSessionId ? {
    _id: selectedSessionId,
    title: 'Current Chat Session',
    messages: [
      { _id: '1', role: 'user', content: 'Hello, can you help me analyze this contract?', createdAt: Date.now() - 60000 },
      { _id: '2', role: 'assistant', content: 'Of course! I can help you analyze contracts. Please share the contract details or specific questions you have.', createdAt: Date.now() - 30000 }
    ]
  } : null;
  
  const sendMessage = async (params: any) => {
    // TODO: Replace with Supabase implementation
    console.log('Sending message:', params);
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { success: true };
  };
  
  const startConversation = async (params: any) => {
    // TODO: Replace with Supabase implementation
    console.log('Starting conversation:', params);
    await new Promise(resolve => setTimeout(resolve, 500));
    return { conversationId: `conv_${Date.now()}` };
  };
  
  const recommendations = [
    { type: 'contract', title: 'Review upcoming renewals', description: 'You have 3 contracts expiring next month' },
    { type: 'vendor', title: 'Vendor performance review', description: 'Time to assess vendor performance metrics' }
  ];
  
  const learningStats = {
    totalConversations: 45,
    contractsAnalyzed: 23,
    timesSaved: 180,
    accuracyScore: 94
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current && currentSession?.messages) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [currentSession?.messages]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Shift + K to toggle chat
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const handleSendMessage = async () => {
    if (!message.trim() || isLoading) return;

    setIsLoading(true);
    const messageText = message;
    setMessage('');

    try {
      if (selectedSessionId) {
        await sendMessage({
          conversationId: selectedSessionId,
          message: messageText,
          context: contractId || vendorId ? {
            contractId,
            vendorId
          } : undefined
        });
      } else {
        const result = await startConversation({
          initialMessage: messageText,
          context: contractId || vendorId ? {
            contractId,
            vendorId
          } : undefined
        });
        setSelectedSessionId(result.conversationId);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      toast({
        type: "error",
        title: "Error",
        description: "Failed to send message. Please try again."
      });
      setMessage(messageText); // Restore message on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewConversation = () => {
    setSelectedSessionId(null);
  };

  const getSizeClasses = () => {
    switch (chatState) {
      case 'minimized':
        return 'w-80 h-14';
      case 'normal':
        return 'w-[400px] h-[600px]';
      case 'maximized':
        return 'w-[90vw] max-w-5xl h-[90vh]';
    }
  };

  const messages = currentSession?.messages || [];

  return (
    <>
      {/* Chat Toggle Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-50 p-4 rounded-full",
          "bg-gradient-to-r from-purple-600 to-pink-600",
          "text-white shadow-lg hover:shadow-xl transition-all",
          "flex items-center justify-center",
          "group",
          isOpen && "hidden"
        )}
      >
        <Brain className="w-6 h-6 group-hover:scale-110 transition-transform" />
        {recommendations && recommendations.filter(r => r.status === 'pending').length > 0 && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full animate-pulse" />
        )}
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: "spring", duration: 0.3 }}
            className={cn(
              "fixed bottom-6 right-6 z-50",
              "bg-gray-900 border border-gray-800 rounded-lg shadow-2xl",
              "flex flex-col overflow-hidden transition-all duration-300",
              getSizeClasses()
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900/50 backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Donna AI</h3>
                  <p className="text-xs text-gray-400">
                    {chatState === 'minimized' ? 'Click to expand' : learningStats ? `Learning from ${learningStats.totalInsights} insights` : 'Your business intelligence assistant'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {chatState !== 'minimized' && (
                  <>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setChatState(chatState === 'maximized' ? 'normal' : 'maximized')}
                      className="text-gray-400 hover:text-white"
                    >
                      {chatState === 'maximized' ? (
                        <Minimize2 className="w-4 h-4" />
                      ) : (
                        <Maximize2 className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setChatState('minimized')}
                      className="text-gray-400 hover:text-white"
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                  </>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {chatState !== 'minimized' && (
              <>
                {/* Session Selector */}
                {sessions && sessions.length > 0 && (
                  <div className="p-3 border-b border-gray-800 bg-gray-900/30">
                    <div className="flex items-center gap-2 overflow-x-auto">
                      <Button
                        size="sm"
                        variant={!selectedSessionId ? "default" : "ghost"}
                        onClick={handleNewConversation}
                        className="text-xs whitespace-nowrap"
                      >
                        New Chat
                      </Button>
                      {sessions.map((session) => (
                        <div key={session._id} className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant={selectedSessionId === session._id ? "default" : "ghost"}
                            onClick={() => setSelectedSessionId(session._id)}
                            className="text-xs whitespace-nowrap"
                          >
                            Chat {new Date(session.createdAt).toLocaleDateString()}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Recommendations Badge */}
                {recommendations && recommendations.filter(r => r.status === 'pending').length > 0 && (
                  <div className="px-4 py-2 bg-yellow-900/20 border-b border-gray-800">
                    <div className="flex items-center gap-2 text-xs">
                      <Lightbulb className="w-4 h-4 text-yellow-500 animate-pulse" />
                      <span className="text-yellow-400">
                        {recommendations.filter(r => r.status === 'pending').length} new insights available from Donna
                      </span>
                    </div>
                  </div>
                )}

                {/* Messages */}
                <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
                  <div className="space-y-4">
                    {messages.length === 0 && (
                      <div className="text-center py-8">
                        <Brain className="w-12 h-12 mx-auto text-purple-600 mb-4" />
                        <div className="text-gray-400 text-sm space-y-3">
                          <p className="font-semibold text-white">Hello! I'm Donna, your AI business intelligence assistant.</p>
                          <p>I continuously learn from patterns across all PactWise customers to help you make better business decisions.</p>
                          <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                            <div className="flex items-center gap-2 bg-gray-800 p-2 rounded">
                              <TrendingUp className="w-4 h-4 text-blue-500" />
                              <span>Pattern Recognition</span>
                            </div>
                            <div className="flex items-center gap-2 bg-gray-800 p-2 rounded">
                              <Lightbulb className="w-4 h-4 text-yellow-500" />
                              <span>Smart Insights</span>
                            </div>
                            <div className="flex items-center gap-2 bg-gray-800 p-2 rounded">
                              <Shield className="w-4 h-4 text-green-500" />
                              <span>Risk Detection</span>
                            </div>
                            <div className="flex items-center gap-2 bg-gray-800 p-2 rounded">
                              <Brain className="w-4 h-4 text-purple-500" />
                              <span>Collective Learning</span>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-3">Ask me anything about your contracts, vendors, or business operations!</p>
                        </div>
                      </div>
                    )}
                    
                    {messages.map((msg, idx) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className={cn(
                          "flex gap-3",
                          msg.role === 'user' ? 'justify-end' : 'justify-start'
                        )}
                      >
                        {msg.role === 'donna' && (
                          <Avatar className="w-8 h-8 shrink-0">
                            <AvatarFallback className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                              <Brain className="w-4 h-4" />
                            </AvatarFallback>
                          </Avatar>
                        )}
                        
                        <div className={cn(
                          "max-w-[80%] rounded-lg p-3",
                          msg.role === 'user' 
                            ? 'bg-teal-600 text-white' 
                            : 'bg-gradient-to-r from-purple-900/50 to-pink-900/50 text-gray-200 border border-purple-800/50'
                        )}>
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {msg.attachments.map((attachment, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs opacity-80">
                                  {attachment.type === 'contract' ? (
                                    <FileText className="w-3 h-3" />
                                  ) : (
                                    <Building2 className="w-3 h-3" />
                                  )}
                                  <span>{attachment.title}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          <p className="text-xs opacity-60 mt-1">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                        
                        {msg.role === 'user' && (
                          <Avatar className="w-8 h-8 shrink-0">
                            <AvatarFallback className="bg-gray-700 text-white">
                              {user?.firstName?.[0] || 'U'}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </motion.div>
                    ))}
                    
                    {isLoading && (
                      <div className="flex gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                            <Brain className="w-4 h-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="bg-gray-800 rounded-lg p-3">
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                            <span className="text-sm text-gray-400">Analyzing patterns...</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {/* Context Indicator */}
                {(contractId || vendorId) && (
                  <div className="px-4 py-2 bg-gray-800/50 border-t border-gray-800">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Paperclip className="w-3 h-3" />
                      <span>Context: {contractId ? 'Contract' : 'Vendor'} attached</span>
                    </div>
                  </div>
                )}

                {/* Input */}
                <div className="p-4 border-t border-gray-800">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage();
                    }}
                    className="flex gap-2"
                  >
                    <Input
                      ref={inputRef}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Type your message..."
                      disabled={isLoading}
                      className="flex-1 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                    />
                    <Button
                      type="submit"
                      size="icon"
                      disabled={!message.trim() || isLoading}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </form>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                    <div>
                      Press <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">⌘</kbd> + 
                      <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400 mx-1">⇧</kbd> + 
                      <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">K</kbd> to toggle
                    </div>
                    {learningStats && (
                      <div className="flex items-center gap-1">
                        <Brain className="w-3 h-3 text-purple-500" />
                        <span>{learningStats.totalInsights} insights</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Minimized State Click Handler */}
            {chatState === 'minimized' && (
              <div 
                className="absolute inset-0 cursor-pointer" 
                onClick={() => setChatState('normal')}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
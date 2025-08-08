'use client';

import React, { useState, useCallback } from 'react';
import { format } from 'date-fns';
import { useConvexQuery, useConvexMutation } from '@/lib/api-client';
// import { api } from '../../../../convex/_generated/api';
// import { Id } from '../../../../convex/_generated/dataModel';
import { useUser } from '@clerk/nextjs';

// Types
import {
  DocumentComment,
  DocumentSuggestion,
  CommentStatus,
  SuggestionStatus
} from '@/types/collaborative-editor.types';

// UI Components
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Icons
import {
  MessageCircle,
  MessageSquare,
  Plus,
  Send,
  Reply,
  Check,
  Edit3,
  Trash2,
  ThumbsUp,
  ThumbsDown,
  MoreHorizontal
} from 'lucide-react';

import { cn } from '@/lib/utils';

// ============================================================================
// COMMENTS SIDEBAR COMPONENT
// ============================================================================

interface CommentsSidebarProps {
  documentId: Id<"collaborativeDocuments">;
  selectedText?: {
    content: string;
    start: number;
    end: number;
  };
  className?: string;
}

export const CommentsSidebar: React.FC<CommentsSidebarProps> = ({
  documentId,
  selectedText,
  className
}) => {
  const { user: clerkUser } = useUser();
  const userId = clerkUser?.id as Id<"users">;

  // State
  const [activeTab, setActiveTab] = useState<'comments' | 'suggestions'>('comments');
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<Id<"documentComments"> | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);

  // Queries
  const { data: comments = [], isLoading: loadingComments } = useConvexQuery(
    api.collaborativeDocuments.getComments,
    documentId ? { documentId } : "skip"
  );

  const { data: suggestions = [], isLoading: loadingSuggestions } = useConvexQuery(
    api.collaborativeDocuments.getSuggestions,
    documentId ? { documentId } : "skip"
  );

  // Mutations
  const addComment = useConvexMutation(api.collaborativeDocuments.addComment);
  const replyToComment = useConvexMutation(api.collaborativeDocuments.replyToComment);
  const resolveComment = useConvexMutation(api.collaborativeDocuments.resolveComment);
  const deleteComment = useConvexMutation(api.collaborativeDocuments.deleteComment);
  const addSuggestion = useConvexMutation(api.collaborativeDocuments.addSuggestion);
  const reviewSuggestion = useConvexMutation(api.collaborativeDocuments.reviewSuggestion);

  // ============================================================================
  // COMMENT HANDLERS
  // ============================================================================

  const handleAddComment = useCallback(async () => {
    if (!newComment.trim() || !userId || !selectedText) return;

    try {
      await addComment.execute({
        documentId,
        content: newComment,
        position: selectedText.start,
        length: selectedText.end - selectedText.start,
        userId,
        userName: clerkUser?.fullName || clerkUser?.emailAddresses[0]?.emailAddress || 'Anonymous'
      });

      setNewComment('');
      setIsAddingComment(false);
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  }, [newComment, userId, selectedText, documentId, clerkUser, addComment]);

  const handleReply = useCallback(async (commentId: Id<"documentComments">) => {
    if (!replyText.trim() || !userId) return;

    try {
      await replyToComment.execute({
        commentId,
        content: replyText,
        userId,
        userName: clerkUser?.fullName || clerkUser?.emailAddresses[0]?.emailAddress || 'Anonymous'
      });

      setReplyText('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Error replying to comment:', error);
    }
  }, [replyText, userId, clerkUser, replyToComment]);

  const handleResolveComment = useCallback(async (commentId: Id<"documentComments">) => {
    if (!userId) return;

    try {
      await resolveComment.execute({
        commentId,
        resolvedBy: userId
      });
    } catch (error) {
      console.error('Error resolving comment:', error);
    }
  }, [userId, resolveComment]);

  const handleDeleteComment = useCallback(async (commentId: Id<"documentComments">) => {
    try {
      await deleteComment.execute({ commentId });
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  }, [deleteComment]);

  // ============================================================================
  // SUGGESTION HANDLERS
  // ============================================================================

  const handleReviewSuggestion = useCallback(async (
    suggestionId: Id<"documentSuggestions">,
    status: 'accepted' | 'rejected',
    comment?: string
  ) => {
    if (!userId) return;

    try {
      const reviewArgs: {
        suggestionId: Id<"documentSuggestions">;
        status: 'accepted' | 'rejected';
        reviewedBy: string;
        reviewComment?: string;
      } = {
        suggestionId,
        status,
        reviewedBy: userId
      };
      if (comment) {
        reviewArgs.reviewComment = comment;
      }
      await reviewSuggestion.execute(reviewArgs);
    } catch (error) {
      console.error('Error reviewing suggestion:', error);
    }
  }, [userId, reviewSuggestion]);

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const getCommentStatusColor = (status: CommentStatus) => {
    switch (status) {
      case 'active':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/70 dark:text-blue-300';
      case 'resolved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/70 dark:text-green-300';
      case 'deleted':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getSuggestionStatusColor = (status: SuggestionStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/70 dark:text-yellow-300';
      case 'accepted':
        return 'bg-green-100 text-green-800 dark:bg-green-900/70 dark:text-green-300';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900/70 dark:text-red-300';
      case 'outdated':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const renderComment = (comment: DocumentComment) => (
    <Card key={comment._id} className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs">
                {comment.userName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{comment.userName}</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(comment.createdAt), 'MMM dd, HH:mm')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getCommentStatusColor(comment.status)} variant="outline">
              {comment.status}
            </Badge>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48" align="end">
                <div className="space-y-1">
                  {comment.status === 'active' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => handleResolveComment(comment._id)}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Resolve
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setReplyingTo(comment._id)}
                  >
                    <Reply className="h-4 w-4 mr-2" />
                    Reply
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-destructive"
                    onClick={() => handleDeleteComment(comment._id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-3">{comment.content}</p>
        
        {/* Replies */}
        {comment.replies.length > 0 && (
          <div className="space-y-3 border-l-2 border-muted pl-4">
            {comment.replies.map(replyId => {
              const reply = comments?.find(c => c._id === replyId);
              if (!reply) return null;
              
              return (
                <div key={reply._id} className="bg-muted/30 p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="text-xs">
                        {reply.userName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-xs font-medium">{reply.userName}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(reply.createdAt), 'MMM dd, HH:mm')}
                    </p>
                  </div>
                  <p className="text-sm">{reply.content}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Reply form */}
        {replyingTo === comment._id && (
          <div className="mt-3 space-y-2">
            <Textarea
              placeholder="Write a reply..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="min-h-[80px]"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => handleReply(comment._id)}>
                <Send className="h-4 w-4 mr-2" />
                Reply
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReplyingTo(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderSuggestion = (suggestion: DocumentSuggestion) => (
    <Card key={suggestion._id} className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs">
                {suggestion.userName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{suggestion.userName}</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(suggestion.createdAt), 'MMM dd, HH:mm')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getSuggestionStatusColor(suggestion.status)} variant="outline">
              {suggestion.status}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">
              {suggestion.type.charAt(0).toUpperCase() + suggestion.type.slice(1)} suggestion
            </p>
            
            {suggestion.type === 'replace' && (
              <div className="space-y-2">
                <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded border-l-4 border-red-400">
                  <p className="text-xs text-muted-foreground">Original:</p>
                  <p className="text-sm line-through">{suggestion.originalContent}</p>
                </div>
                <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded border-l-4 border-green-400">
                  <p className="text-xs text-muted-foreground">Suggested:</p>
                  <p className="text-sm">{suggestion.suggestedContent}</p>
                </div>
              </div>
            )}

            {suggestion.type === 'insert' && (
              <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded border-l-4 border-green-400">
                <p className="text-xs text-muted-foreground">Insert:</p>
                <p className="text-sm">{suggestion.suggestedContent}</p>
              </div>
            )}

            {suggestion.type === 'delete' && (
              <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded border-l-4 border-red-400">
                <p className="text-xs text-muted-foreground">Delete:</p>
                <p className="text-sm line-through">{suggestion.originalContent}</p>
              </div>
            )}
          </div>

          {suggestion.reason && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Reason:</p>
              <p className="text-sm">{suggestion.reason}</p>
            </div>
          )}

          {suggestion.status === 'pending' && (
            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                onClick={() => handleReviewSuggestion(suggestion._id, 'accepted')}
              >
                <ThumbsUp className="h-4 w-4 mr-2" />
                Accept
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleReviewSuggestion(suggestion._id, 'rejected')}
              >
                <ThumbsDown className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </div>
          )}

          {suggestion.reviewedBy && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                {suggestion.status === 'accepted' ? 'Accepted' : 'Rejected'} by {suggestion.reviewedBy}
                {suggestion.reviewedAt && ` on ${format(new Date(suggestion.reviewedAt), 'MMM dd, HH:mm')}`}
              </p>
              {suggestion.reviewComment && (
                <p className="text-sm mt-1">{suggestion.reviewComment}</p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className={cn("w-80 border-l bg-muted/30", className)}>
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium">Comments & Suggestions</h3>
          {selectedText && (
            <Dialog open={isAddingComment} onOpenChange={setIsAddingComment}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Comment</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Selected text:</p>
                    <div className="p-2 bg-muted rounded">
                      <p className="text-sm">{selectedText.content}</p>
                    </div>
                  </div>
                  <Textarea
                    placeholder="Write your comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddingComment(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddComment}>
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Add Comment
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="flex bg-muted rounded-lg p-1">
          <Button
            variant={activeTab === 'comments' ? 'default' : 'ghost'}
            size="sm"
            className="flex-1"
            onClick={() => setActiveTab('comments')}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Comments ({comments?.length || 0})
          </Button>
          <Button
            variant={activeTab === 'suggestions' ? 'default' : 'ghost'}
            size="sm"
            className="flex-1"
            onClick={() => setActiveTab('suggestions')}
          >
            <Edit3 className="h-4 w-4 mr-2" />
            Suggestions ({suggestions?.length || 0})
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="p-4">
          {activeTab === 'comments' && (
            <div>
              {loadingComments ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : !comments || comments.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No comments yet</p>
                  <p className="text-xs text-muted-foreground">
                    Select text and click &quot;Add&quot; to start commenting
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {comments
                    ?.filter(comment => !comment.parentCommentId)
                    .map(renderComment)}
                </div>
              )}
            </div>
          )}

          {activeTab === 'suggestions' && (
            <div>
              {loadingSuggestions ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : !suggestions || suggestions.length === 0 ? (
                <div className="text-center py-8">
                  <Edit3 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No suggestions yet</p>
                  <p className="text-xs text-muted-foreground">
                    Suggestions will appear here when created
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {suggestions?.map(renderSuggestion)}
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

// ============================================================================
// SUGGESTION MODAL COMPONENT
// ============================================================================

interface SuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedText: {
    content: string;
    start: number;
    end: number;
  };
  onAddSuggestion: (
    type: 'insert' | 'delete' | 'replace',
    originalContent: string,
    suggestedContent: string,
    reason?: string
  ) => void;
}

export const SuggestionModal: React.FC<SuggestionModalProps> = ({
  isOpen,
  onClose,
  selectedText,
  onAddSuggestion
}) => {
  const [suggestionType, setSuggestionType] = useState<'insert' | 'delete' | 'replace'>('replace');
  const [suggestedContent, setSuggestedContent] = useState('');
  const [reason, setReason] = useState('');

  const handleSubmit = () => {
    if (!suggestedContent.trim() && suggestionType !== 'delete') return;

    onAddSuggestion(
      suggestionType,
      selectedText.content,
      suggestedContent,
      reason || undefined
    );

    // Reset form
    setSuggestedContent('');
    setReason('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Suggest Changes</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Selected text:</p>
            <div className="p-2 bg-muted rounded">
              <p className="text-sm">{selectedText.content}</p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Suggestion Type</label>
            <div className="mt-2 space-y-2">
              {(['replace', 'insert', 'delete'] as const).map(type => (
                <label key={type} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="suggestionType"
                    value={type}
                    checked={suggestionType === type}
                    onChange={(e) => setSuggestionType(e.target.value as 'replace' | 'insert' | 'delete')}
                  />
                  <span className="text-sm capitalize">{type}</span>
                </label>
              ))}
            </div>
          </div>

          {suggestionType !== 'delete' && (
            <div>
              <label className="text-sm font-medium">
                {suggestionType === 'replace' ? 'Replace with:' : 'Insert text:'}
              </label>
              <Textarea
                value={suggestedContent}
                onChange={(e) => setSuggestedContent(e.target.value)}
                placeholder={`Enter your ${suggestionType === 'replace' ? 'replacement' : 'insertion'} text...`}
                className="mt-2"
              />
            </div>
          )}

          <div>
            <label className="text-sm font-medium">Reason (optional)</label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why you're suggesting this change..."
              className="mt-2"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            <Edit3 className="h-4 w-4 mr-2" />
            Add Suggestion
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CommentsSidebar;
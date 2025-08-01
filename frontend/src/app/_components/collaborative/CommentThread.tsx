"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  MessageSquare,
  Send,
  MoreVertical,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  AtSign,
  Paperclip,
  ThumbsUp,
  Reply,
  Clock,
  Check,
  CheckCheck,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface Mention {
  id: string;
  userId: string;
  userName: string;
  position: number;
}

interface Comment {
  id: string;
  content: string;
  author: User;
  createdAt: Date;
  updatedAt?: Date;
  isEdited?: boolean;
  isDeleted?: boolean;
  parentId?: string;
  mentions?: Mention[];
  reactions?: {
    userId: string;
    type: string;
  }[];
  status?: 'sent' | 'delivered' | 'read';
  attachments?: {
    id: string;
    name: string;
    size: number;
    type: string;
    url: string;
  }[];
}

interface CommentThreadProps {
  threadId: string;
  comments: Comment[];
  currentUser: User;
  onAddComment: (content: string, parentId?: string, mentions?: Mention[]) => Promise<void>;
  onEditComment?: (commentId: string, content: string) => Promise<void>;
  onDeleteComment?: (commentId: string) => Promise<void>;
  onResolve?: () => Promise<void>;
  onReaction?: (commentId: string, reaction: string) => Promise<void>;
  isResolved?: boolean;
  allowResolve?: boolean;
  allowEdit?: boolean;
  allowDelete?: boolean;
  placeholder?: string;
  className?: string;
  users?: User[]; // For @mentions
}

export function CommentThread({
  threadId,
  comments,
  currentUser,
  onAddComment,
  onEditComment,
  onDeleteComment,
  onResolve,
  onReaction,
  isResolved = false,
  allowResolve = true,
  allowEdit = true,
  allowDelete = true,
  placeholder = "Add a comment...",
  className,
  users = [],
}: CommentThreadProps) {
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Filter users for mentions
  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(mentionSearch.toLowerCase()) ||
    user.email.toLowerCase().includes(mentionSearch.toLowerCase())
  );

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSubmit = async () => {
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      // Extract mentions from the comment
      const mentions: Mention[] = [];
      const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
      let match;
      while ((match = mentionRegex.exec(newComment)) !== null) {
        mentions.push({
          id: `mention-${Date.now()}-${match[2]}`,
          userId: match[2],
          userName: match[1],
          position: match.index,
        });
      }

      await onAddComment(newComment, replyingTo || undefined, mentions);
      setNewComment('');
      setReplyingTo(null);
      toast.success('Comment added');
    } catch (error) {
      toast.error('Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (commentId: string) => {
    if (!editContent.trim() || !onEditComment) return;

    try {
      await onEditComment(commentId, editContent);
      setEditingComment(null);
      setEditContent('');
      toast.success('Comment updated');
    } catch (error) {
      toast.error('Failed to update comment');
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!onDeleteComment) return;
    
    if (confirm('Are you sure you want to delete this comment?')) {
      try {
        await onDeleteComment(commentId);
        toast.success('Comment deleted');
      } catch (error) {
        toast.error('Failed to delete comment');
      }
    }
  };

  const handleResolve = async () => {
    if (!onResolve) return;

    try {
      await onResolve();
      toast.success(isResolved ? 'Thread reopened' : 'Thread resolved');
    } catch (error) {
      toast.error('Failed to update thread status');
    }
  };

  const insertMention = (user: User) => {
    const mention = `@[${user.name}](${user.id})`;
    const cursorPosition = textareaRef.current?.selectionStart || 0;
    const textBefore = newComment.slice(0, cursorPosition);
    const textAfter = newComment.slice(cursorPosition);
    
    // Remove the @ and search text
    const lastAtIndex = textBefore.lastIndexOf('@');
    const cleanTextBefore = textBefore.slice(0, lastAtIndex);
    
    setNewComment(cleanTextBefore + mention + ' ' + textAfter);
    setShowMentions(false);
    setMentionSearch('');
    
    // Focus back on textarea
    setTimeout(() => {
      textareaRef.current?.focus();
      const newPosition = cleanTextBefore.length + mention.length + 1;
      textareaRef.current?.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showMentions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex(prev => 
          prev < filteredUsers.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex(prev => 
          prev > 0 ? prev - 1 : filteredUsers.length - 1
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredUsers[selectedMentionIndex]) {
          insertMention(filteredUsers[selectedMentionIndex]);
        }
      } else if (e.key === 'Escape') {
        setShowMentions(false);
        setMentionSearch('');
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNewComment(value);
    
    // Check for @ mentions
    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = value.slice(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1 && lastAtIndex === textBeforeCursor.length - 1) {
      setShowMentions(true);
      setMentionSearch('');
      setSelectedMentionIndex(0);
    } else if (lastAtIndex !== -1 && textBeforeCursor[lastAtIndex - 1] === ' ') {
      const searchText = textBeforeCursor.slice(lastAtIndex + 1);
      if (!searchText.includes(' ')) {
        setShowMentions(true);
        setMentionSearch(searchText);
        setSelectedMentionIndex(0);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  const renderComment = (comment: Comment, isReply = false) => {
    const replies = comments.filter(c => c.parentId === comment.id);
    const isAuthor = comment.author.id === currentUser.id;
    const isEditing = editingComment === comment.id;

    if (comment.isDeleted) {
      return (
        <div className={cn('opacity-50', isReply && 'ml-12')}>
          <p className="text-sm text-muted-foreground italic">Comment deleted</p>
        </div>
      );
    }

    return (
      <div key={comment.id} className={cn('group', isReply && 'ml-12')}>
        <div className="flex gap-3">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage src={comment.author.avatar} />
            <AvatarFallback className="text-xs">
              {getUserInitials(comment.author.name)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{comment.author.name}</span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(comment.createdAt, { addSuffix: true })}
              </span>
              {comment.isEdited && (
                <span className="text-xs text-muted-foreground">(edited)</span>
              )}
              {comment.status && (
                <span className="text-xs text-muted-foreground">
                  {comment.status === 'read' ? (
                    <CheckCheck className="h-3 w-3 inline" />
                  ) : comment.status === 'delivered' ? (
                    <Check className="h-3 w-3 inline" />
                  ) : null}
                </span>
              )}
            </div>
            
            {isEditing ? (
              <div className="space-y-2">
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="min-h-[60px]"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleEdit(comment.id)}
                    disabled={!editContent.trim()}
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingComment(null);
                      setEditContent('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-sm whitespace-pre-wrap">
                {renderCommentContent(comment.content)}
              </div>
            )}
            
            {comment.attachments && comment.attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {comment.attachments.map(attachment => (
                  <Badge key={attachment.id} variant="secondary" className="gap-1">
                    <Paperclip className="h-3 w-3" />
                    {attachment.name}
                  </Badge>
                ))}
              </div>
            )}
            
            <div className="flex items-center gap-2 mt-1">
              {!isReply && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setReplyingTo(comment.id)}
                >
                  <Reply className="h-3 w-3 mr-1" />
                  Reply
                </Button>
              )}
              
              {onReaction && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => onReaction(comment.id, 'like')}
                >
                  <ThumbsUp className="h-3 w-3 mr-1" />
                  {comment.reactions?.filter(r => r.type === 'like').length || 0}
                </Button>
              )}
              
              {isAuthor && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {allowEdit && onEditComment && (
                      <DropdownMenuItem
                        onClick={() => {
                          setEditingComment(comment.id);
                          setEditContent(comment.content);
                        }}
                      >
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                    )}
                    {allowDelete && onDeleteComment && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(comment.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>
        
        {replies.length > 0 && (
          <div className="mt-4 space-y-4">
            {replies.map(reply => renderComment(reply, true))}
          </div>
        )}
        
        {replyingTo === comment.id && (
          <div className="ml-11 mt-3">
            <div className="flex gap-2">
              <Textarea
                ref={textareaRef}
                value={newComment}
                onChange={handleTextChange}
                onKeyDown={handleKeyDown}
                placeholder="Write a reply..."
                className="min-h-[60px]"
                autoFocus
              />
            </div>
            <div className="flex gap-2 mt-2">
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={!newComment.trim() || isSubmitting}
              >
                Reply
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setReplyingTo(null);
                  setNewComment('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderCommentContent = (content: string) => {
    // Replace mentions with styled spans
    return content.split(/(@\[[^\]]+\]\([^)]+\))/g).map((part, index) => {
      if (part.startsWith('@[')) {
        const match = part.match(/@\[([^\]]+)\]\(([^)]+)\)/);
        if (match) {
          return (
            <span key={index} className="text-primary font-medium">
              @{match[1]}
            </span>
          );
        }
      }
      return part;
    });
  };

  // Group comments by parent
  const topLevelComments = comments.filter(c => !c.parentId);

  return (
    <Card className={cn('relative', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            <CardTitle className="text-lg">Comments</CardTitle>
            <Badge variant="secondary">{comments.length}</Badge>
          </div>
          {allowResolve && onResolve && (
            <Button
              variant={isResolved ? 'outline' : 'default'}
              size="sm"
              onClick={handleResolve}
            >
              {isResolved ? (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Reopen
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Resolve
                </>
              )}
            </Button>
          )}
        </div>
        {isResolved && (
          <CardDescription className="flex items-center gap-1 text-green-600">
            <CheckCircle className="h-4 w-4" />
            This thread has been resolved
          </CardDescription>
        )}
      </CardHeader>
      
      <CardContent className="space-y-6">
        {topLevelComments.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No comments yet. Start the conversation!
          </p>
        ) : (
          topLevelComments.map(comment => renderComment(comment))
        )}
        
        {!replyingTo && !isResolved && (
          <div className="relative">
            <div className="flex gap-3">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src={currentUser.avatar} />
                <AvatarFallback className="text-xs">
                  {getUserInitials(currentUser.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Textarea
                  ref={textareaRef}
                  value={newComment}
                  onChange={handleTextChange}
                  onKeyDown={handleKeyDown}
                  placeholder={placeholder}
                  className="min-h-[80px]"
                />
                {showMentions && filteredUsers.length > 0 && (
                  <Card className="absolute z-10 mt-1 w-64 max-h-48 overflow-y-auto">
                    <CardContent className="p-1">
                      {filteredUsers.map((user, index) => (
                        <button
                          key={user.id}
                          className={cn(
                            'flex items-center gap-2 w-full p-2 rounded hover:bg-muted text-left',
                            index === selectedMentionIndex && 'bg-muted'
                          )}
                          onClick={() => insertMention(user)}
                        >
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={user.avatar} />
                            <AvatarFallback className="text-xs">
                              {getUserInitials(user.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{user.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                          </div>
                        </button>
                      ))}
                    </CardContent>
                  </Card>
                )}
                <div className="flex items-center justify-between mt-2">
                  <div className="flex gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <AtSign className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Mention someone</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Paperclip className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Attach file</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleSubmit}
                    disabled={!newComment.trim() || isSubmitting}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
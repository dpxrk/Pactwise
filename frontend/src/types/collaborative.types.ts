/**
 * Collaborative editing and document types to replace 'any' usage
 */

import type { Id } from '@/types/id.types';

// Document Types
export interface CollaborativeDocument {
  _id: Id<"collaborativeDocuments">;
  enterpriseId: Id<"enterprises">;
  title: string;
  content: string;
  type: 'contract' | 'proposal' | 'agreement' | 'memo' | 'other';
  status: 'draft' | 'review' | 'approved' | 'archived';
  createdBy: Id<"users">;
  lastModifiedBy: Id<"users">;
  createdAt: string;
  updatedAt: string;
  version: number;
  isLocked?: boolean;
  lockedBy?: Id<"users">;
  tags?: string[];
}

// Version Control Types
export interface DocumentVersion {
  _id: string;
  documentId: Id<"collaborativeDocuments">;
  version: number;
  content: string;
  changes: DocumentChange[];
  createdBy: Id<"users">;
  createdAt: string;
  message?: string;
}

export interface DocumentChange {
  type: 'addition' | 'deletion' | 'modification';
  position: number;
  content: string;
  previousContent?: string;
}

// Comment and Suggestion Types
export interface DocumentComment {
  _id: string;
  documentId: Id<"collaborativeDocuments">;
  userId: Id<"users">;
  content: string;
  position: {
    start: number;
    end: number;
  };
  threadId?: string;
  parentId?: string;
  status: 'active' | 'resolved' | 'deleted';
  createdAt: string;
  updatedAt?: string;
}

export interface DocumentSuggestion {
  _id: string;
  documentId: Id<"collaborativeDocuments">;
  userId: Id<"users">;
  type: 'addition' | 'deletion' | 'replacement' | 'comment';
  originalText?: string;
  suggestedText: string;
  position: {
    start: number;
    end: number;
  };
  reason?: string;
  status: 'pending' | 'accepted' | 'rejected';
  reviewedBy?: Id<"users">;
  reviewedAt?: string;
  createdAt: string;
}

// Real-time Collaboration Types
export interface CollaboratorPresence {
  userId: Id<"users">;
  documentId: Id<"collaborativeDocuments">;
  cursor?: {
    position: number;
    selection?: {
      start: number;
      end: number;
    };
  };
  color: string;
  lastSeen: string;
  isActive: boolean;
}

export interface EditOperation {
  type: 'insert' | 'delete' | 'format';
  position: number;
  content?: string;
  length?: number;
  attributes?: Record<string, unknown>;
  userId: Id<"users">;
  timestamp: string;
}

// Conflict Resolution Types
export interface EditConflict {
  id: string;
  documentId: Id<"collaborativeDocuments">;
  position: number;
  localChange: EditOperation;
  remoteChange: EditOperation;
  status: 'unresolved' | 'resolved';
  resolution?: 'accept_local' | 'accept_remote' | 'merge';
  resolvedBy?: Id<"users">;
  resolvedAt?: string;
}

// Review Types
export interface DocumentReview {
  _id: string;
  documentId: Id<"collaborativeDocuments">;
  reviewerId: Id<"users">;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  comments: ReviewComment[];
  decision?: 'approve' | 'reject' | 'request_changes';
  startedAt: string;
  completedAt?: string;
}

export interface ReviewComment {
  id: string;
  content: string;
  severity: 'info' | 'warning' | 'error';
  position?: {
    start: number;
    end: number;
  };
  resolved?: boolean;
}

// Editor Configuration Types
export interface EditorConfig {
  theme: 'light' | 'dark';
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  showLineNumbers: boolean;
  wordWrap: boolean;
  autoSave: boolean;
  autoSaveInterval: number;
  spellCheck: boolean;
  collaborativeFeatures: {
    showCursors: boolean;
    showPresence: boolean;
    allowComments: boolean;
    allowSuggestions: boolean;
  };
}

// Document Export Types
export interface DocumentExportOptions {
  format: 'pdf' | 'docx' | 'html' | 'markdown';
  includeComments: boolean;
  includeVersionHistory: boolean;
  includeMetadata: boolean;
  watermark?: string;
}

// Document Template Types
export interface DocumentTemplate {
  _id: string;
  name: string;
  description?: string;
  type: CollaborativeDocument['type'];
  content: string;
  placeholders: TemplatePlaceholder[];
  category?: string;
  isPublic: boolean;
  createdBy: Id<"users">;
  createdAt: string;
}

export interface TemplatePlaceholder {
  key: string;
  label: string;
  type: 'text' | 'date' | 'number' | 'dropdown';
  required: boolean;
  defaultValue?: string;
  options?: string[];
}

// Keyboard Event Types
export interface EditorKeyboardEvent {
  key: string;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
  preventDefault: () => void;
}

// Paste Event Types
export interface EditorPasteEvent {
  clipboardData: {
    getData: (format: string) => string;
    types: readonly string[];
  };
  preventDefault: () => void;
}

// Type Guards
export function isEditOperation(op: unknown): op is EditOperation {
  return (
    typeof op === 'object' &&
    op !== null &&
    'type' in op &&
    'position' in op &&
    'userId' in op &&
    'timestamp' in op
  );
}

export function isDocumentSuggestion(data: unknown): data is DocumentSuggestion {
  return (
    typeof data === 'object' &&
    data !== null &&
    'type' in data &&
    'suggestedText' in data &&
    'position' in data
  );
}
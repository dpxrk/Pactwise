// src/types/collaborative-editor.types.ts
import { Id } from "./id.types";

// ============================================================================
// CORE OPERATION TYPES - Foundation for Operational Transformation
// ============================================================================

export type OperationType = 'insert' | 'delete' | 'retain' | 'format';

export interface BaseOperation {
  type: OperationType;
  position: number;
  userId: Id<"users">;
  timestamp: number;
  id: string; // Unique operation ID
}

export interface InsertOperation extends BaseOperation {
  type: 'insert';
  content: string;
  attributes?: TextAttributes;
}

export interface DeleteOperation extends BaseOperation {
  type: 'delete';
  length: number;
}

export interface RetainOperation extends BaseOperation {
  type: 'retain';
  length: number;
  attributes?: TextAttributes;
}

export interface FormatOperation extends BaseOperation {
  type: 'format';
  length: number;
  attributes: TextAttributes;
}

export type DocumentOperation = InsertOperation | DeleteOperation | RetainOperation | FormatOperation;

// ============================================================================
// TEXT FORMATTING AND ATTRIBUTES
// ============================================================================

export interface TextAttributes {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  backgroundColor?: string;
  link?: string;
  header?: 1 | 2 | 3 | 4 | 5 | 6;
  list?: 'ordered' | 'unordered';
  align?: 'left' | 'center' | 'right' | 'justify';
  indent?: number;
}

export interface TextSpan {
  content: string;
  attributes?: TextAttributes;
  start: number;
  end: number;
}

// ============================================================================
// DOCUMENT STRUCTURE
// ============================================================================

export interface DocumentState {
  content: string;
  operations: DocumentOperation[];
  version: number;
  lastModified: number;
  spans: TextSpan[]; // For rich text formatting
}

export interface CollaborativeDocument {
  _id: Id<"collaborativeDocuments">;
  _creationTime: number;
  contractId?: Id<"contracts">;
  title: string;
  state: DocumentState;
  ownerId: Id<"users">;
  collaborators: Id<"users">[];
  permissions: DocumentPermissions;
  isLocked: boolean;
  lockedBy?: Id<"users">;
  lockTimestamp?: number;
}

export interface DocumentPermissions {
  read: Id<"users">[];
  write: Id<"users">[];
  comment: Id<"users">[];
  admin: Id<"users">[];
}

// ============================================================================
// REAL-TIME COLLABORATION
// ============================================================================

export interface UserPresence {
  userId: Id<"users">;
  userName: string;
  userColor: string;
  cursor: CursorPosition;
  selection?: TextSelection;
  lastSeen: number;
  isActive: boolean;
}

export interface CursorPosition {
  position: number;
  isVisible: boolean;
}

export interface TextSelection {
  start: number;
  end: number;
  direction: 'forward' | 'backward';
}

export interface CollaborativeSession {
  _id: Id<"collaborativeSessions">;
  documentId: Id<"collaborativeDocuments">;
  users: UserPresence[];
  lastActivity: number;
  isActive: boolean;
}

// ============================================================================
// COMMENTS AND SUGGESTIONS
// ============================================================================

export type CommentStatus = 'active' | 'resolved' | 'deleted';
export type SuggestionStatus = 'pending' | 'accepted' | 'rejected' | 'outdated';

export interface DocumentComment {
  _id: Id<"documentComments">;
  documentId: Id<"collaborativeDocuments">;
  userId: Id<"users">;
  userName: string;
  content: string;
  position: number;
  length: number;
  status: CommentStatus;
  parentCommentId?: Id<"documentComments">;
  replies: Id<"documentComments">[];
  createdAt: number;
  updatedAt?: number;
  resolvedBy?: Id<"users">;
  resolvedAt?: number;
}

export interface DocumentSuggestion {
  _id: Id<"documentSuggestions">;
  documentId: Id<"collaborativeDocuments">;
  userId: Id<"users">;
  userName: string;
  type: 'insert' | 'delete' | 'replace';
  position: number;
  length: number;
  originalContent: string;
  suggestedContent: string;
  reason?: string;
  status: SuggestionStatus;
  createdAt: number;
  reviewedBy?: Id<"users">;
  reviewedAt?: number;
  reviewComment?: string;
}

// ============================================================================
// OPERATIONAL TRANSFORMATION
// ============================================================================

export interface OperationTransformResult {
  transformedOperation: DocumentOperation;
  requiresRebase: boolean;
  conflictResolution?: ConflictResolution;
}

export interface ConflictResolution {
  strategy: 'user-priority' | 'timestamp' | 'merge' | 'manual';
  winningOperation: DocumentOperation;
  losingOperation: DocumentOperation;
  mergedResult?: DocumentOperation;
}

export interface TransformContext {
  documentVersion: number;
  concurrentOperations: DocumentOperation[];
  userPriorities: Record<string, number>;
}

// ============================================================================
// VERSION HISTORY AND SNAPSHOTS
// ============================================================================

export interface DocumentSnapshot {
  _id: Id<"documentSnapshots">;
  documentId: Id<"collaborativeDocuments">;
  version: number;
  state: DocumentState;
  createdBy: Id<"users">;
  createdAt: number;
  description?: string;
  isAutoSnapshot: boolean;
}

export interface VersionDiff {
  operations: DocumentOperation[];
  addedText: TextChange[];
  removedText: TextChange[];
  modifiedFormatting: FormatChange[];
  fromVersion: number;
  toVersion: number;
}

export interface TextChange {
  position: number;
  content: string;
  userId: Id<"users">;
  timestamp: number;
}

export interface FormatChange {
  position: number;
  length: number;
  oldAttributes: TextAttributes;
  newAttributes: TextAttributes;
  userId: Id<"users">;
  timestamp: number;
}

// ============================================================================
// EDITOR EVENTS AND REAL-TIME UPDATES
// ============================================================================

export type EditorEventType = 
  | 'operation'
  | 'cursor-move'
  | 'selection-change'
  | 'user-join'
  | 'user-leave'
  | 'comment-add'
  | 'comment-resolve'
  | 'suggestion-add'
  | 'suggestion-review'
  | 'document-lock'
  | 'document-unlock';

export interface EditorEvent {
  type: EditorEventType;
  documentId: Id<"collaborativeDocuments">;
  userId: Id<"users">;
  timestamp: number;
  data: unknown;
}

export interface OperationEvent extends EditorEvent {
  type: 'operation';
  data: {
    operation: DocumentOperation;
    version: number;
  };
}

export interface CursorEvent extends EditorEvent {
  type: 'cursor-move';
  data: {
    position: number;
    selection?: TextSelection;
  };
}

export interface UserJoinEvent extends EditorEvent {
  type: 'user-join';
  data: {
    user: UserPresence;
  };
}

// ============================================================================
// EDITOR CONFIGURATION AND SETTINGS
// ============================================================================

export interface EditorConfig {
  readOnly: boolean;
  showCursors: boolean;
  showComments: boolean;
  showSuggestions: boolean;
  autoSave: boolean;
  autoSaveInterval: number; // milliseconds
  maxUndoStackSize: number;
  enableSpellCheck: boolean;
  theme: 'light' | 'dark' | 'auto';
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  maxCollaborators: number;
  operationBatchSize: number;
  conflictResolutionStrategy: ConflictResolution['strategy'];
}

// ============================================================================
// HOOKS AND UTILITIES
// ============================================================================

export interface UseCollaborativeEditorOptions {
  documentId: Id<"collaborativeDocuments">;
  userId: Id<"users">;
  config?: Partial<EditorConfig>;
  onError?: (error: Error) => void;
  onUserJoin?: (user: UserPresence) => void;
  onUserLeave?: (userId: Id<"users">) => void;
  onOperationApplied?: (operation: DocumentOperation) => void;
}

export interface CollaborativeEditorState {
  document: CollaborativeDocument | null;
  isLoading: boolean;
  isConnected: boolean;
  error: Error | null;
  presence: UserPresence[];
  currentUser: UserPresence | null;
  comments: DocumentComment[];
  suggestions: DocumentSuggestion[];
  canEdit: boolean;
  canComment: boolean;
  undoStack: DocumentOperation[];
  redoStack: DocumentOperation[];
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApplyOperationResult {
  success: boolean;
  newVersion: number;
  transformedOperation?: DocumentOperation;
  conflicts?: ConflictResolution[];
  error?: string;
}

export interface CreateDocumentResult {
  success: boolean;
  documentId?: Id<"collaborativeDocuments">;
  error?: string;
}

export interface JoinSessionResult {
  success: boolean;
  session?: CollaborativeSession;
  userPresence?: UserPresence;
  error?: string;
}

// ============================================================================
// CONSTANTS AND ENUMS
// ============================================================================

export const EDITOR_CONSTANTS = {
  MAX_OPERATION_SIZE: 10000,
  MAX_DOCUMENT_SIZE: 5000000, // 5MB
  AUTO_SAVE_INTERVAL: 30000, // 30 seconds
  PRESENCE_UPDATE_INTERVAL: 1000, // 1 second
  CURSOR_BLINK_INTERVAL: 530, // milliseconds
  OPERATION_BATCH_TIMEOUT: 100, // milliseconds
  MAX_UNDO_STACK_SIZE: 100,
  CONFLICT_RESOLUTION_TIMEOUT: 5000, // 5 seconds
} as const;

export const USER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA'
] as const;

// ============================================================================
// ERROR TYPES
// ============================================================================

export class CollaborativeEditorError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'CollaborativeEditorError';
  }
}

export class OperationTransformError extends CollaborativeEditorError {
  constructor(message: string, details?: unknown) {
    super(message, 'OPERATION_TRANSFORM_ERROR', details);
  }
}

export class ConflictResolutionError extends CollaborativeEditorError {
  constructor(message: string, details?: unknown) {
    super(message, 'CONFLICT_RESOLUTION_ERROR', details);
  }
}

export class PermissionError extends CollaborativeEditorError {
  constructor(message: string, details?: unknown) {
    super(message, 'PERMISSION_ERROR', details);
  }
}

// ============================================================================
// TYPE GUARDS AND UTILITIES
// ============================================================================

export const isInsertOperation = (op: DocumentOperation): op is InsertOperation => 
  op.type === 'insert';

export const isDeleteOperation = (op: DocumentOperation): op is DeleteOperation => 
  op.type === 'delete';

export const isRetainOperation = (op: DocumentOperation): op is RetainOperation => 
  op.type === 'retain';

export const isFormatOperation = (op: DocumentOperation): op is FormatOperation => 
  op.type === 'format';

export const hasAttributes = (op: DocumentOperation): boolean => 
  'attributes' in op && op.attributes !== undefined;

export const getOperationLength = (op: DocumentOperation): number => {
  switch (op.type) {
    case 'insert':
      return op.content.length;
    case 'delete':
    case 'retain':
    case 'format':
      return op.length;
    default:
      return 0;
  }
};
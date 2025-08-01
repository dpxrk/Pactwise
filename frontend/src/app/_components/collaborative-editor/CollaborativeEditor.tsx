'use client';

import React, { 
  useRef, 
  useEffect, 
  useState, 
  useCallback, 
  useMemo,
  KeyboardEvent,
  ClipboardEvent,
  MouseEvent
} from 'react';
// import { useQuery, useMutation } from 'convex/react';
// import { api } from '../../../../convex/_generated/api';
// import { Id } from '../../../../convex/_generated/dataModel';
import { useUser } from '@clerk/nextjs';

// Core editor functionality
// import { OperationalTransform, DocumentStateManager } from '@/lib/collaborative-editor/operational-transform';
import { PresenceManager, CursorUtils } from '@/lib/collaborative-editor/presence-manager';

// Types
import {
  CollaborativeDocument,
  DocumentOperation,
  InsertOperation,
  DeleteOperation,
  FormatOperation,
  UserPresence,
  EditorConfig,
  CollaborativeEditorState,
  TextAttributes,
  EditorEvent,
  EDITOR_CONSTANTS,
  CollaborativeEditorError
} from '@/types/collaborative-editor.types';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Icons
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Quote,
  Save,
  Users,
  Eye,
  MessageCircle,
  History,
  Undo,
  Redo,
  Type,
  Palette,
  Link,
  AlertCircle
} from 'lucide-react';

import { cn } from '@/lib/utils';

// ============================================================================
// COLLABORATIVE EDITOR COMPONENT
// ============================================================================

interface CollaborativeEditorProps {
  documentId: string; // Simplify to string to avoid deep type nesting
  contractId?: string;
  initialContent?: string;
  config?: Partial<EditorConfig>;
  className?: string;
  onSave?: (content: string) => void;
  onError?: (error: Error) => void;
}

const defaultConfig: EditorConfig = {
  readOnly: false,
  showCursors: true,
  showComments: true,
  showSuggestions: true,
  autoSave: true,
  autoSaveInterval: EDITOR_CONSTANTS.AUTO_SAVE_INTERVAL,
  maxUndoStackSize: EDITOR_CONSTANTS.MAX_UNDO_STACK_SIZE,
  enableSpellCheck: true,
  theme: 'light',
  fontSize: 14,
  fontFamily: 'var(--font-sans)',
  lineHeight: 1.6,
  maxCollaborators: 10,
  operationBatchSize: 50,
  conflictResolutionStrategy: 'timestamp'
};

export const CollaborativeEditor: React.FC<CollaborativeEditorProps> = ({
  documentId,
  contractId,
  initialContent = '',
  config: userConfig,
  className,
  onSave,
  onError
}) => {
  const { user: clerkUser } = useUser();
  const userId = clerkUser?.id;
  
  // Refs
  const editorRef = useRef<HTMLDivElement>(null);
  const presenceManagerRef = useRef<PresenceManager | null>(null);
  const operationQueueRef = useRef<DocumentOperation[]>([]);
  const isApplyingOperationRef = useRef(false);
  
  // State
  const [editorState, setEditorState] = useState<CollaborativeEditorState>({
    document: null,
    isLoading: true,
    isConnected: false,
    error: null,
    presence: [],
    currentUser: null,
    comments: [],
    suggestions: [],
    canEdit: false,
    canComment: false,
    undoStack: [],
    redoStack: []
  });

  const [currentSelection, setCurrentSelection] = useState<{
    start: number;
    end: number;
  } | null>(null);

  const [activeFormat, setActiveFormat] = useState<TextAttributes>({});

  // Merged configuration
  const config = useMemo(() => ({
    ...defaultConfig,
    ...userConfig
  }), [userConfig]);

  // Mock document data and mutations - replace with Supabase implementation
  const document = documentId ? {
    _id: documentId,
    title: 'Collaborative Document',
    content: initialContent || 'Start typing here...',
    version: 1,
    lastModified: Date.now(),
    permissions: { canEdit: true, canComment: true }
  } : null;
  const isLoading = false;

  const presence = [
    {
      userId: userId || 'user1',
      userName: clerkUser?.fullName || 'Current User',
      userColor: '#3B82F6',
      cursor: { position: 0, isVisible: true },
      lastSeen: Date.now(),
      isActive: true
    }
  ];

  // Mock operations - replace with Supabase implementation
  const applyOperation = async (params: any) => {
    console.log('Applying operation:', params);
    await new Promise(resolve => setTimeout(resolve, 100));
    return { success: true };
  };

  const updatePresence = async (params: any) => {
    console.log('Updating presence:', params);
    return { success: true };
  };

  const saveDocument = async (params: any) => {
    console.log('Saving document:', params);
    await new Promise(resolve => setTimeout(resolve, 500));
    return { success: true };
  };

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  useEffect(() => {
    if (!editorRef.current || !userId || !documentId) return;

    // Initialize presence manager
    presenceManagerRef.current = new PresenceManager(documentId);
    presenceManagerRef.current.setEditorElement(editorRef.current);

    // Add current user to presence
    if (clerkUser) {
      const userPresence: UserPresence = {
        userId,
        userName: clerkUser.fullName || clerkUser.emailAddresses[0]?.emailAddress || 'Anonymous',
        userColor: '#3B82F6',
        cursor: { position: 0, isVisible: false },
        lastSeen: Date.now(),
        isActive: true
      };

      presenceManagerRef.current.addUser(userPresence);
      setEditorState(prev => ({ ...prev, currentUser: userPresence }));
    }

    // Setup event listeners
    const cleanup = setupEventListeners();

    return () => {
      // Clean up event listeners
      cleanup?.();
      
      // Destroy presence manager
      presenceManagerRef.current?.destroy();
      presenceManagerRef.current = null;
      
      // Clear operation queue and timeout
      operationQueueRef.current = [];
      if (operationTimeoutRef.current) {
        clearTimeout(operationTimeoutRef.current);
        operationTimeoutRef.current = null;
      }
    };
  }, [userId, documentId, clerkUser, setupEventListeners]);

  // Update editor state when document loads
  useEffect(() => {
    if (document && !isLoading) {
      setEditorState(prev => ({
        ...prev,
        document: document as CollaborativeDocument,
        isLoading: false,
        isConnected: true,
        canEdit: document.permissions.write.includes(userId) || document.ownerId === userId,
        canComment: document.permissions.comment.includes(userId) || document.permissions.write.includes(userId) || document.ownerId === userId
      }));

      // Set initial content
      if (editorRef.current && document.state.content) {
        editorRef.current.innerHTML = formatContentForDisplay(document.state.content, document.state.spans);
      }
    }
  }, [document, isLoading, userId]);

  // Update presence
  useEffect(() => {
    if (presence && presenceManagerRef.current) {
      setEditorState(prev => ({ ...prev, presence: presence as UserPresence[] }));
      
      // Update presence manager
      presence.forEach(user => {
        if (user.userId !== userId) {
          presenceManagerRef.current?.addUser(user as UserPresence);
        }
      });
    }
  }, [presence, userId]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleInput = useCallback((event: Event) => {
    if (isApplyingOperationRef.current || !editorState.canEdit) return;

    const inputEvent = event as InputEvent;
    const editor = editorRef.current;
    if (!editor) return;

    try {
      const operation = createOperationFromInput(inputEvent, editor);
      if (operation) {
        queueOperation(operation);
      }
    } catch (error) {
      console.error('Error handling input:', error);
      onError?.(error as Error);
    }
  }, [editorState.canEdit, onError, queueOperation]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!editorState.canEdit) {
      event.preventDefault();
      return;
    }

    // Handle keyboard shortcuts
    if (event.ctrlKey || event.metaKey) {
      switch (event.key.toLowerCase()) {
        case 'b':
          event.preventDefault();
          toggleFormat('bold');
          break;
        case 'i':
          event.preventDefault();
          toggleFormat('italic');
          break;
        case 'u':
          event.preventDefault();
          toggleFormat('underline');
          break;
        case 'z':
          event.preventDefault();
          if (event.shiftKey) {
            redo();
          } else {
            undo();
          }
          break;
        case 's':
          event.preventDefault();
          handleSave();
          break;
      }
    }

    // Handle special keys
    switch (event.key) {
      case 'Enter':
        if (event.shiftKey) {
          // Insert line break
          event.preventDefault();
          insertText('\n');
        }
        break;
      case 'Tab':
        event.preventDefault();
        insertText('  '); // Insert 2 spaces
        break;
    }
  }, [editorState.canEdit, toggleFormat, undo, redo, handleSave, insertText]);

  const handlePaste = useCallback((event: ClipboardEvent) => {
    if (!editorState.canEdit) {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    const text = event.clipboardData.getData('text/plain');
    if (text) {
      insertText(text);
    }
  }, [editorState.canEdit, insertText]);

  const handleSelectionChange = useCallback(() => {
    const selection = window.getSelection();
    const editor = editorRef.current;
    
    if (!selection || !editor || !editor.contains(selection.anchorNode)) return;

    try {
      const position = CursorUtils.getCursorPositionFromSelection(editor, selection);
      const textSelection = CursorUtils.getTextSelection(editor, selection);

      setCurrentSelection(textSelection || { start: position, end: position });

      // Update presence
      if (presenceManagerRef.current && userId) {
        presenceManagerRef.current.updateCursor(userId, position, textSelection);
        
        // Send to server
        const presenceArgs: {
          documentId: Id<"collaborativeDocuments">;
          userId: string;
          cursor: { position: number; isVisible: boolean };
          selection?: { start: number; end: number };
        } = {
          documentId: documentId as Id<"collaborativeDocuments">,
          userId,
          cursor: { position, isVisible: true }
        };
        if (textSelection) {
          presenceArgs.selection = textSelection;
        }
        updatePresence(presenceArgs);
      }

      // Update active formatting
      updateActiveFormat(position);
    } catch (error) {
      console.error('Error handling selection change:', error);
    }
  }, [documentId, userId, updatePresence, updateActiveFormat]);

  const handleClick = useCallback((event: MouseEvent) => {
    // Handle clicking on comments, suggestions, etc.
  }, []);

  const handleMouseUp = useCallback((event: MouseEvent) => {
    handleSelectionChange();
  }, [handleSelectionChange]);

  const setupEventListeners = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;

    // Content change handlers
    editor.addEventListener('input', handleInput);
    editor.addEventListener('keydown', handleKeyDown);
    editor.addEventListener('paste', handlePaste);
    
    // Selection change handlers
    globalThis.document.addEventListener('selectionchange', handleSelectionChange);
    
    // Mouse handlers
    editor.addEventListener('click', handleClick);
    editor.addEventListener('mouseup', handleMouseUp);

    return () => {
      editor.removeEventListener('input', handleInput);
      editor.removeEventListener('keydown', handleKeyDown);
      editor.removeEventListener('paste', handlePaste);
      globalThis.document.removeEventListener('selectionchange', handleSelectionChange);
      editor.removeEventListener('click', handleClick);
      editor.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleInput, handleKeyDown, handlePaste, handleSelectionChange, handleClick, handleMouseUp]);

  // ============================================================================
  // OPERATION MANAGEMENT
  // ============================================================================

  const createOperationFromInput = useCallback((
    inputEvent: InputEvent,
    editor: HTMLElement
  ): DocumentOperation | null => {
    const selection = window.getSelection();
    if (!selection || !userId) return null;

    const position = CursorUtils.getCursorPositionFromSelection(editor, selection);

    switch (inputEvent.inputType) {
      case 'insertText':
      case 'insertFromPaste':
        if (inputEvent.data) {
          return {
            type: 'insert',
            position,
            content: inputEvent.data,
            userId,
            timestamp: Date.now(),
            id: generateOperationId(),
            attributes: activeFormat
          } as InsertOperation;
        }
        break;

      case 'deleteContentBackward':
      case 'deleteContentForward':
        return {
          type: 'delete',
          position: position - 1,
          length: 1,
          userId,
          timestamp: Date.now(),
          id: generateOperationId()
        } as DeleteOperation;

      case 'deleteByCut':
      case 'deleteByDrag':
        // Handle larger deletions
        const deletedLength = (inputEvent as InputEvent & { dataTransfer?: DataTransfer }).dataTransfer?.getData('text/plain')?.length || 1;
        return {
          type: 'delete',
          position,
          length: deletedLength,
          userId,
          timestamp: Date.now(),
          id: generateOperationId()
        } as DeleteOperation;
    }

    return null;
  }, [userId, activeFormat]);

  // Store timeout reference for cleanup
  const operationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const queueOperation = useCallback((operation: DocumentOperation) => {
    operationQueueRef.current.push(operation);
    
    // Clear existing timeout
    if (operationTimeoutRef.current) {
      clearTimeout(operationTimeoutRef.current);
    }
    
    // Batch operations for better performance
    operationTimeoutRef.current = setTimeout(() => {
      if (operationQueueRef.current.length > 0) {
        processOperationQueue();
      }
      operationTimeoutRef.current = null;
    }, EDITOR_CONSTANTS.OPERATION_BATCH_TIMEOUT);
  }, [processOperationQueue]);

  const processOperationQueue = useCallback(async () => {
    if (operationQueueRef.current.length === 0 || !editorState.document) return;

    const operations = [...operationQueueRef.current];
    operationQueueRef.current = [];

    try {
      for (const operation of operations) {
        await applyOperation({
          documentId: documentId as Id<"collaborativeDocuments">,
          operation
        });
      }
    } catch (error) {
      console.error('Error processing operation queue:', error);
      onError?.(error as Error);
      
      // Re-queue failed operations
      operationQueueRef.current.unshift(...operations);
    }
  }, [documentId, editorState.document, applyOperation, onError]);

  // ============================================================================
  // FORMATTING OPERATIONS
  // ============================================================================

  const toggleFormat = useCallback((formatType: keyof TextAttributes) => {
    if (!editorState.canEdit || !currentSelection) return;

    const isActive = !!activeFormat[formatType];
    const newAttributes = {
      ...activeFormat,
      [formatType]: !isActive
    };

    setActiveFormat(newAttributes);

    // Apply formatting to selection
    if (currentSelection.start !== currentSelection.end) {
      const operation: FormatOperation = {
        type: 'format',
        position: currentSelection.start,
        length: currentSelection.end - currentSelection.start,
        attributes: { [formatType]: !isActive },
        userId: userId!,
        timestamp: Date.now(),
        id: generateOperationId()
      };

      queueOperation(operation);
    }
  }, [editorState.canEdit, currentSelection, activeFormat, userId]);

  const insertText = useCallback((text: string) => {
    if (!editorState.canEdit || !userId) return;

    const position = currentSelection?.start || 0;
    const operation: InsertOperation = {
      type: 'insert',
      position,
      content: text,
      userId,
      timestamp: Date.now(),
      id: generateOperationId(),
      attributes: activeFormat
    };

    queueOperation(operation);
  }, [editorState.canEdit, userId, currentSelection, activeFormat]);

  const updateActiveFormat = useCallback((position: number) => {
    if (!editorState.document) return;

    // Find the formatting at the current position
    const span = editorState.document.state.spans.find(
      s => s.start <= position && s.end > position
    );

    setActiveFormat(span?.attributes || {});
  }, [editorState.document]);

  // ============================================================================
  // UNDO/REDO
  // ============================================================================

  const undo = useCallback(() => {
    if (editorState.undoStack.length === 0) return;

    const lastOperation = editorState.undoStack[editorState.undoStack.length - 1];
    if (!lastOperation) return;
    // Create inverse operation
    const inverseOperation = createInverseOperation(lastOperation);
    
    if (inverseOperation) {
      queueOperation(inverseOperation);
      
      setEditorState(prev => ({
        ...prev,
        undoStack: prev.undoStack.slice(0, -1),
        redoStack: [...prev.redoStack, lastOperation]
      }));
    }
  }, [editorState.undoStack]);

  const redo = useCallback(() => {
    if (editorState.redoStack.length === 0) return;

    const operation = editorState.redoStack[editorState.redoStack.length - 1];
    if (!operation) return;
    queueOperation(operation);
    
    setEditorState(prev => ({
      ...prev,
      redoStack: prev.redoStack.slice(0, -1),
      undoStack: [...prev.undoStack, operation]
    }));
  }, [editorState.redoStack]);

  // ============================================================================
  // SAVE FUNCTIONALITY
  // ============================================================================

  const handleSave = useCallback(async () => {
    if (!editorRef.current || !editorState.document) return;

    try {
      const content = editorRef.current.textContent || '';
      
      await saveDocument({
        documentId: documentId as Id<"collaborativeDocuments">,
        content,
        spans: editorState.document.state.spans
      });

      onSave?.(content);
    } catch (error) {
      console.error('Error saving document:', error);
      onError?.(error as Error);
    }
  }, [documentId, editorState.document, saveDocument, onSave, onError]);

  // Auto-save functionality
  useEffect(() => {
    if (!config.autoSave || !editorState.document) return;

    const autoSaveTimer = setInterval(() => {
      handleSave();
    }, config.autoSaveInterval);

    return () => {
      clearInterval(autoSaveTimer);
    };
  }, [config.autoSave, config.autoSaveInterval, handleSave, editorState.document]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear any pending timeouts
      if (operationTimeoutRef.current) {
        clearTimeout(operationTimeoutRef.current);
        operationTimeoutRef.current = null;
      }
      
      // Clear refs
      operationQueueRef.current = [];
      isApplyingOperationRef.current = false;
    };
  }, []);

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  const generateOperationId = (): string => {
    return `${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const createInverseOperation = (operation: DocumentOperation): DocumentOperation | null => {
    switch (operation.type) {
      case 'insert':
        return {
          type: 'delete',
          position: operation.position,
          length: operation.content.length,
          userId: userId!,
          timestamp: Date.now(),
          id: generateOperationId()
        } as DeleteOperation;
      
      case 'delete':
        // This would require storing the deleted content
        return null;
      
      default:
        return null;
    }
  };

  const formatContentForDisplay = (content: string, spans: Array<{
    start: number;
    end: number;
    attributes?: TextAttributes;
  }>): string => {
    // Convert plain text and spans to HTML for display
    // This is a simplified implementation
    return content.replace(/\n/g, '<br>');
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (editorState.isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        <span className="ml-3">Loading collaborative editor...</span>
      </div>
    );
  }

  if (editorState.error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Error loading editor: {editorState.error.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <TooltipProvider>
      <div className={cn("collaborative-editor", className)}>
        {/* Toolbar */}
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">Collaborative Editor</CardTitle>
                {editorState.presence.length > 0 && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {editorState.presence.length + 1} collaborators
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSave}
                  disabled={!editorState.canEdit}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="flex items-center gap-1 flex-wrap">
              {/* Formatting buttons */}
              {editorState.canEdit && (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={activeFormat.bold ? "default" : "ghost"}
                        size="sm"
                        onClick={() => toggleFormat('bold')}
                      >
                        <Bold className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Bold (Ctrl+B)</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={activeFormat.italic ? "default" : "ghost"}
                        size="sm"
                        onClick={() => toggleFormat('italic')}
                      >
                        <Italic className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Italic (Ctrl+I)</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={activeFormat.underline ? "default" : "ghost"}
                        size="sm"
                        onClick={() => toggleFormat('underline')}
                      >
                        <Underline className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Underline (Ctrl+U)</TooltipContent>
                  </Tooltip>

                  <Separator orientation="vertical" className="h-6 mx-2" />

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={undo}
                        disabled={editorState.undoStack.length === 0}
                      >
                        <Undo className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={redo}
                        disabled={editorState.redoStack.length === 0}
                      >
                        <Redo className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Redo (Ctrl+Shift+Z)</TooltipContent>
                  </Tooltip>
                </>
              )}
              
              {!editorState.canEdit && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  Read-only
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Editor */}
        <Card className="relative">
          <CardContent className="p-0">
            <div
              ref={editorRef}
              contentEditable={editorState.canEdit}
              suppressContentEditableWarning
              className={cn(
                "min-h-[400px] p-6 outline-none",
                "focus:ring-2 focus:ring-primary focus:ring-offset-2",
                !editorState.canEdit && "bg-muted/30"
              )}
              style={{
                fontSize: config.fontSize,
                fontFamily: config.fontFamily,
                lineHeight: config.lineHeight
              }}
              spellCheck={config.enableSpellCheck}
              data-placeholder="Start typing..."
            />
          </CardContent>
        </Card>

        {/* Presence indicators */}
        {editorState.presence.length > 0 && (
          <Card className="mt-4">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">Active collaborators:</span>
                <div className="flex items-center gap-2">
                  {editorState.presence.map(user => (
                    <Tooltip key={user.userId}>
                      <TooltipTrigger asChild>
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium"
                          style={{ backgroundColor: user.userColor }}
                        >
                          {user.userName.charAt(0).toUpperCase()}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>{user.userName}</TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
};

export default CollaborativeEditor;
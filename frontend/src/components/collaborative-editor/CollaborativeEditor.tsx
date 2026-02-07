'use client';

import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Heading1,
  Heading2,
  Heading3,
  Minus,
  Save,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useEffect, useCallback, useState } from 'react';
import * as Y from 'yjs';

import { cn } from '@/lib/utils';

import { ChangeTracker } from './ChangeTracker';
import { useAwareness } from './hooks/useAwareness';
import { useYjsDocument } from './hooks/useYjsDocument';
import { PresenceAvatars, PresenceList } from './PresenceAvatars';


// ============================================================================
// TYPES
// ============================================================================

interface CollaborativeEditorProps {
  sessionId: string;
  userId: string;
  userName: string;
  userColor?: string;
  enterpriseId: string;
  onSave?: (content: string) => Promise<void>;
  readOnly?: boolean;
  showChangeTracker?: boolean;
  showPresenceList?: boolean;
}

// ============================================================================
// COLLABORATIVE EDITOR
// ============================================================================

export function CollaborativeEditor({
  sessionId,
  userId,
  userName,
  userColor = '#9e829c',
  enterpriseId,
  onSave,
  readOnly = false,
  showChangeTracker = true,
  showPresenceList = false,
}: CollaborativeEditorProps) {
  const [isSaving, setIsSaving] = useState(false);

  // Initialize Yjs document and provider
  const { doc, provider, isConnected, isSynced, error } = useYjsDocument({
    sessionId,
    userId,
    userName,
    userColor,
    enterpriseId,
  });

  // Initialize awareness
  const { remoteUsers, updateCursor, updateSelection } = useAwareness({
    provider,
    userId,
    userName,
    userColor,
  });

  // Initialize Tiptap editor with Yjs
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // History is handled by Yjs, not needed here
      }),
      Collaboration.configure({
        document: doc || new Y.Doc(),
        field: 'content',
      }),
      CollaborationCursor.configure({
        provider: provider as unknown as { awareness: unknown },
        user: {
          name: userName,
          color: userColor,
        },
      }),
    ],
    editable: !readOnly,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none font-mono focus:outline-none min-h-[400px] px-6 py-4',
      },
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection;
      updateSelection(from, to);
      updateCursor(from, to);
    },
  }, [doc, provider, readOnly]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!editor || !onSave) return;

    setIsSaving(true);
    try {
      const content = editor.getHTML();
      await onSave(content);
    } finally {
      setIsSaving(false);
    }
  }, [editor, onSave]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  if (error) {
    return (
      <div className="border border-red-300 bg-red-50 p-6">
        <p className="font-mono text-sm text-red-700">
          Failed to initialize editor: {error.message}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="border border-ghost-300 bg-white">
        <div className="flex items-center justify-between px-4 py-2 border-b border-ghost-300 bg-ghost-50">
          {/* Left: Formatting tools */}
          <div className="flex items-center gap-1">
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleBold().run()}
              isActive={editor?.isActive('bold')}
              disabled={!editor || readOnly}
              title="Bold (Ctrl+B)"
            >
              <Bold className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              isActive={editor?.isActive('italic')}
              disabled={!editor || readOnly}
              title="Italic (Ctrl+I)"
            >
              <Italic className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleStrike().run()}
              isActive={editor?.isActive('strike')}
              disabled={!editor || readOnly}
              title="Strikethrough"
            >
              <Strikethrough className="h-4 w-4" />
            </ToolbarButton>

            <div className="w-px h-5 bg-ghost-300 mx-1" />

            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
              isActive={editor?.isActive('heading', { level: 1 })}
              disabled={!editor || readOnly}
              title="Heading 1"
            >
              <Heading1 className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
              isActive={editor?.isActive('heading', { level: 2 })}
              disabled={!editor || readOnly}
              title="Heading 2"
            >
              <Heading2 className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
              isActive={editor?.isActive('heading', { level: 3 })}
              disabled={!editor || readOnly}
              title="Heading 3"
            >
              <Heading3 className="h-4 w-4" />
            </ToolbarButton>

            <div className="w-px h-5 bg-ghost-300 mx-1" />

            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              isActive={editor?.isActive('bulletList')}
              disabled={!editor || readOnly}
              title="Bullet List"
            >
              <List className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              isActive={editor?.isActive('orderedList')}
              disabled={!editor || readOnly}
              title="Numbered List"
            >
              <ListOrdered className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleBlockquote().run()}
              isActive={editor?.isActive('blockquote')}
              disabled={!editor || readOnly}
              title="Quote"
            >
              <Quote className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().setHorizontalRule().run()}
              disabled={!editor || readOnly}
              title="Horizontal Rule"
            >
              <Minus className="h-4 w-4" />
            </ToolbarButton>

            <div className="w-px h-5 bg-ghost-300 mx-1" />

            <ToolbarButton
              onClick={() => editor?.chain().focus().undo().run()}
              disabled={!editor || readOnly || !editor.can().undo()}
              title="Undo (Ctrl+Z)"
            >
              <Undo className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().redo().run()}
              disabled={!editor || readOnly || !editor.can().redo()}
              title="Redo (Ctrl+Y)"
            >
              <Redo className="h-4 w-4" />
            </ToolbarButton>
          </div>

          {/* Right: Status and presence */}
          <div className="flex items-center gap-4">
            {/* Connection status */}
            <div className="flex items-center gap-2">
              {isConnected ? (
                <>
                  <Wifi className="h-4 w-4 text-green-600" />
                  <span className="font-mono text-xs text-green-600">
                    {isSynced ? 'Synced' : 'Syncing...'}
                  </span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-ghost-400" />
                  <span className="font-mono text-xs text-ghost-400">
                    Connecting...
                  </span>
                </>
              )}
            </div>

            {/* Presence */}
            <PresenceAvatars
              currentUser={{ name: userName, color: userColor }}
              remoteUsers={remoteUsers}
            />

            {/* Save button */}
            {onSave && !readOnly && (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-3 py-1.5 font-mono text-xs bg-purple-900 text-white hover:bg-purple-800 disabled:opacity-50"
              >
                <Save className="h-3 w-3" />
                {isSaving ? 'SAVING...' : 'SAVE'}
              </button>
            )}
          </div>
        </div>

        {/* Editor Content */}
        <div className="min-h-[500px]">
          <EditorContent editor={editor} />
        </div>

        {/* Status Bar */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-ghost-300 bg-ghost-50">
          <div className="flex items-center gap-4 font-mono text-xs text-ghost-500">
            <span>
              {editor?.storage.characterCount?.characters() || 0} characters
            </span>
            <span>
              {editor?.storage.characterCount?.words() || 0} words
            </span>
          </div>
          <div className="font-mono text-xs text-ghost-400">
            {readOnly ? 'Read Only' : 'Press Ctrl+S to save'}
          </div>
        </div>
      </div>

      {/* Side panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Presence List */}
        {showPresenceList && (
          <PresenceList
            currentUser={{ name: userName, color: userColor }}
            remoteUsers={remoteUsers}
          />
        )}

        {/* Change Tracker */}
        {showChangeTracker && doc && (
          <ChangeTracker
            doc={doc}
            changes={[]}
            onAccept={() => {}}
            onReject={() => {}}
            onAcceptAll={() => {}}
            onRejectAll={() => {}}
            currentUserId={userId}
          />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// TOOLBAR BUTTON
// ============================================================================

interface ToolbarButtonProps {
  onClick?: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}

function ToolbarButton({
  onClick,
  isActive,
  disabled,
  title,
  children,
}: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'p-2 rounded transition-colors',
        isActive
          ? 'bg-purple-100 text-purple-900'
          : 'text-ghost-600 hover:bg-ghost-100 hover:text-ghost-900',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {children}
    </button>
  );
}

// ============================================================================
// EXPORT DEFAULT
// ============================================================================

export default CollaborativeEditor;

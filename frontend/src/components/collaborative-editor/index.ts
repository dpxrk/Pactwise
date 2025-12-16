// Collaborative Editor Components
export { CollaborativeEditor, default as Editor } from './CollaborativeEditor';
export { PresenceAvatars, PresenceList } from './PresenceAvatars';
export { CursorOverlay, generateCursorCSS } from './CursorOverlay';
export { ChangeTracker, extractChangesFromYDoc } from './ChangeTracker';

// Hooks
export { useYjsDocument, SupabaseProvider } from './hooks/useYjsDocument';
export type { AwarenessState } from './hooks/useYjsDocument';
export { useAwareness, getCursorStyles, getContrastColor } from './hooks/useAwareness';
export type { RemoteUser } from './hooks/useAwareness';

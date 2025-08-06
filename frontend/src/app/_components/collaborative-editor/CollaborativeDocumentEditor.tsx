'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useConvexQuery, useConvexMutation } from '@/lib/api-client';
// import { api } from '../../../../convex/_generated/api';
// import { Id } from '../../../../convex/_generated/dataModel';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

// Core components
import CollaborativeEditor from './CollaborativeEditor';
import { CommentsSidebar, SuggestionModal } from './CommentsAndSuggestions';
import VersionHistory from './VersionHistory';

// Types
import {
  DocumentSnapshot,
  EditorConfig
} from '@/types/collaborative-editor.types';

// UI Components
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Icons
import {
  FileText,
  MessageCircle,
  History,
  Settings,
  Share,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  ArrowLeft,
  Save,
  AlertCircle
} from 'lucide-react';

import { cn } from '@/lib/utils';

// ============================================================================
// MAIN COLLABORATIVE DOCUMENT EDITOR
// ============================================================================

interface CollaborativeDocumentEditorProps {
  documentId?: Id<"collaborativeDocuments">;
  contractId?: Id<"contracts">;
  title?: string;
  initialContent?: string;
  className?: string;
  onBack?: () => void;
  onSave?: (content: string) => void;
}

export const CollaborativeDocumentEditor: React.FC<CollaborativeDocumentEditorProps> = ({
  documentId: existingDocumentId,
  contractId,
  title = 'Untitled Document',
  initialContent = '',
  className,
  onBack,
  onSave
}) => {
  const { user: clerkUser } = useUser();
  const userId = clerkUser?.id as Id<"users"> | undefined;
  const enterpriseId = clerkUser?.publicMetadata?.enterpriseId as Id<"enterprises"> | undefined;

  // State
  const [documentId, setDocumentId] = useState<Id<"collaborativeDocuments"> | null>(existingDocumentId || null);
  const [activePanel, setActivePanel] = useState<'comments' | 'history' | null>('comments');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSuggestionModalOpen, setIsSuggestionModalOpen] = useState(false);
  const [editorConfig, setEditorConfig] = useState<Partial<EditorConfig>>({
    showCursors: true,
    showComments: true,
    showSuggestions: true,
    autoSave: true,
    theme: 'light'
  });

  // Queries
  const { data: document, isLoading } = useConvexQuery(
    api.collaborativeDocuments.getDocument,
    documentId ? { documentId } : "skip"
  );

  const { data: contract } = useConvexQuery(
    api.contracts.getContractById,
    contractId && enterpriseId ? { contractId, enterpriseId } : "skip"
  );

  // Mutations
  const createDocument = useConvexMutation(api.collaborativeDocuments.createDocument);
  const updateDocument = useConvexMutation(api.collaborativeDocuments.updateDocument);
  const lockDocument = useConvexMutation(api.collaborativeDocuments.lockDocument);
  const unlockDocument = useConvexMutation(api.collaborativeDocuments.unlockDocument);
  const shareDocument = useConvexMutation(api.collaborativeDocuments.shareDocument);

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  useEffect(() => {
    // Create document if it doesn't exist
    if (!documentId && userId && enterpriseId) {
      handleCreateDocument();
    }
  }, [userId, enterpriseId, documentId, handleCreateDocument]);

  const handleCreateDocument = useCallback(async () => {
    if (!userId || !enterpriseId) return;

    try {
      const params: {
        title: string;
        ownerId: string;
        collaborators: string[];
        permissions: {
          read: string[];
          write: string[];
          comment: string[];
          admin: string[];
        };
        contractId?: Id<"contracts">;
        initialContent?: string;
      } = {
        title,
        ownerId: userId,
        collaborators: [],
        permissions: {
          read: [],
          write: [],
          comment: [],
          admin: [userId]
        }
      };
      
      if (contractId) {
        params.contractId = contractId;
      }
      if (initialContent) {
        params.initialContent = initialContent;
      }
      
      const result = await createDocument.execute(params);

      if (result && result.success && result.documentId) {
        setDocumentId(result.documentId);
      }
    } catch (error) {
      console.error('Error creating document:', error);
    }
  }, [userId, enterpriseId, title, contractId, initialContent, createDocument]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleSave = useCallback(async (content: string) => {
    if (!documentId) return;

    try {
      await updateDocument.execute({
        documentId,
        content,
        spans: []
      });

      onSave?.(content);
    } catch (error) {
      console.error('Error saving document:', error);
    }
  }, [documentId, updateDocument, onSave]);

  const handleLockToggle = useCallback(async () => {
    if (!documentId || !userId) return;

    try {
      if (document?.isLocked) {
        await unlockDocument.execute({ documentId });
      } else {
        await lockDocument.execute({ documentId, lockedBy: userId });
      }
    } catch (error) {
      console.error('Error toggling document lock:', error);
    }
  }, [documentId, userId, document?.isLocked, lockDocument, unlockDocument]);

  const handleShare = useCallback(async () => {
    if (!documentId) return;

    try {
      const shareUrl = await shareDocument.execute({ documentId });
      
      // Copy to clipboard
      if (shareUrl) {
        await navigator.clipboard.writeText(shareUrl);
        // Show success message
      }
    } catch (error) {
      console.error('Error sharing document:', error);
    }
  }, [documentId, shareDocument]);

  const handleRestoreVersion = useCallback((version: DocumentSnapshot) => {
    // Handle version restoration
    console.log('Restoring version:', version);
  }, []);

  const handleAddSuggestion = useCallback((
    type: 'insert' | 'delete' | 'replace',
    originalContent: string,
    suggestedContent: string,
    reason?: string
  ) => {
    // This will be handled by the SuggestionModal component
    console.log('Adding suggestion:', { type, originalContent, suggestedContent, reason });
  }, []);

  // ============================================================================
  // RENDER
  // ============================================================================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading collaborative editor...</p>
        </div>
      </div>
    );
  }

  if (!documentId) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to create or load the collaborative document.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={cn("h-screen flex flex-col", className)}>
      {/* Header */}
      <Card className="rounded-none border-x-0 border-t-0">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {onBack && (
                <Button variant="ghost" size="sm" onClick={onBack}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              )}
              
              <div>
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <h1 className="text-xl font-semibold">{document?.title || title}</h1>
                  {document?.isLocked && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Lock className="h-3 w-3" />
                      Locked
                    </Badge>
                  )}
                </div>
                {contract && (
                  <p className="text-sm text-muted-foreground">
                    Associated with contract: {contract.title}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Panel toggles */}
              <Button
                variant={activePanel === 'comments' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActivePanel(activePanel === 'comments' ? null : 'comments')}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Comments
              </Button>
              
              <Button
                variant={activePanel === 'history' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActivePanel(activePanel === 'history' ? null : 'history')}
              >
                <History className="h-4 w-4 mr-2" />
                History
              </Button>

              {/* Actions */}
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share className="h-4 w-4 mr-2" />
                Share
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleLockToggle}
                disabled={!document}
              >
                {document?.isLocked ? (
                  <>
                    <Unlock className="h-4 w-4 mr-2" />
                    Unlock
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Lock
                  </>
                )}
              </Button>

              <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Editor Settings</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Show Cursors</label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditorConfig(prev => ({ ...prev, showCursors: !prev.showCursors }))}
                      >
                        {editorConfig.showCursors ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Show Comments</label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditorConfig(prev => ({ ...prev, showComments: !prev.showComments }))}
                      >
                        {editorConfig.showComments ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Auto Save</label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditorConfig(prev => ({ ...prev, autoSave: !prev.autoSave }))}
                      >
                        {editorConfig.autoSave ? <Save className="h-4 w-4" /> : <Save className="h-4 w-4 opacity-50" />}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Editor */}
        <div className={cn("flex-1 p-6 overflow-auto", activePanel && "w-2/3")}>
          {documentId && contractId ? (
            <CollaborativeEditor
              documentId={documentId}
              contractId={contractId}
              initialContent={initialContent}
              config={editorConfig}
              onSave={handleSave}
              onError={(error) => console.error('Editor error:', error)}
            />
          ) : documentId ? (
            <CollaborativeEditor
              documentId={documentId}
              initialContent={initialContent}
              config={editorConfig}
              onSave={handleSave}
              onError={(error) => console.error('Editor error:', error)}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p>Loading document...</p>
            </div>
          )}
        </div>

        {/* Right Panel */}
        {activePanel && (
          <div className="w-1/3 border-l">
            {activePanel === 'comments' && documentId && (
              selectedText ? (
                <CommentsSidebar
                  documentId={documentId}
                  selectedText={selectedText}
                />
              ) : (
                <CommentsSidebar
                  documentId={documentId}
                />
              )
            )}
            
            {activePanel === 'history' && (
              <div className="h-full overflow-auto">
                <VersionHistory
                  documentId={documentId}
                  onRestoreVersion={handleRestoreVersion}
                  className="p-4"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Suggestion Modal */}
      {selectedText && (
        <SuggestionModal
          isOpen={isSuggestionModalOpen}
          onClose={() => setIsSuggestionModalOpen(false)}
          selectedText={selectedText || undefined}
          onAddSuggestion={handleAddSuggestion}
        />
      )}
    </div>
  );
};

// ============================================================================
// COLLABORATIVE EDITOR PAGE WRAPPER
// ============================================================================

interface CollaborativeEditorPageProps {
  params: {
    documentId?: string;
    contractId?: string;
  };
}

export const CollaborativeEditorPage: React.FC<CollaborativeEditorPageProps> = ({
  params
}) => {
  const router = useRouter();
  
  const documentId = params.documentId as Id<"collaborativeDocuments"> | undefined;
  const contractId = params.contractId as Id<"contracts"> | undefined;

  const handleBack = () => {
    if (contractId) {
      router.push(`/dashboard/contracts/${contractId}`);
    } else {
      router.push('/dashboard');
    }
  };

  const props: CollaborativeDocumentEditorProps = {
    onBack: handleBack,
    className: "min-h-screen"
  };
  
  if (documentId) props.documentId = documentId;
  if (contractId) props.contractId = contractId;
  
  return <CollaborativeDocumentEditor {...props} />;
};

// ============================================================================
// INTEGRATION WITH EXISTING CONTRACT SYSTEM
// ============================================================================

interface ContractCollaborativeEditorProps {
  contractId: Id<"contracts">;
  onClose?: () => void;
}

export const ContractCollaborativeEditor: React.FC<ContractCollaborativeEditorProps> = ({
  contractId,
  onClose
}) => {
  const { user: clerkUser } = useUser();
  const enterpriseId = clerkUser?.publicMetadata?.enterpriseId as Id<"enterprises"> | undefined;

  // Query to get or create collaborative document for contract
  const { data: document } = useConvexQuery(
    api.collaborativeDocuments.getDocumentByContract,
    contractId && enterpriseId ? { contractId, enterpriseId } : "skip"
  );

  return (
    <div className="fixed inset-0 bg-background z-50">
      {document?._id ? (
        onClose ? (
          <CollaborativeDocumentEditor
            documentId={document._id}
            contractId={contractId}
            title={document?.title || `Contract Editor - ${contractId}`}
            onBack={onClose}
            className="h-full"
          />
        ) : (
          <CollaborativeDocumentEditor
            documentId={document._id}
            contractId={contractId}
            title={document?.title || `Contract Editor - ${contractId}`}
            className="h-full"
          />
        )
      ) : (
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      )}
    </div>
  );
};

export default CollaborativeDocumentEditor;
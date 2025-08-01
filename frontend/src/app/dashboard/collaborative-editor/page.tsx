'use client'

import React, { useState } from "react";
import { CollaborativeEditor } from "@/app/_components/collaborative-editor/CollaborativeEditor";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileEdit, Plus, Upload, FolderOpen, Loader2 } from "lucide-react";
// import { useQuery, useMutation } from "convex/react";
// import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@clerk/nextjs";
// import { Id } from "../../../../convex/_generated/dataModel";
import { toast } from "sonner";

export default function CollaborativeEditorPage() {
  const { userId } = useAuth();
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  // Get the current user data
  const currentUser = useQuery(api.coreUsers.getCurrentUser);
  const createDocument = useMutation(api.collaborativeDocuments.createDocument);
  
  // Get recent documents
  const recentDocuments = useQuery(api.collaborativeDocuments.getUserDocuments, 
    currentUser?._id ? { userId: currentUser._id } : "skip"
  );
  
  const handleCreateDocument = async () => {
    if (!currentUser?._id) {
      toast.error("Please sign in to create documents");
      return;
    }

    setIsCreating(true);
    try {
      const result = await createDocument({
        title: "New Contract Document",
        initialContent: "",
        ownerId: currentUser._id,
        collaborators: [],
        permissions: {
          read: [currentUser._id],
          write: [currentUser._id],
          comment: [currentUser._id],
          admin: [currentUser._id]
        }
      });

      if (result.success && result.documentId) {
        setSelectedDocumentId(result.documentId);
        toast.success("Document created successfully");
      } else {
        toast.error("Failed to create document");
      }
    } catch (error) {
      console.error("Error creating document:", error);
      toast.error("Failed to create document");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <FileEdit className="h-8 w-8 text-primary" />
              Collaborative Editor
            </h1>
            <p className="text-muted-foreground mt-2">
              Create, edit, and collaborate on contracts in real-time
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button variant="outline" disabled>
              <Upload className="h-4 w-4 mr-2" />
              Import Document
            </Button>
            <Button onClick={handleCreateDocument} disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  New Document
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card 
            className="hover:shadow-lg transition-shadow cursor-pointer group"
            onClick={handleCreateDocument}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Plus className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
                Create New Contract
              </CardTitle>
              <CardDescription>
                Start from scratch or use a template
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="ghost" 
                className="w-full justify-start"
                disabled={isCreating}
              >
                {isCreating ? "Creating..." : "Get Started →"}
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Upload className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
                Upload Contract
              </CardTitle>
              <CardDescription>
                Import existing contracts for editing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" className="w-full justify-start">
                Browse Files →
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FolderOpen className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
                Recent Documents
              </CardTitle>
              <CardDescription>
                Continue working on recent files
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" className="w-full justify-start">
                View All →
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Main Editor Area */}
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>Document Editor</CardTitle>
            <CardDescription>
              {selectedDocumentId 
                ? "Real-time collaborative editing with version control and comments"
                : "Select a document to start editing or create a new one"
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {selectedDocumentId ? (
              <CollaborativeEditor 
                documentId={selectedDocumentId}
                onSave={(content) => {
                  toast.success("Document saved successfully");
                }}
                onError={(error) => {
                  toast.error("Error: " + error.message);
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <FileEdit className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                  No document selected
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Create a new document or select one from your recent documents
                </p>
                <Button onClick={handleCreateDocument} disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Document
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Documents List */}
        <div className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">Recent Documents</h2>
          <div className="grid gap-4">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <FileEdit className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Service Agreement - Acme Corp</p>
                    <p className="text-sm text-muted-foreground">
                      Last edited 2 hours ago
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  Open
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <FileEdit className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">NDA - TechStartup Inc</p>
                    <p className="text-sm text-muted-foreground">
                      Last edited yesterday
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  Open
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <FileEdit className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Master Services Agreement</p>
                    <p className="text-sm text-muted-foreground">
                      Last edited 3 days ago
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  Open
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
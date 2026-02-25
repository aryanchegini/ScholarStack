import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Upload, X, Plus, MessageSquare, FileText, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { projectsApi, documentsApi, notesApi } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import PDFViewer from './PDFViewer/PDFViewer';
import Notebook from './Notebook/Notebook';
import AIChat from './AIChat/AIChat';
import { useNotebookHighlights } from '@/hooks/useNotebookHighlights';

export default function ProjectView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { addHighlight } = useNotebookHighlights();

  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<'notebook' | 'chat'>('notebook');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);

  // Handle adding highlight from PDF to notebook
  const handleAddToNotebook = (text: string, tag: string) => {
    addHighlight(text, tag);
    setActiveTab('notebook');
  };

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.get(id!),
    enabled: !!id,
  });

  const { data: documents } = useQuery({
    queryKey: ['documents', id],
    queryFn: () => documentsApi.listByProject(id!),
    enabled: !!id,
  });

  const { data: notes } = useQuery({
    queryKey: ['notes', id],
    queryFn: () => notesApi.getByProject(id!),
    enabled: !!id,
  });

  const uploadDocumentMutation = useMutation({
    mutationFn: async (file: File) => {
      return documentsApi.upload(id!, file);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', id] });
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      setShowUploadDialog(false);
      toast({
        title: 'Document uploaded',
        description: 'Your PDF is being processed. This may take a moment.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: async (documentId: string) => {
      return documentsApi.delete(documentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', id] });
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
      // Clear selected document if it was deleted
      if (selectedDocumentId === documentToDelete) {
        setSelectedDocumentId(null);
      }
      toast({
        title: 'Document deleted',
        description: 'The PDF has been removed from your project.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Delete failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast({
          title: 'Invalid file type',
          description: 'Please upload a PDF file.',
          variant: 'destructive',
        });
        return;
      }
      uploadDocumentMutation.mutate(file);
    }
  };

  if (projectLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">Loading project...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4">
        <h2 className="text-xl font-semibold">Project not found</h2>
        <Link to="/projects">
          <Button>Back to Projects</Button>
        </Link>
      </div>
    );
  }

  const selectedDocument = documents?.find(d => d.id === selectedDocumentId);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/projects')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">{project.name}</h1>
            <p className="text-xs text-muted-foreground">
              {documents?.length || 0} documents · {notes?.length || 0} notes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowUploadDialog(true)}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload PDF
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Documents Sidebar */}
        <div className="w-64 border-r border-border bg-card flex flex-col">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold text-sm">Documents</h2>
          </div>
          <div className="flex-1 overflow-auto p-2 space-y-1">
            {documents && documents.length > 0 ? (
              documents.map((doc) => (
                <div
                  key={doc.id}
                  className={`group relative rounded-md text-sm transition-colors ${selectedDocumentId === doc.id
                      ? 'bg-primary'
                      : 'hover:bg-accent'
                    }`}
                >
                  <button
                    onClick={() => setSelectedDocumentId(doc.id)}
                    className="w-full text-left px-3 py-2 pr-8 rounded-md"
                  >
                    <div className="flex items-start gap-2">
                      <FileText className="h-4 w-4 mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{doc.filename}</p>
                        <p className="text-xs opacity-70">
                          {doc.pageCount || '?'} pages
                        </p>
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setDocumentToDelete(doc.id);
                      setDeleteDialogOpen(true);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/20 text-destructive transition-opacity"
                    title="Delete document"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center py-8 px-4">
                <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-4">
                  No documents yet
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowUploadDialog(true)}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Upload PDF
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Split View */}
        <div className="flex-1 flex">
          {/* PDF Viewer */}
          <div className="flex-1 border-r border-border">
            {selectedDocument ? (
              <PDFViewer document={selectedDocument} onAddToNotebook={handleAddToNotebook} />
            ) : (
              <div className="h-full flex items-center justify-center bg-muted/30">
                <div className="text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {documents && documents.length > 0
                      ? 'Select a document to view'
                      : 'Upload a PDF to get started'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Notebook / AI Chat */}
          <div className="w-[500px] flex flex-col">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex flex-col h-full">
              <div className="border-b border-border">
                <TabsList className="w-full justify-start rounded-none border-b-0 h-12 px-4">
                  <TabsTrigger value="notebook" className="gap-2">
                    <FileText className="h-4 w-4" />
                    Notebook
                  </TabsTrigger>
                  <TabsTrigger value="chat" className="gap-2">
                    <MessageSquare className="h-4 w-4" />
                    AI Chat
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="notebook" className="flex-1 m-0 overflow-hidden">
                <Notebook projectId={id!} />
              </TabsContent>

              <TabsContent value="chat" className="flex-1 m-0 overflow-hidden">
                <AIChat projectId={id!} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Upload Dialog */}
      {showUploadDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg shadow-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Upload PDF</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowUploadDialog(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                Click to select a PDF file to upload
              </p>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload">
                <Button asChild disabled={uploadDocumentMutation.isPending}>
                  <span>
                    {uploadDocumentMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      'Select File'
                    )}
                  </span>
                </Button>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this PDF? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => documentToDelete && deleteDocumentMutation.mutate(documentToDelete)}
              disabled={deleteDocumentMutation.isPending}
            >
              {deleteDocumentMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

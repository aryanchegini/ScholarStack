import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Upload,
  X,
  Plus,
  MessageSquare,
  FileText,
  PanelsTopLeft,
  PanelRightClose,
  PanelLeftClose,
  Trash2,
  Book,
  ChevronDown,
  ChevronRight,
  FilePlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { projectsApi, documentsApi, notebookPageApi } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { DocumentTabs } from '@/components/layout/DocumentTabs';
import PDFViewer from './PDFViewer/PDFViewer';
import Notebook from './Notebook/Notebook';
import AIChat from './AIChat/AIChat';
import { useNotebookHighlights } from '@/hooks/useNotebookHighlights';

export default function ProjectViewVSCode() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { addHighlight } = useNotebookHighlights();

  // Panel states
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);

  // Document selection
  // undefined = not yet initialized, null = explicitly showing project notebook
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null | undefined>(undefined);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [activeRightTab, setActiveRightTab] = useState<'notebook' | 'chat' | 'logs'>('notebook');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);

  // Project notebook pages
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [notebookExpanded, setNotebookExpanded] = useState(true);
  const [renamingPageId, setRenamingPageId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Auto-select first document when documents load
  const { data: documents } = useQuery({
    queryKey: ['documents', id],
    queryFn: () => documentsApi.listByProject(id!),
    enabled: !!id,
  });

  useEffect(() => {
    // Only auto-select when uninitialized (undefined), not when user explicitly chose project notebook (null)
    if (documents && documents.length > 0 && selectedDocumentId === undefined) {
      setSelectedDocumentId(documents[0].id);
    } else if (documents && documents.length === 0 && selectedDocumentId === undefined) {
      setSelectedDocumentId(null);
    }
  }, [documents, selectedDocumentId]);

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.get(id!),
    enabled: !!id,
  });

  // Fetch notebook pages for the project
  const { data: pages, isLoading: pagesLoading } = useQuery({
    queryKey: ['notebookPages', id],
    queryFn: () => notebookPageApi.listByProject(id!),
    enabled: !!id,
  });

  // Auto-select first page when pages load
  useEffect(() => {
    if (pages && pages.length > 0 && selectedPageId === null) {
      setSelectedPageId(pages[0].id);
    }
  }, [pages, selectedPageId]);

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
      const deletedId = documentToDelete;
      setDocumentToDelete(null);
      // Clear selected document if it was deleted
      if (selectedDocumentId === deletedId) {
        setSelectedDocumentId(documents?.find(d => d.id !== deletedId)?.id || null);
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

  const createPageMutation = useMutation({
    mutationFn: () => notebookPageApi.create(id!),
    onSuccess: (newPage) => {
      queryClient.invalidateQueries({ queryKey: ['notebookPages', id] });
      setSelectedPageId(newPage.id);
      setSelectedDocumentId(null);
    },
  });

  const deletePageMutation = useMutation({
    mutationFn: (pageId: string) => notebookPageApi.delete(pageId),
    onSuccess: (_data, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['notebookPages', id] });
      if (selectedPageId === deletedId) {
        const remaining = pages?.filter(p => p.id !== deletedId);
        setSelectedPageId(remaining?.[0]?.id ?? null);
      }
    },
  });

  const renamePageMutation = useMutation({
    mutationFn: ({ pageId, title }: { pageId: string; title: string }) =>
      notebookPageApi.update(pageId, { title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notebookPages', id] });
      setRenamingPageId(null);
    },
  });

  const handleDeleteDocument = (documentId: string) => {
    setDocumentToDelete(documentId);
    setDeleteDialogOpen(true);
  };

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

  // Handle adding highlight from PDF to notebook
  const handleAddToNotebook = (text: string, tag: string) => {
    addHighlight(text, tag);
    setActiveRightTab('notebook');
    if (rightPanelCollapsed) {
      setRightPanelCollapsed(false);
    }
  };

  if (projectLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading project...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 bg-background">
        <h2 className="text-xl font-semibold">Project not found</h2>
        <Link to="/projects">
          <Button>Back to Projects</Button>
        </Link>
      </div>
    );
  }

  const selectedDocument = selectedDocumentId ? documents?.find(d => d.id === selectedDocumentId) : undefined;
  // Show the right panel whenever a document or project notebook page is active
  const showRightPanel = !rightPanelCollapsed && (!!selectedDocument || !!selectedPageId);

  // Build the components for the resizable layout
  const sidebar = (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-border flex items-center justify-between">
        <span className="text-xs font-semibold uppercase text-muted-foreground">Explorer</span>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setSidebarCollapsed(true)}
            title="Collapse sidebar"
          >
            <PanelLeftClose className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-2">
        <div className="mb-2">
          <div className="text-xs font-medium text-muted-foreground mb-1 px-2">
            {project.name}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start px-2 text-xs"
            onClick={() => setShowUploadDialog(true)}
          >
            <Plus className="h-3 w-3 mr-1" />
            Upload PDF
          </Button>
        </div>
        <div className="space-y-0.5">
          {documents && documents.length > 0 ? (
            documents.map((doc) => (
              <div
                key={doc.id}
                className={`group relative rounded text-sm flex items-center transition-colors ${
                  selectedDocumentId === doc.id
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent/50 text-muted-foreground hover:text-foreground'
                }`}
              >
                <button
                  onClick={() => setSelectedDocumentId(doc.id)}
                  className="flex-1 text-left px-2 py-1.5 pr-6 flex items-center gap-2 rounded"
                >
                  <FileText className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{doc.filename}</span>
                </button>
                <button
                  onClick={() => handleDeleteDocument(doc.id)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/20 text-destructive transition-opacity"
                  title="Delete document"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))
          ) : (
            <div className="text-center py-4 px-2">
              <p className="text-xs text-muted-foreground">No documents</p>
            </div>
          )}
        </div>
        
        <div className="mt-4 pt-2 border-t border-border">
          {/* Project Notebook header */}
          <div className="group flex items-center rounded transition-colors">
            <button
              className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded flex-1 transition-colors ${
                selectedDocumentId === null
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => {
                setSelectedDocumentId(null);
                setNotebookExpanded(v => !v);
              }}
            >
              {notebookExpanded
                ? <ChevronDown className="h-3 w-3 shrink-0" />
                : <ChevronRight className="h-3 w-3 shrink-0" />}
              <Book className="h-3.5 w-3.5 shrink-0 ml-0.5" />
              <span className="flex-1 text-left ml-1">Project Notebook</span>
            </button>
            <button
              title="New page"
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-opacity"
              onClick={() => { createPageMutation.mutate(); setSelectedDocumentId(null); setNotebookExpanded(true); }}
            >
              <FilePlus className="h-3 w-3" />
            </button>
          </div>

          {/* Pages list */}
          {notebookExpanded && (
            <div className="mt-0.5 space-y-0.5 pl-4">
              {pagesLoading ? (
                <p className="text-xs text-muted-foreground px-2 py-1">Loading...</p>
              ) : pages && pages.length > 0 ? (
                pages.map(page => (
                  <div
                    key={page.id}
                    className={`group relative flex items-center rounded transition-colors ${
                      selectedPageId === page.id && selectedDocumentId === null
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                    }`}
                  >
                    {renamingPageId === page.id ? (
                      <input
                        autoFocus
                        className="flex-1 bg-transparent text-xs px-2 py-1 outline-none border border-primary/50 rounded"
                        value={renameValue}
                        onChange={e => setRenameValue(e.target.value)}
                        onBlur={() => {
                          if (renameValue.trim()) {
                            renamePageMutation.mutate({ pageId: page.id, title: renameValue.trim() });
                          } else {
                            setRenamingPageId(null);
                          }
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && renameValue.trim()) {
                            renamePageMutation.mutate({ pageId: page.id, title: renameValue.trim() });
                          } else if (e.key === 'Escape') {
                            setRenamingPageId(null);
                          }
                        }}
                      />
                    ) : (
                      <button
                        className="flex-1 text-left px-2 py-1 pr-6 text-xs truncate"
                        onClick={() => { setSelectedPageId(page.id); setSelectedDocumentId(null); }}
                        onDoubleClick={() => { setRenamingPageId(page.id); setRenameValue(page.title); }}
                        title={`${page.title} (double-click to rename)`}
                      >
                        {page.title}
                      </button>
                    )}
                    {pages.length > 1 && (
                      <button
                        onClick={() => deletePageMutation.mutate(page.id)}
                        className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/20 text-destructive transition-opacity"
                        title="Delete page"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </div>
                ))
              ) : null}
              <button
                onClick={() => { createPageMutation.mutate(); setSelectedDocumentId(null); setNotebookExpanded(true); }}
                className="w-full flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground rounded hover:bg-accent/50 transition-colors"
              >
                <Plus className="h-3 w-3" />
                New page
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const mainContent = (
    <div className="h-full flex flex-col bg-background">
      {/* Document Tabs */}
      {documents && documents.length > 0 && (
        <DocumentTabs
          documents={documents}
          selectedDocumentId={selectedDocumentId ?? null}
          onSelectDocument={(id) => setSelectedDocumentId(id)}
          onCloseDocument={handleDeleteDocument}
        />
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {selectedDocument ? (
          <PDFViewer document={selectedDocument} onAddToNotebook={handleAddToNotebook} />
        ) : (
          <div className="flex-1 p-6 overflow-hidden">
            <div className="max-w-4xl w-full mx-auto flex flex-col h-full border border-border rounded-lg shadow-sm bg-card overflow-hidden">
              <div className="border-b border-border p-3 bg-muted/20 flex items-center gap-2">
                <Book className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold">
                  {pages?.find(p => p.id === selectedPageId)?.title ?? 'Project Notebook'}
                </h2>
              </div>
              <div className="flex-1 overflow-hidden">
                {selectedPageId ? (
                  <Notebook key={selectedPageId} pageId={selectedPageId} />
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                    Select or create a page
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );

  const rightPanel = !selectedDocument ? (
    /* Project notebook view — show only AI Chat, no tab bar */
    <div className="h-full flex flex-col bg-background">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <MessageSquare className="h-3.5 w-3.5" />
          AI Chat
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setRightPanelCollapsed(true)}
          title="Collapse panel"
        >
          <PanelRightClose className="h-3 w-3" />
        </Button>
      </div>
      <div className="flex-1 overflow-hidden">
        <AIChat projectId={id!} />
      </div>
    </div>
  ) : (
    /* Document view — full tabs: Paper Notebook + AI Chat */
    <div className="h-full flex flex-col bg-background">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <Tabs value={activeRightTab} onValueChange={(v) => setActiveRightTab(v as any)} className="flex-1">
          <TabsList className="h-7 bg-transparent border-0 gap-2">
            <TabsTrigger value="notebook" className="h-6 text-xs data-[state=active]:bg-muted">
              <FileText className="h-3 w-3 mr-1" />
              Paper Notebook
            </TabsTrigger>
            <TabsTrigger value="chat" className="h-6 text-xs data-[state=active]:bg-muted">
              <MessageSquare className="h-3 w-3 mr-1" />
              AI Chat
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 ml-1"
          onClick={() => setRightPanelCollapsed(true)}
          title="Collapse panel"
        >
          <PanelRightClose className="h-3 w-3" />
        </Button>
      </div>

      <div className="flex-1 overflow-hidden">
        {activeRightTab === 'notebook' && (
          <Notebook key={selectedDocument.id} documentId={selectedDocument.id} />
        )}
        {activeRightTab === 'chat' && <AIChat projectId={id!} />}
      </div>
    </div>
  );


  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="h-10 border-b border-border bg-card flex items-center px-3 gap-2">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate('/projects')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2 flex-1">
          <span className="text-sm font-medium">{project.name}</span>
          <span className="text-xs text-muted-foreground">
            {documents?.length || 0} docs
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
          >
            {sidebarCollapsed ? <PanelLeftClose className="h-4 w-4" /> : <PanelsTopLeft className="h-4 w-4" />}
          </Button>
          {(!!selectedDocument || !!selectedPageId) && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
              title={rightPanelCollapsed ? 'Show right panel' : 'Hide right panel'}
            >
              {rightPanelCollapsed ? <PanelRightClose className="h-4 w-4" /> : <PanelRightClose className="h-4 w-4 rotate-180" />}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-7"
            onClick={() => setShowUploadDialog(true)}
          >
            <Upload className="h-3.5 w-3.5 mr-1" />
            Upload
          </Button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {!sidebarCollapsed && (
          <>
            <div className="w-56 border-r border-border bg-card">{sidebar}</div>
            <div className="w-1 bg-border" />
          </>
        )}

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden">{mainContent}</div>

          {showRightPanel && (
            <>
              <div className="w-px bg-border" />
              <div className="w-[450px] flex flex-col">{rightPanel}</div>
            </>
          )}
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
                <Button asChild>
                  <span>Select File</span>
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

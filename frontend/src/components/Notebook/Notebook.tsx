import { useEffect, useState, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Loader2, Sparkles, Trash2, BookMarked, FileText, StickyNote, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { notebookApi, notebookPageApi, highlightsApi, type Highlight } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { useNotebookConsumer } from '@/hooks/useNotebookHighlights';

interface NotebookProps {
  projectId?: string;
  documentId?: string;
  /** When set, this notebook operates on a specific NotebookPage record */
  pageId?: string;
}

const NOTE_CONTENT_KEY = (id: string) => `notebook-draft-${id}`;

const HIGHLIGHT_COLORS: Record<string, string> = {
  '#fef08a': 'Yellow',
  '#86efac': 'Green',
  '#93c5fd': 'Blue',
  '#f9a8d4': 'Pink',
  '#fdba74': 'Orange',
};

export default function Notebook({ projectId, documentId, pageId }: NotebookProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'notes' | 'highlights'>('notes');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showHighlightIndicator, setShowHighlightIndicator] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [currentNotebookId, setCurrentNotebookId] = useState<string | null>(null);
  const [editingAnnotation, setEditingAnnotation] = useState<string | null>(null);
  const [annotationValue, setAnnotationValue] = useState('');
  const { highlights: pendingHighlights, subscribe } = useNotebookConsumer();
  const processedHighlightsRef = useRef<Set<number>>(new Set());

  // The unique key used for localStorage drafts and save routing
  const identifier = pageId || projectId || documentId || '';

  // Only fetch persisted highlights when showing a document notebook
  const { data: persistedHighlights = [] } = useQuery({
    queryKey: ['highlights', documentId],
    queryFn: () => highlightsApi.listByDocument(documentId!),
    enabled: !!documentId,
  });

  const updateAnnotationMutation = useMutation({
    mutationFn: ({ id, annotation }: { id: string; annotation: string }) =>
      highlightsApi.update(id, { annotation }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['highlights', documentId] });
      setEditingAnnotation(null);
    },
  });

  const deleteHighlightMutation = useMutation({
    mutationFn: highlightsApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['highlights', documentId] }),
  });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
    ],
    content: '',
    editorProps: {
      attributes: { class: 'focus:outline-none min-h-full px-6 py-4 w-full' },
    },
  });

  // Load saved notebook on mount / when pageId changes
  useEffect(() => {
    const loadNotebook = async () => {
      if (!identifier) return;

      try {
        let content: string | null = null;

        if (pageId) {
          const page = await notebookPageApi.getPage(pageId);
          if (page?.content) content = page.content;
        } else if (projectId) {
          const notebook = await notebookApi.getByProject(projectId);
          if (notebook?.content) { setCurrentNotebookId(notebook.id); content = notebook.content; }
        } else if (documentId) {
          const notebook = await notebookApi.getByDocument(documentId);
          if (notebook?.content) { setCurrentNotebookId(notebook.id); content = notebook.content; }
        }

        if (content && editor) {
          try {
            const parsed = typeof content === 'string' ? JSON.parse(content) : content;
            editor.commands.setContent(parsed);
          } catch {
            editor.commands.setContent(content);
          }
        }
      } catch (error) {
        console.error('Failed to load notebook:', error);
        toast({
          title: 'Failed to load notebook',
          description: error instanceof Error ? error.message : 'Unknown error',
          variant: 'destructive',
        });
      }

      // Override with local draft if present (freshest)
      if (editor) {
        const draft = localStorage.getItem(NOTE_CONTENT_KEY(identifier));
        if (draft) {
          try { editor.commands.setContent(JSON.parse(draft)); }
          catch { editor.commands.setContent(draft); }
        }
      }
    };

    if (editor) loadNotebook();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId, projectId, documentId, identifier, editor]);

  // Auto-save with debounce
  useEffect(() => {
    if (!editor || !identifier) return;

    const timeout = setTimeout(async () => {
      const content = editor.getJSON();
      setIsSaving(true);
      setSaveError(null);
      try {
        localStorage.setItem(NOTE_CONTENT_KEY(identifier), JSON.stringify(content));
        if (pageId) {
          await notebookPageApi.update(pageId, { content: JSON.stringify(content) });
        } else if (projectId) {
          const result = await notebookApi.saveProjectNotebook(projectId, JSON.stringify(content));
          if (result?.id) setCurrentNotebookId(result.id);
        } else if (documentId) {
          const result = await notebookApi.saveDocumentNotebook(documentId, JSON.stringify(content));
          if (result?.id) setCurrentNotebookId(result.id);
        }
        setLastSaved(new Date());
        setSaveError(null);
      } catch (error) {
        setSaveError(error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setIsSaving(false);
      }
    }, 10000);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor?.getJSON(), identifier, pageId, projectId, documentId, editor]);

  // Handle incoming highlights from PDF viewer
  useEffect(() => {
    const unsubscribe = subscribe();
    return () => { if (unsubscribe) unsubscribe(); };
  }, [subscribe]);

  // Process new highlights → insert into editor
  useEffect(() => {
    if (!editor || pendingHighlights.length === 0) return;

    const newHighlights = pendingHighlights.filter(
      h => !processedHighlightsRef.current.has(h.timestamp)
    );

    if (newHighlights.length > 0) {
      newHighlights.forEach(highlight => {
        const tagColors: Record<string, string> = {
          evidence: '#22c55e', critique: '#f97316', question: '#3b82f6', highlight: '#eab308',
        };
        const color = tagColors[highlight.tag] || '#6366f1';

        editor.chain().focus().insertContent({
          type: 'paragraph',
          content: [{
            type: 'blockquote',
            content: [
              { type: 'text', text: highlight.text },
              { type: 'hardBreak' },
              {
                type: 'text',
                text: ` #[${highlight.tag}]`,
                marks: [{ type: 'textStyle', attrs: { color } }],
              },
            ],
          }],
        }).run();

        processedHighlightsRef.current.add(highlight.timestamp);
      });

      setShowHighlightIndicator(true);
      setTimeout(() => setShowHighlightIndicator(false), 2000);

      // If this is a document notebook, auto-switch to highlights tab
      if (documentId) setActiveTab('highlights');
    }
  }, [pendingHighlights, editor, documentId]);

  const handleManualSave = async () => {
    if (!editor || !identifier) return;
    const content = editor.getJSON();
    setIsSaving(true);
    setSaveError(null);
    try {
      if (pageId) {
        await notebookPageApi.update(pageId, { content: JSON.stringify(content) });
      } else if (projectId) {
        await notebookApi.saveProjectNotebook(projectId, JSON.stringify(content));
      } else if (documentId) {
        await notebookApi.saveDocumentNotebook(documentId, JSON.stringify(content));
      }
      localStorage.setItem(NOTE_CONTENT_KEY(identifier), JSON.stringify(content));
      setLastSaved(new Date());
      setSaveError(null);
      toast({ title: 'Notebook saved', description: 'Your notebook has been saved.' });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      setSaveError(msg);
      toast({ title: 'Failed to save', description: msg, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteNotebook = async () => {
    if (pageId || !currentNotebookId) {
      editor?.commands.clearContent();
      localStorage.removeItem(NOTE_CONTENT_KEY(identifier));
      toast({ title: 'Cleared', description: 'Notebook content cleared.' });
      return;
    }
    try {
      await notebookApi.delete(currentNotebookId);
      setCurrentNotebookId(null);
      editor?.commands.clearContent();
      localStorage.removeItem(NOTE_CONTENT_KEY(identifier));
      setLastSaved(null);
      toast({ title: 'Notebook deleted', description: 'Your notebook has been deleted.' });
    } catch (error) {
      toast({ title: 'Failed to delete', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' });
    }
  };

  if (!editor) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Tab bar — only for document notebooks */}
      {documentId && (
        <div className="flex border-b border-border px-2 pt-1 flex-shrink-0">
          <button
            onClick={() => setActiveTab('notes')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-t transition-colors border-b-2 -mb-px ${
              activeTab === 'notes'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            Notes
          </button>
          <button
            onClick={() => setActiveTab('highlights')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-t transition-colors border-b-2 -mb-px ${
              activeTab === 'highlights'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <BookMarked className="h-3.5 w-3.5" />
            Highlights
            {persistedHighlights.length > 0 && (
              <span className="ml-1 bg-primary/10 text-primary text-[10px] px-1.5 rounded-full">
                {persistedHighlights.length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* ── HIGHLIGHTS TAB ── */}
      {documentId && activeTab === 'highlights' && (
        <div className="flex-1 overflow-auto p-4 space-y-3">
          {showHighlightIndicator && (
            <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-2 rounded-lg text-xs">
              <Sparkles className="h-3.5 w-3.5" />
              New highlight added from PDF
            </div>
          )}
          {persistedHighlights.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-12">
              <StickyNote className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">No highlights yet</p>
              <p className="text-xs mt-1">Select text in the PDF to create highlights</p>
            </div>
          ) : (
            persistedHighlights.map(highlight => (
              <HighlightCard
                key={highlight.id}
                highlight={highlight}
                isEditing={editingAnnotation === highlight.id}
                annotationValue={annotationValue}
                onStartEdit={() => { setEditingAnnotation(highlight.id); setAnnotationValue(highlight.annotation); }}
                onAnnotationChange={setAnnotationValue}
                onSaveAnnotation={() => updateAnnotationMutation.mutate({ id: highlight.id, annotation: annotationValue })}
                onCancelEdit={() => setEditingAnnotation(null)}
                onDelete={() => deleteHighlightMutation.mutate(highlight.id)}
              />
            ))
          )}
        </div>
      )}

      {/* ── NOTES TAB (or non-document notebook) ── */}
      {(!documentId || activeTab === 'notes') && (
        <>
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-border flex-shrink-0">
            {showHighlightIndicator && (
              <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 shadow-lg z-50">
                <Sparkles className="h-4 w-4" />
                Highlight added from PDF
              </div>
            )}
            <div className="flex items-center gap-1">
              <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} label="Bold"><strong>B</strong></ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} label="Italic"><em>I</em></ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} label="Strikethrough"><s>S</s></ToolbarButton>
              <div className="w-px h-6 bg-border mx-2" />
              <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })} label="Heading 1">H1</ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} label="Heading 2">H2</ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} isActive={editor.isActive('heading', { level: 3 })} label="Heading 3">H3</ToolbarButton>
              <div className="w-px h-6 bg-border mx-2" />
              <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')} label="Blockquote">{'"'}</ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} isActive={editor.isActive('codeBlock')} label="Code Block">{'</>'}</ToolbarButton>
            </div>
            <div className="flex items-center gap-2">
              {saveError && <span className="text-xs text-destructive">Save failed</span>}
              <Button size="sm" variant="ghost" onClick={handleDeleteNotebook} disabled={isSaving || (!currentNotebookId && !pageId)} title="Clear content">
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={handleManualSave} disabled={isSaving} title={isSaving ? 'Saving…' : 'Save notebook'}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Editor */}
          <div className="flex-1 overflow-auto">
            <EditorContent editor={editor} />
          </div>

          {/* Status Bar */}
          <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-4">
              <span>{editor.getText().split(/\s+/).filter(w => w.length > 0).length} words</span>
              {isSaving && <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Saving…</span>}
            </div>
            <div>{lastSaved && <>Last saved {lastSaved.toLocaleTimeString()}</>}</div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Highlight Card (for the Highlights tab) ───────────────────────────────────

interface HighlightCardProps {
  highlight: Highlight;
  isEditing: boolean;
  annotationValue: string;
  onStartEdit: () => void;
  onAnnotationChange: (v: string) => void;
  onSaveAnnotation: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
}

function HighlightCard({
  highlight,
  isEditing,
  annotationValue,
  onStartEdit,
  onAnnotationChange,
  onSaveAnnotation,
  onCancelEdit,
  onDelete,
}: HighlightCardProps) {
  return (
    <div className="group rounded-lg border border-border bg-card overflow-hidden">
      {/* Colour strip + quoted text */}
      <div
        className="px-3 py-2 text-xs text-foreground/80 italic leading-relaxed"
        style={{ borderLeft: `3px solid ${highlight.color}`, backgroundColor: `${highlight.color}22` }}
      >
        "{highlight.text}"
        <span className="ml-2 text-muted-foreground not-italic text-[10px]">p.{highlight.pageNumber}</span>
      </div>

      {/* Annotation area */}
      <div className="px-3 py-2">
        {isEditing ? (
          <div>
            <textarea
              autoFocus
              className="w-full text-xs bg-transparent resize-none outline-none border border-primary/30 rounded p-1.5 min-h-[60px]"
              placeholder="Add your annotation…"
              value={annotationValue}
              onChange={e => onAnnotationChange(e.target.value)}
            />
            <div className="flex gap-2 mt-1">
              <button onClick={onSaveAnnotation} className="text-xs text-primary hover:underline">Save</button>
              <button onClick={onCancelEdit} className="text-xs text-muted-foreground hover:underline">Cancel</button>
            </div>
          </div>
        ) : (
          <div
            className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors min-h-[24px]"
            onClick={onStartEdit}
          >
            {highlight.annotation
              ? <span>{highlight.annotation}</span>
              : <span className="italic opacity-60">Click to annotate…</span>
            }
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between px-3 pb-2">
        <span className="text-[10px] text-muted-foreground">
          {HIGHLIGHT_COLORS[highlight.color] ?? 'Highlight'} · p.{highlight.pageNumber}
        </span>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onStartEdit}
            className="text-[10px] text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-accent transition-colors"
          >
            Annotate
          </button>
          <button
            onClick={onDelete}
            className="text-[10px] text-destructive hover:bg-destructive/10 px-1.5 py-0.5 rounded transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Toolbar Button ────────────────────────────────────────────────────────────

interface ToolbarButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  isActive?: boolean;
  label: string;
}

function ToolbarButton({ children, onClick, isActive, label }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`h-8 w-8 rounded flex items-center justify-center text-sm font-medium transition-colors ${
        isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-accent hover:text-accent-foreground'
      }`}
      title={label}
    >
      {children}
    </button>
  );
}

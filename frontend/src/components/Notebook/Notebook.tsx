import { useEffect, useState, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Save, Loader2, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { notesApi } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { useNotebookConsumer } from '@/hooks/useNotebookHighlights';

interface NotebookProps {
  projectId: string;
}

const NOTE_CONTENT_KEY = (projectId: string) => `notebook-draft-${projectId}`;

export default function Notebook({ projectId }: NotebookProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showHighlightIndicator, setShowHighlightIndicator] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [currentNoteId, setCurrentNoteId] = useState<string | null>(null);
  const { highlights, consume, subscribe } = useNotebookConsumer();
  const processedHighlightsRef = useRef<Set<number>>(new Set());

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-full px-6 py-4 w-full',
      },
    },
  });

  // Load saved note on mount
  useEffect(() => {
    const loadNote = async () => {
      try {
        const notes = await notesApi.getByProject(projectId);
        if (notes.length > 0 && notes[0].content) {
          setCurrentNoteId(notes[0].id);
          try {
            // Try to parse the content as JSON (TipTap format)
            const parsedContent = typeof notes[0].content === 'string'
              ? JSON.parse(notes[0].content)
              : notes[0].content;

            // Set the parsed content
            editor?.commands.setContent(parsedContent);
          } catch (parseError) {
            // If parsing fails, treat it as plain text
            console.warn('Could not parse note content as JSON, treating as text:', parseError);
            editor?.commands.setContent(notes[0].content);
          }
        } else {
          setCurrentNoteId(null);
        }
      } catch (error) {
        console.error('Failed to load note:', error);
        toast({
          title: 'Failed to load note',
          description: error instanceof Error ? error.message : 'Unknown error',
          variant: 'destructive',
        });
      }
    };

    if (editor) {
      loadNote();

      // Load draft from localStorage (prioritize over server content for freshest data)
      const draft = localStorage.getItem(NOTE_CONTENT_KEY(projectId));
      if (draft) {
        try {
          editor.commands.setContent(draft);
        } catch (e) {
          console.error('Failed to load draft:', e);
        }
      }
    }
  }, [projectId, editor, toast]);

  // Auto-save with debounce
  useEffect(() => {
    if (!editor) return;

    const timeout = setTimeout(async () => {
      const content = editor.getJSON();

      // Always save, even if empty (allows clearing the note)
      setIsSaving(true);
      setSaveError(null);
      try {
        // Save draft to localStorage first
        localStorage.setItem(NOTE_CONTENT_KEY(projectId), JSON.stringify(content));

        // Save to server - send the content as an object, the backend will stringify it
        const response = await fetch('/api/notes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            projectId,
            content: content, // Send as object, backend will handle stringification
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || 'Failed to save note');
        }

        const result = await response.json();
        if (result.id) {
          setCurrentNoteId(result.id);
        }

        setLastSaved(new Date());
        setSaveError(null);
      } catch (error) {
        console.error('Failed to save note:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setSaveError(errorMessage);
        // Don't show toast on auto-save errors (too noisy)
      } finally {
        setIsSaving(false);
      }
    }, 1500); // Increased debounce time to reduce save frequency

    return () => clearTimeout(timeout);
  }, [editor?.getJSON(), projectId, editor]);

  // Handle incoming highlights from PDF viewer
  useEffect(() => {
    const unsubscribe = subscribe();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [subscribe]);

  // Process new highlights
  useEffect(() => {
    if (!editor || highlights.length === 0) return;

    // Find new highlights (not yet processed)
    const newHighlights = highlights.filter(
      h => !processedHighlightsRef.current.has(h.timestamp)
    );

    if (newHighlights.length > 0) {
      // Insert each new highlight into the editor
      newHighlights.forEach(highlight => {
        const tagColors: Record<string, string> = {
          evidence: '#22c55e',
          critique: '#f97316',
          question: '#3b82f6',
          highlight: '#eab308',
        };

        const color = tagColors[highlight.tag] || '#6366f1';

        editor.chain().focus().insertContent({
          type: 'paragraph',
          content: [
            {
              type: 'blockquote',
              content: [
                {
                  type: 'text',
                  text: highlight.text,
                },
                {
                  type: 'hardBreak',
                },
                {
                  type: 'text',
                  text: ` #[${highlight.tag}]`,
                  marks: [
                    {
                      type: 'textStyle',
                      attrs: {
                        color: color,
                      },
                    },
                  ],
                },
              ],
            },
          ],
        }).run();

        processedHighlightsRef.current.add(highlight.timestamp);
      });

      setShowHighlightIndicator(true);
      setTimeout(() => setShowHighlightIndicator(false), 2000);
    }
  }, [highlights, editor]);

  const handleManualSave = async () => {
    if (!editor) return;

    const content = editor.getJSON();
    setIsSaving(true);
    setSaveError(null);
    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          content: content,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to save note');
      }

      localStorage.setItem(NOTE_CONTENT_KEY(projectId), JSON.stringify(content));
      setLastSaved(new Date());
      setSaveError(null);
      toast({
        title: 'Note saved',
        description: 'Your notebook has been saved.',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setSaveError(errorMessage);
      toast({
        title: 'Failed to save',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteNote = async () => {
    if (!currentNoteId) {
      // Just clear the editor if there's no saved note
      editor?.commands.clearContent();
      localStorage.removeItem(NOTE_CONTENT_KEY(projectId));
      toast({
        title: 'Note cleared',
        description: 'Your notebook has been cleared.',
      });
      return;
    }

    try {
      await notesApi.delete(currentNoteId);
      setCurrentNoteId(null);
      editor?.commands.clearContent();
      localStorage.removeItem(NOTE_CONTENT_KEY(projectId));
      setLastSaved(null);
      toast({
        title: 'Note deleted',
        description: 'Your notebook has been deleted.',
      });
    } catch (error) {
      toast({
        title: 'Failed to delete',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
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
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        {showHighlightIndicator && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 shadow-lg animate-in slide-in-from-top-2 fade-in duration-300 z-50">
            <Sparkles className="h-4 w-4" />
            Highlight added from PDF
          </div>
        )}
        <div className="flex items-center gap-1">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            label="Bold"
          >
            <strong>B</strong>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            label="Italic"
          >
            <em>I</em>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            isActive={editor.isActive('strike')}
            label="Strikethrough"
          >
            <s>S</s>
          </ToolbarButton>
          <div className="w-px h-6 bg-border mx-2" />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            isActive={editor.isActive('heading', { level: 1 })}
            label="Heading 1"
          >
            H1
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive('heading', { level: 2 })}
            label="Heading 2"
          >
            H2
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            isActive={editor.isActive('heading', { level: 3 })}
            label="Heading 3"
          >
            H3
          </ToolbarButton>
          <div className="w-px h-6 bg-border mx-2" />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive('blockquote')}
            label="Blockquote"
          >
            {'"'}
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            isActive={editor.isActive('codeBlock')}
            label="Code Block"
          >
            {'</>'}
          </ToolbarButton>
        </div>

        <div className="flex items-center gap-2">
          {saveError && (
            <span className="text-xs text-destructive">Save failed</span>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDeleteNote}
            disabled={isSaving || !currentNoteId}
            title="Delete note"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleManualSave}
            disabled={isSaving}
            title={isSaving ? 'Saving...' : 'Save note'}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-auto">
        <EditorContent editor={editor} />
      </div>

      {/* Status Bar */}
      <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span>
            {editor.getText().split(/\s+/).filter(w => w.length > 0).length} words
          </span>
          {isSaving && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving...
            </span>
          )}
        </div>
        <div>
          {lastSaved && (
            <>Last saved {lastSaved.toLocaleTimeString()}</>
          )}
        </div>
      </div>
    </div>
  );
}

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
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'hover:bg-accent hover:text-accent-foreground'
      }`}
      title={label}
    >
      {children}
    </button>
  );
}

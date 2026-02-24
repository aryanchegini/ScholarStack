import { useState, useRef, useCallback } from 'react';
import { Highlighter } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HighlightOverlayProps {
  onHighlight: (text: string, bounds: any) => void;
}

export default function HighlightOverlay({ onHighlight }: HighlightOverlayProps) {
  const [selection, setSelection] = useState<{
    text: string;
    bounds: { top: number; left: number; width: number; height: number };
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      setSelection(null);
      return;
    }

    const text = selection.toString().trim();
    if (!text) {
      setSelection(null);
      return;
    }

    const range = selection.getRangeAt(0);
    const rects = range.getClientRects();

    if (rects.length === 0) {
      setSelection(null);
      return;
    }

    // Get the bounding rect of the first text rectangle
    const firstRect = rects[0];
    const containerRect = containerRef.current?.getBoundingClientRect();

    if (!containerRect) {
      setSelection(null);
      return;
    }

    const bounds = {
      top: firstRect.top - containerRect.top + window.scrollY,
      left: firstRect.left - containerRect.left + window.scrollX,
      width: firstRect.width,
      height: firstRect.height,
    };

    setSelection({ text, bounds });
  }, []);

  const handleAddToNotebook = (tag: string = 'highlight') => {
    if (selection) {
      onHighlight(selection.text, { ...selection.bounds, tag });
      setSelection(null);
      window.getSelection()?.removeAllRanges();
    }
  };

  return (
    <div ref={containerRef} onMouseUp={handleMouseUp}>
      {selection && (
        <div
          className="fixed z-50 bg-popover border border-border rounded-lg shadow-lg p-2 min-w-[200px]"
          style={{
            top: `${selection.bounds.top + selection.bounds.height + 8}px`,
            left: `${selection.bounds.left + selection.bounds.width / 2 - 100}px`,
          }}
        >
          <div className="text-sm font-medium mb-2 flex items-center gap-2">
            <Highlighter className="h-4 w-4" />
            Add to Notebook
          </div>
          <div className="space-y-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-xs"
              onClick={() => handleAddToNotebook('evidence')}
            >
              <span className="w-2 h-2 rounded-full bg-green-500 mr-2" />
              Add as #evidence
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-xs"
              onClick={() => handleAddToNotebook('critique')}
            >
              <span className="w-2 h-2 rounded-full bg-orange-500 mr-2" />
              Add as #critique
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-xs"
              onClick={() => handleAddToNotebook('question')}
            >
              <span className="w-2 h-2 rounded-full bg-blue-500 mr-2" />
              Add as #question
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-xs"
              onClick={() => handleAddToNotebook('highlight')}
            >
              <span className="w-2 h-2 rounded-full bg-yellow-500 mr-2" />
              Add as #highlight
            </Button>
          </div>
          <div className="mt-2 pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground line-clamp-2">
              "{selection.text.substring(0, 60)}{selection.text.length > 60 ? '...' : ''}"
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

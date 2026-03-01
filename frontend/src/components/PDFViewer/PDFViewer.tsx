import { useState, useRef, useCallback, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { highlightsApi, type Highlight } from '@/lib/api';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const COLORS = [
  '#fef08a', // yellow
  '#86efac', // green
  '#93c5fd', // blue
  '#f9a8d4', // pink
  '#fdba74', // orange
];

interface HRect { top: number; left: number; width: number; height: number }

// The pill menu can be in two modes:
// - 'new': user just selected text (pick a colour to save)
// - 'existing': user clicked a saved highlight (pick colour to recolour, or X to delete)
interface PillMenu {
  mode: 'new' | 'existing';
  /** Viewport-space X/Y centre-top of the selection/highlight, used to position the pill */
  vpX: number;
  vpY: number;
  /** For new selections */
  selText?: string;
  selRects?: HRect[];
  /** For existing highlights */
  highlightId?: string;
  highlightColor?: string;
}

interface PDFViewerProps {
  document: {
    id: string;
    projectId: string;
    filename: string;
    filePath: string;
    fileUrl?: string;
    pageCount?: number;
  };
  onAddToNotebook?: (text: string, tag: string) => void;
}

export default function PDFViewer({ document, onAddToNotebook }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [menu, setMenu] = useState<PillMenu | null>(null);

  // The scrollable container (used for popup absolute positioning)
  const containerRef = useRef<HTMLDivElement>(null);
  // The div wrapping <Page> — used for computing highlight rect coordinates
  const pageWrapperRef = useRef<HTMLDivElement>(null);
  // Prevents the document mouseup handler from firing after clicking a highlight rect
  const suppressSelectionRef = useRef(false);

  const queryClient = useQueryClient();

  const { data: highlights = [] } = useQuery({
    queryKey: ['highlights', document.id],
    queryFn: () => highlightsApi.listByDocument(document.id),
  });

  const createMutation = useMutation({
    mutationFn: highlightsApi.create,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['highlights', document.id] });
      setMenu(null);
      window.getSelection()?.removeAllRanges();
      // Push to notebook highlights tab
      if (onAddToNotebook) onAddToNotebook(created.text, 'highlight');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, color }: { id: string; color: string }) =>
      highlightsApi.update(id, { color }),
    onSuccess: (_updated, vars) => {
      queryClient.invalidateQueries({ queryKey: ['highlights', document.id] });
      // Update pill colour in-place so user sees the change
      setMenu(m => m ? { ...m, highlightColor: vars.color } : m);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: highlightsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['highlights', document.id] });
      setMenu(null);
    },
  });

  const goToPage = (p: number) => setCurrentPage(Math.max(1, Math.min(p, numPages)));
  const zoomIn = () => setScale(s => Math.min(s + 0.25, 3));
  const zoomOut = () => setScale(s => Math.max(s - 0.25, 0.5));

  useEffect(() => {
    setMenu(null);
    window.getSelection()?.removeAllRanges();
  }, [currentPage]);

  // Document-level mouseup → catches events absorbed by the PDF text layer
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if ((e.target as HTMLElement).closest('[data-pill]')) return;
      // Blocked when a highlight rect was just clicked
      if (suppressSelectionRef.current) return;

      // Small delay so the browser finalises the selection
      setTimeout(() => {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;
        const text = sel.toString().trim();
        if (!text) return;

        // Only act when the selection is inside our container
        const range = sel.getRangeAt(0);
        if (!containerRef.current!.contains(range.commonAncestorContainer)) return;

        const pageWrapper = pageWrapperRef.current;
        if (!pageWrapper) return;
        const pageRect = pageWrapper.getBoundingClientRect();

        const clientRects = Array.from(range.getClientRects());
        if (!clientRects.length) return;

        const rects: HRect[] = clientRects.map(r => ({
          top:    (r.top    - pageRect.top)  / scale,
          left:   (r.left   - pageRect.left) / scale,
          width:  r.width  / scale,
          height: r.height / scale,
        }));

        const allLeft  = clientRects.map(r => r.left);
        const allRight = clientRects.map(r => r.right);
        const midX = (Math.min(...allLeft) + Math.max(...allRight)) / 2;
        const topY = clientRects[0].top;

        setMenu({
          mode: 'new',
          vpX: midX,
          vpY: topY,
          selText: text,
          selRects: rects,
        });
      }, 10);
    };

    window.document.addEventListener('mouseup', handler);
    return () => window.document.removeEventListener('mouseup', handler);
  }, [scale]);

  // --- Click existing highlight rect → show pill for that highlight ---
  const handleHighlightClick = useCallback((
    e: React.MouseEvent,
    highlight: Highlight,
  ) => {
    e.stopPropagation();
    // Suppress the document mouseup handler for this interaction
    suppressSelectionRef.current = true;
    setTimeout(() => { suppressSelectionRef.current = false; }, 50);
    window.getSelection()?.removeAllRanges();
    setMenu(null);

    const rect = e.currentTarget.getBoundingClientRect();
    setMenu({
      mode: 'existing',
      vpX: rect.left + rect.width / 2,
      vpY: rect.top,
      highlightId: highlight.id,
      highlightColor: highlight.color,
    });
  }, []);

  // --- Pill actions ---
  const handleColorPick = (color: string) => {
    if (!menu) return;

    if (menu.mode === 'new' && menu.selText && menu.selRects) {
      createMutation.mutate({
        projectId: document.projectId,
        documentId: document.id,
        pageNumber: currentPage,
        text: menu.selText,
        color,
        coordinates: JSON.stringify(menu.selRects),
      });
    } else if (menu.mode === 'existing' && menu.highlightId) {
      updateMutation.mutate({ id: menu.highlightId, color });
    }
  };

  const handleDelete = () => {
    if (menu?.mode === 'existing' && menu.highlightId) {
      deleteMutation.mutate(menu.highlightId);
    } else {
      setMenu(null);
      window.getSelection()?.removeAllRanges();
    }
  };

  // Convert viewport pill position to container-relative absolute position
  const pillStyle = (() => {
    if (!menu || !containerRef.current) return null;
    const cRect = containerRef.current.getBoundingClientRect();
    const scrollTop = containerRef.current.scrollTop;
    const scrollLeft = containerRef.current.scrollLeft;
    const x = menu.vpX - cRect.left + scrollLeft;
    const y = menu.vpY - cRect.top  + scrollTop;
    return { x, y };
  })();

  const pageHighlights = highlights.filter(h => h.pageNumber === currentPage);

  return (
    <div className="h-full flex flex-col bg-gray-100 dark:bg-gray-900">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[72px] text-center">
            {currentPage} / {numPages || '—'}
          </span>
          <Button variant="ghost" size="icon" onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= numPages}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={zoomOut} disabled={scale <= 0.5}><ZoomOut className="h-4 w-4" /></Button>
          <span className="text-sm font-medium w-14 text-center">{Math.round(scale * 100)}%</span>
          <Button variant="ghost" size="icon" onClick={zoomIn} disabled={scale >= 3}><ZoomIn className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Scrollable PDF area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-4 relative select-text"
        onClick={(e) => {
          if (!(e.target as HTMLElement).closest('[data-pill]') &&
              !(e.target as HTMLElement).closest('[data-highlight-rect]')) {
            setMenu(null);
          }
        }}
      >
        <div className="flex justify-center">
          <Document
            file={document.fileUrl || `/uploads/${document.filePath.split('/').pop()}`}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            loading={
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Loading PDF…</p>
                </div>
              </div>
            }
            error={<div className="flex items-center justify-center h-64"><p className="text-sm text-destructive">Failed to load PDF</p></div>}
          >
            {/* Page wrapper — reference point for highlight coordinates */}
            <div ref={pageWrapperRef} className="relative">
              <Page
                pageNumber={currentPage}
                scale={scale}
                renderTextLayer={true}
                renderAnnotationLayer={false}
                className="pdf-page shadow-lg"
              />

              {/* Saved highlight overlays */}
              {pageHighlights.map(h => {
                let rects: HRect[] = [];
                try { rects = JSON.parse(h.coordinates); } catch { /* skip */ }
                return rects.map((r, i) => (
                  <div
                    key={`${h.id}-${i}`}
                    data-highlight-rect
                    className="absolute cursor-pointer"
                    style={{
                      top:    `${r.top    * scale}px`,
                      left:   `${r.left   * scale}px`,
                      width:  `${r.width  * scale}px`,
                      height: `${r.height * scale}px`,
                      backgroundColor: h.color,
                      opacity: menu?.highlightId === h.id ? 0.7 : 0.45,
                      mixBlendMode: 'multiply',
                      // Sit above the PDF text layer (z-index ~2) so single click registers
                      zIndex: 5,
                    }}
                    onMouseDown={e => e.preventDefault()} // prevent text selection on click
                    onClick={(e) => handleHighlightClick(e, h)}
                  />
                ));
              })}

              {/* Preview overlay for pending selection */}
              {menu?.mode === 'new' && menu.selRects?.map((r, i) => (
                <div
                  key={`sel-${i}`}
                  className="absolute pointer-events-none"
                  style={{
                    top:    `${r.top    * scale}px`,
                    left:   `${r.left   * scale}px`,
                    width:  `${r.width  * scale}px`,
                    height: `${r.height * scale}px`,
                    backgroundColor: '#fef08a',
                    opacity: 0.4,
                    mixBlendMode: 'multiply',
                  }}
                />
              ))}
            </div>
          </Document>
        </div>

        {/* Floating pill menu */}
        {menu && pillStyle && (
          <PillMenu
            colors={COLORS}
            activeColor={menu.highlightColor}
            showDelete={menu.mode === 'existing'}
            x={pillStyle.x}
            y={pillStyle.y}
            onColorPick={handleColorPick}
            onDelete={handleDelete}
          />
        )}
      </div>
    </div>
  );
}

// ── Pill Menu ────────────────────────────────────────────────────────────────

const PILL_W = 170; // approximate width for centering
const PILL_H = 36;  // approximate height for positioning above anchor

interface PillMenuProps {
  colors: string[];
  activeColor?: string;
  showDelete: boolean;
  x: number; // horizontal centre, container-relative px
  y: number; // top of anchor (selection/highlight), container-relative px
  onColorPick: (c: string) => void;
  onDelete: () => void;
}

function PillMenu({ colors, activeColor, showDelete, x, y, onColorPick, onDelete }: PillMenuProps) {
  const left = Math.max(8, x - PILL_W / 2);
  const top  = Math.max(8, y - PILL_H - 6);

  return (
    <div
      data-pill
      className="absolute z-50 flex items-center gap-1 px-2 py-1.5 bg-popover border border-border rounded-full shadow-lg"
      style={{ left: `${left}px`, top: `${top}px` }}
      onMouseDown={e => e.preventDefault()}
    >
      {colors.map(c => (
        <button
          key={c}
          title={c}
          className="w-5 h-5 rounded-full transition-transform hover:scale-125 flex-shrink-0"
          style={{
            backgroundColor: c,
            outline: activeColor === c ? '2px solid #6366f1' : '2px solid transparent',
            outlineOffset: '1px',
          }}
          onClick={() => onColorPick(c)}
        />
      ))}
      <div className="w-px h-4 bg-border mx-0.5" />
      <button
        className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
        onClick={onDelete}
        title={showDelete ? 'Remove highlight' : 'Dismiss'}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

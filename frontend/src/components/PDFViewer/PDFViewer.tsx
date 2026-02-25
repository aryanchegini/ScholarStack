import { useState, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import HighlightOverlay from './HighlightOverlay';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up the PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
  document: {
    id: string;
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
  const [pageInput, setPageInput] = useState('1');
  const [scale, setScale] = useState(1.0);
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const handleLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const goToPage = (page: number) => {
    const clamped = Math.max(1, Math.min(page, numPages));
    setCurrentPage(clamped);
    setPageInput(String(clamped));
  };

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInput(e.target.value);
  };

  const handlePageInputCommit = () => {
    const parsed = parseInt(pageInput, 10);
    if (!isNaN(parsed)) {
      goToPage(parsed);
    } else {
      setPageInput(String(currentPage));
    }
  };

  const zoomIn = () => setScale(s => Math.min(s + 0.25, 3));
  const zoomOut = () => setScale(s => Math.max(s - 0.25, 0.5));

  const handleHighlight = (text: string, data: any) => {
    if (onAddToNotebook) {
      onAddToNotebook(text, data.tag || 'highlight');
      toast({
        title: 'Added to notebook',
        description: `Highlight added as #${data.tag}`,
      });
    }
  };

  const getPdfUrl = () => {
    // Determine the base URL to use
    let url = document.fileUrl;
    if (!url && document.filePath) {
      url = `/uploads/${document.filePath.split('/').pop()}`;
    }

    if (!url) return '';

    // If it's an external URL (like arXiv), route it through our backend proxy to avoid CORS
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return `/api/documents/proxy?url=${encodeURIComponent(url)}`;
    }

    return url;
  };

  return (
    <div className="h-full flex flex-col bg-gray-100 dark:bg-gray-900">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Page number input */}
          <div className="flex items-center gap-1.5 text-sm">
            <Input
              type="number"
              min={1}
              max={numPages || 1}
              value={pageInput}
              onChange={handlePageInputChange}
              onBlur={handlePageInputCommit}
              onKeyDown={(e) => e.key === 'Enter' && handlePageInputCommit()}
              className="h-7 w-14 text-center text-sm px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-muted-foreground">of {numPages}</span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= numPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={zoomOut} disabled={scale <= 0.5}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium w-16 text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button variant="ghost" size="icon" onClick={zoomIn} disabled={scale >= 3}>
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* PDF Content */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-4 scrollbar-thin relative"
      >
        <HighlightOverlay onHighlight={handleHighlight} />
        <div className="flex justify-center">
          <Document
            file={getPdfUrl()}
            onLoadSuccess={handleLoadSuccess}
            loading={
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Loading PDF...</p>
                </div>
              </div>
            }
            error={
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <p className="text-sm text-destructive">Failed to load PDF</p>
                </div>
              </div>
            }
          >
            <Page
              pageNumber={currentPage}
              scale={scale}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              className="pdf-page"
            />
          </Document>
        </div>
      </div>
    </div>
  );
}

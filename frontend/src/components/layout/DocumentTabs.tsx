import { useState } from 'react';
import { X, FileText, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Document } from '@/lib/api';

interface DocumentTabsProps {
  documents: Document[];
  selectedDocumentId: string | null;
  onSelectDocument: (id: string) => void;
  onCloseDocument?: (id: string) => void;
}

export function DocumentTabs({
  documents,
  selectedDocumentId,
  onSelectDocument,
  onCloseDocument,
}: DocumentTabsProps) {
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);

  if (documents.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center bg-muted/30 border-b border-border overflow-x-auto">
      {documents.map((doc, index) => {
        const isSelected = doc.id === selectedDocumentId;
        const isHovered = doc.id === hoveredTab;

        return (
          <div
            key={doc.id}
            className={cn(
              'group flex items-center gap-2 px-3 py-2 border-r border-border min-w-[120px] max-w-[200px] cursor-pointer transition-colors relative',
              isSelected
                ? 'bg-background border-b-2 border-b-primary -mb-px'
                : 'hover:bg-muted/50'
            )}
            onClick={() => onSelectDocument(doc.id)}
            onMouseEnter={() => setHoveredTab(doc.id)}
            onMouseLeave={() => setHoveredTab(null)}
          >
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="text-sm truncate flex-1">{doc.filename}</span>
            {onCloseDocument && (isHovered || isSelected) && (
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 -mr-1 opacity-0 group-hover:opacity-100 hover:bg-muted"
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseDocument(doc.id);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        );
      })}

      {/* Empty space filler */}
      <div className="flex-1" />
    </div>
  );
}

interface TabBarProps {
  children: React.ReactNode;
  className?: string;
}

export function TabBar({ children, className }: TabBarProps) {
  return (
    <div className={cn('flex items-center bg-muted/30 border-b border-border', className)}>
      {children}
    </div>
  );
}

interface TabProps {
  isActive: boolean;
  onClick: () => void;
  onClose?: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export function Tab({ isActive, onClick, onClose, icon, children }: TabProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={cn(
        'group flex items-center gap-2 px-3 py-2 border-r border-border min-w-[100px] max-w-[200px] cursor-pointer transition-colors relative',
        isActive
          ? 'bg-background border-b-2 border-b-primary -mb-px'
          : 'hover:bg-muted/50'
      )}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {icon && <span className="shrink-0 text-muted-foreground">{icon}</span>}
      <span className="text-sm truncate flex-1">{children}</span>
      {onClose && (isHovered || isActive) && (
        <Button
          variant="ghost"
          size="icon"
          className="h-4 w-4 p-0 -mr-1 opacity-0 group-hover:opacity-100 hover:bg-muted"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

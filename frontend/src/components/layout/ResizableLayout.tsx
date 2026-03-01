import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { useState, ReactNode } from 'react';
import {
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ResizableLayoutProps {
  sidebar: ReactNode;
  main: ReactNode;
  rightPanel: ReactNode;
  header?: ReactNode;
}

export function ResizableLayout({ sidebar, main, rightPanel, header }: ResizableLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const sidebarSize = 20;
  const rightPanelSize = 35;

  return (
    <div className="h-full flex flex-col">
      {header && (
        <div className="border-b border-border bg-card">
          {header}
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {/* Left Sidebar */}
          {!sidebarCollapsed && (
            <>
              <ResizablePanel
                defaultSize={sidebarSize}
                minSize={15}
                maxSize={30}
                className="bg-card"
              >
                {sidebar}
              </ResizablePanel>
              <ResizableHandle />
            </>
          )}

          {/* Main Content Area */}
          <ResizablePanel defaultSize={100 - (sidebarCollapsed ? 0 : sidebarSize) - (rightPanelCollapsed ? 0 : rightPanelSize)}>
            <div className="h-full">
              {/* Collapsed sidebar toggle button */}
              {sidebarCollapsed && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-10 rounded-r-lg rounded-l-none border-y border-r border-border bg-card"
                  onClick={() => setSidebarCollapsed(false)}
                >
                  <PanelLeftOpen className="h-4 w-4" />
                </Button>
              )}

              {/* Main content */}
              <div className={cn('h-full', sidebarCollapsed && 'pl-10')}>
                {main}
              </div>
            </div>
          </ResizablePanel>

          {/* Right Panel */}
          {!rightPanelCollapsed && (
            <>
              <ResizableHandle />
              <ResizablePanel
                defaultSize={rightPanelSize}
                minSize={25}
                maxSize={50}
                className="bg-card border-l border-border"
              >
                <div className="h-full flex flex-col relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 rounded-lg border bg-background"
                    onClick={() => setRightPanelCollapsed(true)}
                  >
                    <PanelRightClose className="h-4 w-4" />
                  </Button>
                  <div className="pl-6 h-full">
                    {rightPanel}
                  </div>
                </div>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>

      {/* Bottom status bar with collapse/expand buttons */}
      <div className="h-8 border-t border-border bg-muted/30 flex items-center px-2 gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          title={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="h-3 w-3" />
          ) : (
            <PanelLeftClose className="h-3 w-3" />
          )}
        </Button>

        <div className="flex-1" />

        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
          title={rightPanelCollapsed ? 'Show panel' : 'Hide panel'}
        >
          {rightPanelCollapsed ? (
            <PanelRightOpen className="h-3 w-3" />
          ) : (
            <PanelRightClose className="h-3 w-3" />
          )}
        </Button>
      </div>
    </div>
  );
}

interface PanelGroupProps {
  children: ReactNode;
  direction?: 'horizontal' | 'vertical';
  className?: string;
}

export function PanelGroup({ children, direction = 'horizontal', className }: PanelGroupProps) {
  return (
    <ResizablePanelGroup direction={direction} className={className}>
      {children}
    </ResizablePanelGroup>
  );
}

interface PanelProps {
  children: ReactNode;
  defaultSize?: number;
  minSize?: number;
  maxSize?: number;
  className?: string;
  collapsible?: boolean;
  onCollapse?: () => void;
}

export function Panel({
  children,
  defaultSize = 50,
  minSize = 10,
  maxSize = 90,
  className,
  collapsible = false,
  onCollapse,
}: PanelProps) {
  return (
    <ResizablePanel
      defaultSize={defaultSize}
      minSize={minSize}
      maxSize={maxSize}
      collapsible={collapsible}
      onCollapse={onCollapse}
      className={className}
    >
      {children}
    </ResizablePanel>
  );
}

export function PanelSeparator() {
  return <ResizableHandle />;
}

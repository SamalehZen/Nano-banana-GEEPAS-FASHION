'use client';

import { useCanvas, useCanvasActions } from '@/contexts/CanvasContext';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon, ViewIcon, ViewOffIcon, SparklesIcon, ImageIcon, SquareIcon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

function LayerIcon({ type }: { type: string }) {
  switch (type) {
    case 'image':
      return <HugeiconsIcon icon={ImageIcon} size={14} className="text-muted-foreground" />;
    case 'frame':
      return <HugeiconsIcon icon={SquareIcon} size={14} className="text-muted-foreground" />;
    default:
      return <HugeiconsIcon icon={SparklesIcon} size={14} className="text-primary" />;
  }
}

export function LayerPanel() {
  const { state } = useCanvas();
  const { toggleLayerPanel, selectLayer, toggleLayerVisibility } = useCanvasActions();

  if (!state.showLayerPanel) return null;

  return (
    <div className="w-[260px] bg-popover border-r border-border flex flex-col animate-in slide-in-from-left-5 duration-200">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-sm font-semibold">Layer</span>
        <Button variant="ghost" size="icon-xs" onClick={toggleLayerPanel}>
          <HugeiconsIcon icon={Cancel01Icon} size={14} />
        </Button>
      </div>

      <div className="px-3 py-2 border-b border-border">
        <button className="flex items-center justify-between w-full text-sm font-medium">
          <span>History</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m18 15-6-6-6 6" />
          </svg>
        </button>
        {state.layers.length === 0 && (
          <div className="py-6 text-center">
            <div className="mx-auto w-12 h-12 mb-2 opacity-20">
              <svg viewBox="0 0 48 48" fill="currentColor" className="text-muted-foreground">
                <path d="M24 4C12.95 4 4 12.95 4 24s8.95 20 20 20 20-8.95 20-20S35.05 4 24 4zm0 36c-8.84 0-16-7.16-16-16S15.16 8 24 8s16 7.16 16 16-7.16 16-16 16z" opacity="0.3"/>
              </svg>
            </div>
            <p className="text-xs text-muted-foreground">No history yet</p>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="py-1">
          {state.layers.map(layer => (
            <button
              key={layer.id}
              onClick={() => selectLayer(layer.id)}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent/50 transition-colors group',
                state.selectedLayerId === layer.id && 'bg-accent'
              )}
            >
              {layer.type === 'image' && layer.data ? (
                <div className="w-7 h-7 flex-shrink-0 overflow-hidden border border-border">
                  <img src={layer.data} alt="" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center">
                  <LayerIcon type={layer.type} />
                </div>
              )}
              <span className="flex-1 text-left truncate text-xs">{layer.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleLayerVisibility(layer.id);
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <HugeiconsIcon
                  icon={layer.visible ? ViewIcon : ViewOffIcon}
                  size={12}
                  className="text-muted-foreground"
                />
              </button>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

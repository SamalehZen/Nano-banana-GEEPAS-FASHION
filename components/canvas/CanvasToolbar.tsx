'use client';

import { useState, useCallback, useEffect } from 'react';
import { useCanvas, useCanvasActions, type CanvasTool, type ToolCategory } from '@/contexts/CanvasContext';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  CursorIcon, MoveIcon, LocationIcon, SparklesIcon, GridIcon,
  SquareIcon, LineIcon, ArrowUpRightIcon, CircleIcon, PentagonIcon, StarIcon,
  PenToolIcon, TextCreationIcon, ImageUploadIcon, ShareIcon,
  ImagePlayIcon,
} from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ToolDef {
  tool: CanvasTool;
  category: ToolCategory;
  icon: any;
  label: string;
  shortcut?: string;
}

interface ToolGroup {
  category: ToolCategory;
  primary: ToolDef;
  submenu?: ToolDef[];
}

const TOOL_GROUPS: ToolGroup[] = [
  {
    category: 'select',
    primary: { tool: 'select', category: 'select', icon: CursorIcon, label: 'Select', shortcut: 'V' },
    submenu: [
      { tool: 'select', category: 'select', icon: CursorIcon, label: 'Select', shortcut: 'V' },
      { tool: 'hand', category: 'select', icon: MoveIcon, label: 'Hand Tool', shortcut: 'H' },
    ],
  },
  {
    category: 'pin',
    primary: { tool: 'pin', category: 'pin', icon: LocationIcon, label: 'Pin', shortcut: 'P' },
  },
  {
    category: 'ai-image',
    primary: { tool: 'ai-image', category: 'ai-image', icon: SparklesIcon, label: 'AI Image', shortcut: 'I' },
  },
  {
    category: 'grid',
    primary: { tool: 'grid', category: 'grid', icon: GridIcon, label: 'Grid', shortcut: 'G' },
  },
  {
    category: 'shape',
    primary: { tool: 'rectangle', category: 'shape', icon: SquareIcon, label: 'Shape', shortcut: 'R' },
    submenu: [
      { tool: 'rectangle', category: 'shape', icon: SquareIcon, label: 'Rectangle', shortcut: 'R' },
      { tool: 'line', category: 'shape', icon: LineIcon, label: 'Line', shortcut: 'L' },
      { tool: 'arrow', category: 'shape', icon: ArrowUpRightIcon, label: 'Arrow', shortcut: '⇧L' },
      { tool: 'ellipse', category: 'shape', icon: CircleIcon, label: 'Ellipse', shortcut: 'O' },
      { tool: 'polygon', category: 'shape', icon: PentagonIcon, label: 'Polygon' },
      { tool: 'star', category: 'shape', icon: StarIcon, label: 'Star' },
    ],
  },
  {
    category: 'pen',
    primary: { tool: 'pen', category: 'pen', icon: PenToolIcon, label: 'Pen', shortcut: 'D' },
  },
  {
    category: 'text',
    primary: { tool: 'text', category: 'text', icon: TextCreationIcon, label: 'Text', shortcut: 'T' },
  },
  {
    category: 'upload',
    primary: { tool: 'upload', category: 'upload', icon: ImageUploadIcon, label: 'Upload' },
    submenu: [
      { tool: 'upload', category: 'upload', icon: ImageUploadIcon, label: 'Upload Image' },
      { tool: 'upload', category: 'upload', icon: ImagePlayIcon, label: 'Upload Video' },
    ],
  },
  {
    category: 'export',
    primary: { tool: 'export', category: 'export', icon: ShareIcon, label: 'Export', shortcut: 'E' },
  },
];

const KEYBOARD_MAP: Record<string, { tool: CanvasTool; category: ToolCategory }> = {
  v: { tool: 'select', category: 'select' },
  h: { tool: 'hand', category: 'select' },
  p: { tool: 'pin', category: 'pin' },
  i: { tool: 'ai-image', category: 'ai-image' },
  g: { tool: 'grid', category: 'grid' },
  r: { tool: 'rectangle', category: 'shape' },
  l: { tool: 'line', category: 'shape' },
  o: { tool: 'ellipse', category: 'shape' },
  d: { tool: 'pen', category: 'pen' },
  t: { tool: 'text', category: 'text' },
  e: { tool: 'export', category: 'export' },
};

export function CanvasToolbar() {
  const { state } = useCanvas();
  const { setTool } = useCanvasActions();
  const [openSubmenu, setOpenSubmenu] = useState<ToolCategory | null>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    const mapping = KEYBOARD_MAP[e.key.toLowerCase()];
    if (mapping) {
      setTool(mapping.tool, mapping.category);
      setOpenSubmenu(null);
    }
  }, [setTool]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleToolClick = (group: ToolGroup) => {
    if (group.submenu && group.submenu.length > 1) {
      if (openSubmenu === group.category) {
        setOpenSubmenu(null);
      } else {
        setOpenSubmenu(group.category);
      }
    } else {
      setTool(group.primary.tool, group.primary.category);
      setOpenSubmenu(null);
    }
  };

  const handleSubmenuSelect = (def: ToolDef) => {
    setTool(def.tool, def.category);
    setOpenSubmenu(null);
  };

  const getActiveIcon = (group: ToolGroup) => {
    if (!group.submenu) return group.primary.icon;
    const active = group.submenu.find(s => s.tool === state.activeTool);
    return active ? active.icon : group.primary.icon;
  };

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
      <div className="relative flex items-center gap-0.5 bg-popover/95 backdrop-blur-md border border-border/50 shadow-lg px-1.5 py-1.5 rounded-xl">
        {TOOL_GROUPS.map((group, idx) => {
          const isActive = state.toolCategory === group.category;
          const activeIcon = getActiveIcon(group);

          return (
            <div key={group.category} className="relative">
              {idx === 7 && <div className="w-px h-5 bg-border/40 mx-1" />}

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      'transition-all duration-150 rounded-lg',
                      isActive && 'bg-foreground text-background hover:bg-foreground/90 hover:text-background'
                    )}
                    onClick={() => handleToolClick(group)}
                  >
                    <HugeiconsIcon icon={activeIcon} size={18} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="flex items-center gap-2">
                  {group.primary.label}
                  {group.primary.shortcut && (
                    <kbd className="px-1 py-0.5 bg-background/20 text-[10px] font-mono">
                      {group.primary.shortcut}
                    </kbd>
                  )}
                </TooltipContent>
              </Tooltip>

              {openSubmenu === group.category && group.submenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setOpenSubmenu(null)}
                  />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-150">
                    <div className="bg-popover border border-border shadow-xl py-1 min-w-[160px]">
                      {group.submenu.map(sub => (
                        <button
                          key={sub.tool}
                          onClick={() => handleSubmenuSelect(sub)}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-accent transition-colors',
                            state.activeTool === sub.tool && 'bg-accent'
                          )}
                        >
                          <HugeiconsIcon icon={sub.icon} size={16} />
                          <span className="flex-1 text-left">{sub.label}</span>
                          {sub.shortcut && (
                            <kbd className="text-xs text-muted-foreground font-mono">{sub.shortcut}</kbd>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

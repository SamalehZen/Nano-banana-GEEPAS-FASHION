'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { Settings01Icon, SparklesIcon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';

interface HeaderBarProps {
  projectName: string;
  onSettingsClick: () => void;
  credits?: number;
}

export function HeaderBar({ projectName, onSettingsClick, credits = 3 }: HeaderBarProps) {
  return (
    <header className="h-11 flex items-center justify-between px-3 border-b border-border bg-popover/80 backdrop-blur-sm flex-shrink-0">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 flex items-center justify-center bg-primary/10">
          <HugeiconsIcon icon={SparklesIcon} size={14} className="text-primary" />
        </div>
        <span className="text-sm font-medium truncate max-w-[200px]">{projectName}</span>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-amber-500">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
          <span className="tabular-nums font-medium">{credits}</span>
        </div>

        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
          U
        </div>

        <Button variant="ghost" size="icon-xs" onClick={onSettingsClick}>
          <HugeiconsIcon icon={Settings01Icon} size={14} className="text-muted-foreground" />
        </Button>
      </div>
    </header>
  );
}

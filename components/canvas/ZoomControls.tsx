'use client';

import { useCallback } from 'react';
import { useCanvas, useCanvasActions } from '@/contexts/CanvasContext';
import { HugeiconsIcon } from '@hugeicons/react';
import { LayersIcon, MinusSignIcon, PlusSignIcon, ArrowExpandIcon, CircleIcon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

export function ZoomControls() {
  const { state } = useCanvas();
  const { setZoom, setPan, toggleLayerPanel, resetView: resetViewAction } = useCanvasActions();
  const pct = Math.round(state.zoom * 100);

  const zoomIn = useCallback(() => {
    const nz = Math.min(state.zoom * 1.15, 20);
    const container = document.querySelector('[data-canvas-viewport]');
    if (container) {
      const rect = container.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const s = nz / state.zoom;
      setPan(cx - (cx - state.panX) * s, cy - (cy - state.panY) * s);
    }
    setZoom(nz);
  }, [state.zoom, state.panX, state.panY, setZoom, setPan]);

  const zoomOut = useCallback(() => {
    const nz = Math.max(state.zoom / 1.15, 0.02);
    const container = document.querySelector('[data-canvas-viewport]');
    if (container) {
      const rect = container.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const s = nz / state.zoom;
      setPan(cx - (cx - state.panX) * s, cy - (cy - state.panY) * s);
    }
    setZoom(nz);
  }, [state.zoom, state.panX, state.panY, setZoom, setPan]);

  const fitToView = useCallback(() => {
    const imgLayer = state.layers.find(l => l.type === 'image' && l.visible);
    if (!imgLayer) {
      resetViewAction();
      return;
    }
    const container = document.querySelector('[data-canvas-viewport]');
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const pad = 60;
    const scaleX = (rect.width - pad * 2) / imgLayer.width;
    const scaleY = (rect.height - pad * 2) / imgLayer.height;
    const nz = Math.min(scaleX, scaleY, 2);
    const cx = (rect.width - imgLayer.width * nz) / 2 - imgLayer.x * nz;
    const cy = (rect.height - imgLayer.height * nz) / 2 - imgLayer.y * nz;
    setZoom(nz);
    setPan(cx, cy);
  }, [state.layers, setZoom, setPan, resetViewAction]);

  const resetView = useCallback(() => {
    resetViewAction();
  }, [resetViewAction]);

  return (
    <div className="absolute bottom-14 left-3 z-20 flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={fitToView}
            className="bg-popover/90 backdrop-blur-sm border border-border/50 shadow-sm"
          >
            <HugeiconsIcon icon={CircleIcon} size={14} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">Zoom to fit</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={state.showLayerPanel ? 'secondary' : 'ghost'}
            size="icon-sm"
            onClick={toggleLayerPanel}
            className="bg-popover/90 backdrop-blur-sm border border-border/50 shadow-sm"
          >
            <HugeiconsIcon icon={LayersIcon} size={14} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">Layers</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={resetView}
            className="bg-popover/90 backdrop-blur-sm border border-border/50 shadow-sm"
          >
            <HugeiconsIcon icon={ArrowExpandIcon} size={14} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">Reset view</TooltipContent>
      </Tooltip>

      <div className="h-4 w-px bg-border/50 mx-0.5" />

      <div className="flex items-center bg-popover/90 backdrop-blur-sm border border-border/50 shadow-sm">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={zoomOut}
          className="border-0"
        >
          <HugeiconsIcon icon={MinusSignIcon} size={14} />
        </Button>

        <span className="text-[11px] font-medium text-foreground/80 min-w-[36px] text-center tabular-nums select-none">
          {pct}%
        </span>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={zoomIn}
          className="border-0"
        >
          <HugeiconsIcon icon={PlusSignIcon} size={14} />
        </Button>
      </div>
    </div>
  );
}

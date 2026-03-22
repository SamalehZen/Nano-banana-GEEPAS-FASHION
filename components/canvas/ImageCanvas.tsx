'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import { useCanvas, useCanvasActions } from '@/contexts/CanvasContext';
import { cn } from '@/lib/utils';

interface ImageCanvasProps {
  resultImage: string | null;
  onQuickEdit?: (layerId: string) => void;
}

export function ImageCanvas({ resultImage, onQuickEdit }: ImageCanvasProps) {
  const { state } = useCanvas();
  const { setZoom, setPan, setTool, selectLayer, addSelectionRef } = useCanvasActions();
  const containerRef = useRef<HTMLDivElement>(null);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const pinchRef = useRef({ dist: 0, zoom: 1, midX: 0, midY: 0, panX: 0, panY: 0 });
  const [quickEditPos, setQuickEditPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<{ x: number; y: number; id: number } | null>(null);
  const selectionCountRef = useRef(0);

  const zoom = state.zoom;
  const panX = state.panX;
  const panY = state.panY;

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const rect = containerRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.08 : 1 / 1.08;
    const nz = Math.min(Math.max(zoom * factor, 0.02), 20);
    const s = nz / zoom;
    setPan(mx - (mx - panX) * s, my - (my - panY) * s);
    setZoom(nz);
  }, [zoom, panX, panY, setZoom, setPan]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const getDist = (a: React.Touch, b: React.Touch) =>
    Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const d = getDist(e.touches[0], e.touches[1]);
      const rect = containerRef.current!.getBoundingClientRect();
      pinchRef.current = {
        dist: d,
        zoom,
        midX: (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left,
        midY: (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top,
        panX,
        panY,
      };
    } else if (e.touches.length === 1 && state.activeTool === 'hand') {
      isPanning.current = true;
      panStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, panX, panY };
    }
  }, [zoom, panX, panY, state.activeTool]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const d = getDist(e.touches[0], e.touches[1]);
      const scale = d / pinchRef.current.dist;
      const nz = Math.min(Math.max(pinchRef.current.zoom * scale, 0.02), 20);
      const ratio = nz / pinchRef.current.zoom;
      const mx = pinchRef.current.midX;
      const my = pinchRef.current.midY;
      setPan(
        mx - (mx - pinchRef.current.panX) * ratio,
        my - (my - pinchRef.current.panY) * ratio
      );
      setZoom(nz);
    } else if (isPanning.current && e.touches.length === 1) {
      const dx = e.touches[0].clientX - panStart.current.x;
      const dy = e.touches[0].clientY - panStart.current.y;
      setPan(panStart.current.panX + dx, panStart.current.panY + dy);
    }
  }, [setZoom, setPan]);

  const handleTouchEnd = useCallback(() => {
    isPanning.current = false;
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (state.activeTool === 'hand' || e.button === 1) {
      isPanning.current = true;
      panStart.current = { x: e.clientX, y: e.clientY, panX, panY };
      e.preventDefault();
    }
  }, [state.activeTool, panX, panY]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning.current) {
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      setPan(panStart.current.panX + dx, panStart.current.panY + dy);
    }
  }, [setPan]);

  const handleMouseUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (state.activeTool !== 'select' || !resultImage) return;
    if (isPanning.current) return;

    const rect = containerRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const imgLayer = state.layers.find(l => l.type === 'image' && l.visible);
    if (!imgLayer) return;

    const imgScreenX = imgLayer.x * zoom + panX;
    const imgScreenY = imgLayer.y * zoom + panY;
    const imgScreenW = imgLayer.width * zoom;
    const imgScreenH = imgLayer.height * zoom;

    if (x >= imgScreenX && x <= imgScreenX + imgScreenW &&
        y >= imgScreenY && y <= imgScreenY + imgScreenH) {
      selectLayer(imgLayer.id);
      selectionCountRef.current += 1;
      const refId = selectionCountRef.current;

      setSelectedBadge({ x: e.clientX - rect.left, y: e.clientY - rect.top, id: refId });
      setQuickEditPos({ x: e.clientX - rect.left + 30, y: e.clientY - rect.top - 10 });

      addSelectionRef({
        id: refId,
        layerId: imgLayer.id,
        label: imgLayer.name,
      });

      setTimeout(() => setQuickEditPos(null), 3000);
    }
  }, [state.activeTool, state.layers, zoom, panX, panY, resultImage, selectLayer, addSelectionRef]);

  const handleQuickEditClick = useCallback(() => {
    setQuickEditPos(null);
    const imgLayer = state.layers.find(l => l.type === 'image' && l.visible);
    if (imgLayer && onQuickEdit) onQuickEdit(imgLayer.id);
  }, [state.layers, onQuickEdit]);

  const cursorClass = state.activeTool === 'hand'
    ? 'cursor-grab active:cursor-grabbing'
    : state.activeTool === 'select'
      ? 'cursor-default'
      : 'cursor-crosshair';

  return (
    <div
      ref={containerRef}
      data-canvas-viewport
      className={cn(
        'relative flex-1 overflow-hidden select-none touch-none',
        cursorClass
      )}
      style={{
        backgroundColor: '#e8e8e8',
        backgroundImage: 'radial-gradient(circle, #d0d0d0 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleCanvasClick}
    >
      <div
        className="absolute origin-top-left will-change-transform"
        style={{
          transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
        }}
      >
        {state.layers.filter(l => l.visible).map(layer => {
          if (layer.type === 'image' && layer.data) {
            const isSelected = layer.id === state.selectedLayerId;
            return (
              <div
                key={layer.id}
                className="absolute"
                style={{
                  left: layer.x,
                  top: layer.y,
                  width: layer.width,
                  height: layer.height,
                }}
              >
                <img
                  src={layer.data}
                  alt={layer.name}
                  className="w-full h-full object-contain pointer-events-none"
                  draggable={false}
                />
                {isSelected && (
                  <div className="absolute inset-0 border-2 border-primary pointer-events-none" />
                )}
              </div>
            );
          }
          return null;
        })}
      </div>

      {!resultImage && state.layers.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-muted-foreground/40 space-y-3">
            <div className="w-16 h-16 mx-auto border-2 border-dashed border-muted-foreground/20 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-40">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="m21 15-5-5L5 21" />
              </svg>
            </div>
            <p className="text-sm">Generate or upload an image to start editing</p>
          </div>
        </div>
      )}

      {selectedBadge && (
        <div
          className="absolute pointer-events-none z-20"
          style={{ left: selectedBadge.x - 12, top: selectedBadge.y - 12 }}
        >
          <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow-lg ring-2 ring-white">
            {selectedBadge.id}
          </div>
        </div>
      )}

      {quickEditPos && (
        <div
          className="absolute z-30 animate-in fade-in-0 zoom-in-95 duration-150"
          style={{ left: quickEditPos.x, top: quickEditPos.y }}
        >
          <button
            onClick={handleQuickEditClick}
            className="flex items-center gap-2 bg-popover text-popover-foreground border border-border shadow-lg px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
          >
            Quick Edit
            <kbd className="ml-1 px-1.5 py-0.5 bg-muted text-muted-foreground text-[10px] font-mono">Tab</kbd>
          </button>
        </div>
      )}
    </div>
  );
}

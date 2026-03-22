'use client';

import { useEffect, useMemo, useRef, useState, type PointerEventHandler, type TouchEventHandler, type WheelEventHandler } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

export type CanvasTool = 'select' | 'hand' | 'upload' | 'shape' | 'draw' | 'text';

interface CanvasEditorProps {
  image: string;
  alt: string;
  onDownload: () => void;
  downloadLabel?: string;
  onSelectionPrompt?: (prompt: string) => void;
}

interface Point {
  x: number;
  y: number;
}

const MIN_SCALE = 0.1;
const MAX_SCALE = 8;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function CanvasEditor({ image, alt, onDownload, downloadLabel = 'Download', onSelectionPrompt }: CanvasEditorProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<CanvasTool>('select');
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState<Point>({ x: 0, y: 0 });
  const [displaySize, setDisplaySize] = useState({ w: 800, h: 600 });
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });

  const [isPointerDown, setIsPointerDown] = useState(false);
  const [selectionStart, setSelectionStart] = useState<Point | null>(null);
  const [selectionRect, setSelectionRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [selectionPrompt, setSelectionPrompt] = useState('');
  const [colorHex, setColorHex] = useState('#111111');
  const [opacity, setOpacity] = useState(100);
  const [fontSize, setFontSize] = useState('48');
  const [textAlign, setTextAlign] = useState('left');
  const [strokeWidth, setStrokeWidth] = useState('2');
  const dragStart = useRef<Point | null>(null);
  const translateStart = useRef<Point>({ x: 0, y: 0 });

  const pinchStartDist = useRef<number | null>(null);
  const pinchStartScale = useRef(1);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.src = image;
  }, [image]);

  useEffect(() => {
    if (!viewportRef.current || !naturalSize.w || !naturalSize.h) return;

    const viewport = viewportRef.current;

    const recompute = () => {
      const rect = viewport.getBoundingClientRect();
      const maxW = Math.max(rect.width - 48, 120);
      const maxH = Math.max(rect.height - 48, 120);
      const fit = Math.min(maxW / naturalSize.w, maxH / naturalSize.h);
      const w = naturalSize.w * fit;
      const h = naturalSize.h * fit;
      setDisplaySize({ w, h });
      setScale(1);
      setTranslate({ x: (rect.width - w) / 2, y: (rect.height - h) / 2 });
    };

    recompute();
    const obs = new ResizeObserver(recompute);
    obs.observe(viewport);
    return () => obs.disconnect();
  }, [naturalSize]);

  const zoom = (delta: number) => {
    setScale((prev) => clamp(prev + delta, MIN_SCALE, MAX_SCALE));
  };

  const onWheel: WheelEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    const direction = e.deltaY > 0 ? -0.08 : 0.08;
    zoom(direction);
  };

  const screenToImage = (clientX: number, clientY: number) => {
    const viewport = viewportRef.current;
    if (!viewport) return null;
    const rect = viewport.getBoundingClientRect();
    const x = (clientX - rect.left - translate.x) / scale;
    const y = (clientY - rect.top - translate.y) / scale;
    return {
      x: clamp(x, 0, displaySize.w),
      y: clamp(y, 0, displaySize.h),
    };
  };

  const onPointerDown: PointerEventHandler<HTMLDivElement> = (e) => {
    if (tool !== 'hand' && tool !== 'select') return;
    setIsPointerDown(true);
    if (tool === 'select') {
      const pt = screenToImage(e.clientX, e.clientY);
      if (pt) {
        setSelectionStart(pt);
        setSelectionRect({ x: pt.x, y: pt.y, w: 0, h: 0 });
      }
    }
    dragStart.current = { x: e.clientX, y: e.clientY };
    translateStart.current = translate;
  };

  const onPointerMove: PointerEventHandler<HTMLDivElement> = (e) => {
    if (!isPointerDown || !dragStart.current) return;
    if (tool === 'select' && selectionStart) {
      const current = screenToImage(e.clientX, e.clientY);
      if (!current) return;
      const x = Math.min(selectionStart.x, current.x);
      const y = Math.min(selectionStart.y, current.y);
      const w = Math.abs(current.x - selectionStart.x);
      const h = Math.abs(current.y - selectionStart.y);
      setSelectionRect({ x, y, w, h });
      return;
    }

    if (tool !== 'hand') return;

    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;

    setTranslate({
      x: translateStart.current.x + dx,
      y: translateStart.current.y + dy,
    });
  };

  const onPointerUp = () => {
    setIsPointerDown(false);
    dragStart.current = null;
    if (tool === 'select' && selectionRect && selectionRect.w >= 6 && selectionRect.h >= 6) {
      const xPct = ((selectionRect.x / displaySize.w) * 100).toFixed(1);
      const yPct = ((selectionRect.y / displaySize.h) * 100).toFixed(1);
      const wPct = ((selectionRect.w / displaySize.w) * 100).toFixed(1);
      const hPct = ((selectionRect.h / displaySize.h) * 100).toFixed(1);
      const prompt = `Édition ciblée: appliquer la modification uniquement dans la zone sélectionnée [x:${xPct}%, y:${yPct}%, largeur:${wPct}%, hauteur:${hPct}%]. Préserver strictement le reste de l'image.`;
      setSelectionPrompt(prompt);
      onSelectionPrompt?.(prompt);
    }
    setSelectionStart(null);
  };

  const onTouchStart: TouchEventHandler<HTMLDivElement> = (e) => {
    if (e.touches.length === 2) {
      const [t1, t2] = [e.touches[0], e.touches[1]];
      pinchStartDist.current = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      pinchStartScale.current = scale;
    }
  };

  const onTouchMove: TouchEventHandler<HTMLDivElement> = (e) => {
    if (e.touches.length !== 2 || pinchStartDist.current == null) return;
    e.preventDefault();
    const [t1, t2] = [e.touches[0], e.touches[1]];
    const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
    const nextScale = clamp((dist / pinchStartDist.current) * pinchStartScale.current, MIN_SCALE, MAX_SCALE);
    setScale(nextScale);
  };

  const onTouchEnd: TouchEventHandler<HTMLDivElement> = (e) => {
    if (e.touches.length < 2) {
      pinchStartDist.current = null;
    }
  };

  const zoomPercent = useMemo(() => `${Math.round(scale * 100)}%`, [scale]);

  return (
    <div className="space-y-3">
      <Card className="relative min-h-[560px] overflow-hidden bg-muted/30">
        <div
          ref={viewportRef}
          className="relative h-[560px] w-full touch-none"
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div
            className="absolute left-0 top-0"
            style={{
              width: `${displaySize.w}px`,
              height: `${displaySize.h}px`,
              transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
              transformOrigin: 'top left',
            }}
          >
            <img src={image} alt={alt} className="h-full w-full select-none object-contain" draggable={false} />
            {selectionRect && selectionRect.w > 0 && selectionRect.h > 0 && (
              <div
                className="absolute border-2 border-primary/90 bg-primary/20"
                style={{
                  left: `${selectionRect.x}px`,
                  top: `${selectionRect.y}px`,
                  width: `${selectionRect.w}px`,
                  height: `${selectionRect.h}px`,
                }}
              >
                {[
                  'left-[-5px] top-[-5px]',
                  'right-[-5px] top-[-5px]',
                  'left-[-5px] bottom-[-5px]',
                  'right-[-5px] bottom-[-5px]',
                ].map((position) => (
                  <span
                    key={position}
                    className={`absolute h-2.5 w-2.5 rounded-sm border border-primary bg-background ${position}`}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-xl border bg-background/90 p-2 backdrop-blur-sm">
            <Button variant="ghost" size="sm" onClick={() => zoom(-0.1)}>-</Button>
            <Badge variant="secondary" className="min-w-14 justify-center">{zoomPercent}</Badge>
            <Button variant="ghost" size="sm" onClick={() => zoom(0.1)}>+</Button>
          </div>

          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-2xl border bg-background/95 p-1.5 shadow-sm backdrop-blur-sm">
            <Button variant={tool === 'select' ? 'default' : 'ghost'} size="sm" onClick={() => setTool('select')}>Select</Button>
            <Button variant={tool === 'hand' ? 'default' : 'ghost'} size="sm" onClick={() => setTool('hand')}>Hand</Button>
            <Button variant={tool === 'upload' ? 'default' : 'ghost'} size="sm" onClick={() => setTool('upload')}>Upload</Button>
            <Button variant={tool === 'shape' ? 'default' : 'ghost'} size="sm" onClick={() => setTool('shape')}>Shape</Button>
            <Button variant={tool === 'draw' ? 'default' : 'ghost'} size="sm" onClick={() => setTool('draw')}>Draw</Button>
            <Button variant={tool === 'text' ? 'default' : 'ghost'} size="sm" onClick={() => setTool('text')}>Text</Button>
            <Button variant="ghost" size="sm">Generate</Button>
            <Separator orientation="vertical" className="mx-1 h-6" />
            <Button variant="outline" size="sm" onClick={onDownload}>{downloadLabel}</Button>
          </div>

          {(tool === 'text' || tool === 'shape' || tool === 'draw') && (
            <div className="absolute bottom-20 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-xl border bg-background/95 p-2 shadow-sm backdrop-blur-sm">
              {tool === 'text' && (
                <>
                  <Select defaultValue="inter">
                    <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inter">Inter</SelectItem>
                      <SelectItem value="serif">Serif</SelectItem>
                      <SelectItem value="mono">Mono</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select defaultValue="regular">
                    <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="regular">Regular</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="bold">Bold</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={fontSize} onValueChange={setFontSize}>
                    <SelectTrigger className="h-8 w-20"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24">24</SelectItem>
                      <SelectItem value="36">36</SelectItem>
                      <SelectItem value="48">48</SelectItem>
                      <SelectItem value="64">64</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={textAlign} onValueChange={setTextAlign}>
                    <SelectTrigger className="h-8 w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                    </SelectContent>
                  </Select>
                </>
              )}

              {tool === 'shape' && (
                <>
                  <Select defaultValue="rectangle">
                    <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rectangle">Rectangle</SelectItem>
                      <SelectItem value="ellipse">Ellipse</SelectItem>
                      <SelectItem value="line">Line</SelectItem>
                      <SelectItem value="arrow">Arrow</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={strokeWidth} onValueChange={setStrokeWidth}>
                    <SelectTrigger className="h-8 w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 px</SelectItem>
                      <SelectItem value="2">2 px</SelectItem>
                      <SelectItem value="4">4 px</SelectItem>
                      <SelectItem value="8">8 px</SelectItem>
                    </SelectContent>
                  </Select>
                </>
              )}

              {tool === 'draw' && (
                <>
                  <Badge variant="secondary">Brush</Badge>
                  <Select value={strokeWidth} onValueChange={setStrokeWidth}>
                    <SelectTrigger className="h-8 w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="4">4 px</SelectItem>
                      <SelectItem value="10">10 px</SelectItem>
                      <SelectItem value="16">16 px</SelectItem>
                      <SelectItem value="24">24 px</SelectItem>
                    </SelectContent>
                  </Select>
                </>
              )}

              <div className="flex items-center gap-2 rounded-md border px-2 py-1">
                <input
                  type="color"
                  value={colorHex}
                  onChange={(e) => setColorHex(e.target.value)}
                  className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
                  aria-label="Couleur"
                />
                <span className="text-xs text-muted-foreground">{colorHex.toUpperCase()}</span>
              </div>
              <div className="flex items-center gap-2 rounded-md border px-2 py-1">
                <span className="text-xs text-muted-foreground">Opacity</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                  className="w-24"
                  aria-label="Opacity"
                />
                <span className="text-xs tabular-nums">{opacity}%</span>
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card className="p-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <Badge variant="outline" className="w-fit">Edit cible</Badge>
          <Input
            value={selectionPrompt || 'Sélectionne une zone sur le canvas pour générer un prompt ciblé.'}
            readOnly
          />
          <Button onClick={() => onSelectionPrompt?.(selectionPrompt)} disabled={!selectionPrompt}>Envoyer au chatbot</Button>
          <Button
            variant="ghost"
            onClick={() => {
              setSelectionRect(null);
              setSelectionPrompt('');
            }}
            disabled={!selectionPrompt}
          >
            Effacer
          </Button>
        </div>
      </Card>
    </div>
  );
}

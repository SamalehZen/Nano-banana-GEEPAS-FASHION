'use client';

import { useState } from 'react';
import { useCanvas, useCanvasActions } from '@/contexts/CanvasContext';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  TextAlignLeftIcon, TextAlignCenterIcon, TextAlignRightIcon,
  TextBoldIcon, TextItalicIcon, TextUnderlineIcon, TextStrikethroughIcon,
  TextKerningIcon, TextIndentMoreIcon, TextIndentLessIcon,
  TextAllCapsIcon, TextSmallcapsIcon,
  Download01Icon, ArrowExpandIcon,
} from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

const FONT_FAMILIES = [
  'Inter', 'Arial', 'Helvetica', 'Georgia', 'Times New Roman',
  'Courier New', 'Roboto', 'Open Sans', 'Lato', 'Montserrat',
  'Poppins', 'Nunito', 'Playfair Display', 'Merriweather', 'Raleway',
];

const FONT_WEIGHTS = [
  'Regular', 'Black', 'Bold', 'ExtraBold', 'ExtraLight',
  'Italic', 'Light', 'Medium', 'SemiBold', 'Thin',
];

function ColorDot({ color, onClick }: { color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-5 h-5 border border-border shadow-sm transition-transform hover:scale-110"
      style={{ backgroundColor: color }}
    />
  );
}

function NoFillDot({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-5 h-5 border border-border relative overflow-hidden hover:scale-110 transition-transform"
    >
      <div className="absolute inset-0 bg-white" />
      <div className="absolute top-1/2 left-0 w-full h-px bg-red-500 -rotate-45 origin-center" />
    </button>
  );
}

function ColorPickerPopover({ color, onChange }: { color: string; onChange: (c: string) => void }) {
  const [hex, setHex] = useState(color);
  const [hue, setHue] = useState(0);
  const [opacity, setOpacity] = useState(100);
  const presets = ['#000000', '#FFFFFF', '#10B981', '#8B5CF6', '#C084FC', '#F472B6'];

  const hueColor = `hsl(${hue}, 100%, 50%)`;

  const handleGradientClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    const r = Math.round(255 * (1 - x) * (1 - y));
    const g = Math.round((255 - (255 - (hue < 120 ? (hue / 120) * 255 : hue < 240 ? ((240 - hue) / 120) * 255 : 0)) * x) * (1 - y));
    const b = Math.round((255 - (255 - (hue > 120 ? ((hue - 120) / 120 > 1 ? (2 - (hue - 120) / 120) : (hue - 120) / 120) * 255 : 0)) * x) * (1 - y));
    const h = '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
    setHex(h);
    onChange(h);
  };

  const handleHueClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHue(Math.round(x * 360));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1.5">
          <ColorDot color={color} onClick={() => {}} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4 space-y-3" side="top">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Fill</span>
        </div>

        <div
          className="w-full h-40 relative cursor-crosshair rounded-sm overflow-hidden"
          onClick={handleGradientClick}
          style={{
            background: `linear-gradient(to bottom, transparent, #000),
                         linear-gradient(to right, #fff, ${hueColor})`,
          }}
        >
          <div className="absolute w-3 h-3 rounded-full border-2 border-white shadow-md pointer-events-none" style={{ left: '0%', top: '100%', transform: 'translate(-50%, -50%)' }} />
        </div>

        <div
          className="h-3 w-full cursor-pointer rounded-full overflow-hidden"
          onClick={handleHueClick}
          style={{
            background: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)',
          }}
        >
          <div className="relative h-full">
            <div className="absolute w-3 h-3 rounded-full border-2 border-white shadow-md top-0 pointer-events-none" style={{ left: `${(hue / 360) * 100}%`, transform: 'translateX(-50%)' }} />
          </div>
        </div>

        <div className="h-3 w-full cursor-pointer rounded-full overflow-hidden"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            setOpacity(Math.round(x * 100));
          }}
          style={{
            background: `linear-gradient(to right, transparent, ${color}),
                         repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 0 0 / 8px 8px`,
          }}
        >
          <div className="relative h-full">
            <div className="absolute w-3 h-3 rounded-full border-2 border-white shadow-md top-0 pointer-events-none" style={{ left: `${opacity}%`, transform: 'translateX(-50%)' }} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <NoFillDot onClick={() => onChange('transparent')} />
          {presets.map(c => (
            <button
              key={c}
              onClick={() => { onChange(c); setHex(c); }}
              className={cn(
                'w-6 h-6 rounded-full border shadow-sm transition-transform hover:scale-110',
                c === color ? 'ring-2 ring-primary ring-offset-1' : 'border-border'
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">#</span>
          <Input
            value={hex.replace('#', '')}
            onChange={e => {
              const v = '#' + e.target.value;
              setHex(v);
              if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v);
            }}
            className="flex-1 font-mono text-xs"
            maxLength={6}
          />
          <span className="text-xs text-muted-foreground w-10 text-right">{opacity} %</span>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function TextToolOptions() {
  const { state } = useCanvas();
  const actions = useCanvasActions();
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <ColorPickerPopover color={state.fillColor} onChange={actions.setFillColor} />
      <NoFillDot onClick={() => actions.setFillColor('transparent')} />

      <div className="h-4 w-px bg-border/40" />

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="min-w-[100px] justify-between text-xs">
            {state.fontFamily}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-0" side="top">
          <div className="p-2 border-b border-border">
            <Input placeholder="Search fonts" className="text-xs" />
          </div>
          <div className="max-h-[250px] overflow-y-auto py-1">
            {FONT_FAMILIES.map(f => (
              <button
                key={f}
                onClick={() => actions.setFontFamily(f)}
                className={cn(
                  'w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors',
                  state.fontFamily === f && 'bg-accent font-medium'
                )}
                style={{ fontFamily: f }}
              >
                {f}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <Select value={state.fontWeight} onValueChange={actions.setFontWeight}>
        <SelectTrigger className="w-[100px]" size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FONT_WEIGHTS.map(w => (
            <SelectItem key={w} value={w}>{w}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={String(state.fontSize)} onValueChange={v => actions.setFontSize(Number(v))}>
        <SelectTrigger className="w-[60px]" size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {[12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 56, 64, 72, 80, 96, 120].map(s => (
            <SelectItem key={s} value={String(s)}>{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="h-4 w-px bg-border/40" />

      <div className="flex items-center">
        {[
          { align: 'left', icon: TextAlignLeftIcon },
          { align: 'center', icon: TextAlignCenterIcon },
          { align: 'right', icon: TextAlignRightIcon },
        ].map(({ align, icon }) => (
          <Button
            key={align}
            variant="ghost"
            size="icon-xs"
            className={cn(state.textAlign === align && 'bg-accent')}
            onClick={() => actions.setTextAlign(align)}
          >
            <HugeiconsIcon icon={icon} size={14} />
          </Button>
        ))}
      </div>

      <Popover open={showAdvanced} onOpenChange={setShowAdvanced}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon-xs">
            <HugeiconsIcon icon={ArrowExpandIcon} size={14} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3 space-y-2" side="top">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-muted/50 px-2 py-1">
              <HugeiconsIcon icon={TextKerningIcon} size={14} className="text-muted-foreground" />
              <span className="text-xs">auto</span>
            </div>
            <div className="flex items-center gap-1 bg-muted/50 px-2 py-1">
              <span className="text-xs font-mono">|A|</span>
              <span className="text-xs">0</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-xs"><span className="text-xs">—</span></Button>
            <Button variant="ghost" size="icon-xs"><HugeiconsIcon icon={TextUnderlineIcon} size={14} /></Button>
            <Button variant="ghost" size="icon-xs"><HugeiconsIcon icon={TextStrikethroughIcon} size={14} /></Button>
            <div className="w-px h-4 bg-border/40 mx-1" />
            <Button variant="ghost" size="icon-xs"><span className="text-xs">—</span></Button>
            <Button variant="ghost" size="icon-xs"><HugeiconsIcon icon={TextIndentMoreIcon} size={14} /></Button>
            <Button variant="ghost" size="icon-xs"><HugeiconsIcon icon={TextIndentLessIcon} size={14} /></Button>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-xs"><span className="text-xs">—</span></Button>
            <Button variant="ghost" size="icon-xs"><span className="text-xs font-medium">Aa</span></Button>
            <Button variant="ghost" size="icon-xs"><HugeiconsIcon icon={TextAllCapsIcon} size={14} /></Button>
            <Button variant="ghost" size="icon-xs"><HugeiconsIcon icon={TextSmallcapsIcon} size={14} /></Button>
            <div className="w-px h-4 bg-border/40 mx-1" />
            <Button variant="ghost" size="icon-xs">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 5h8M13 12h8M3 19h18" />
              </svg>
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <Button variant="ghost" size="icon-xs">
        <HugeiconsIcon icon={Download01Icon} size={14} />
      </Button>
    </div>
  );
}

function PenToolOptions() {
  const { state } = useCanvas();
  const actions = useCanvasActions();

  return (
    <div className="flex items-center gap-3">
      <ColorPickerPopover color={state.strokeColor} onChange={actions.setStrokeColor} />
      <div className="flex items-center gap-2 bg-muted/50 px-2.5 py-1 rounded-sm">
        <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: state.strokeColor }} />
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground">
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
        <Input
          type="number"
          value={state.strokeWidth}
          onChange={e => actions.setStrokeWidth(Number(e.target.value))}
          className="w-10 text-xs text-center border-0 bg-transparent p-0 h-auto"
          min={1}
          max={100}
        />
        <span className="text-xs text-muted-foreground">Px</span>
      </div>
    </div>
  );
}

function ShapeToolOptions() {
  const { state } = useCanvas();
  const actions = useCanvasActions();

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Fill</span>
        <ColorPickerPopover color={state.fillColor} onChange={actions.setFillColor} />
      </div>
      <div className="h-4 w-px bg-border/40" />
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Stroke</span>
        <ColorPickerPopover color={state.strokeColor} onChange={actions.setStrokeColor} />
      </div>
      <div className="h-4 w-px bg-border/40" />
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Width</span>
        <div className="w-20">
          <Slider
            value={[state.strokeWidth]}
            onValueChange={([v]) => actions.setStrokeWidth(v)}
            min={0}
            max={20}
            step={1}
          />
        </div>
        <span className="text-xs tabular-nums w-6 text-right">{state.strokeWidth}</span>
      </div>
    </div>
  );
}

export function ToolOptionBar() {
  const { state } = useCanvas();
  const { toolCategory } = state;

  const showBar = toolCategory === 'text' || toolCategory === 'pen' || toolCategory === 'shape';
  if (!showBar) return null;

  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
      <div className="bg-popover/95 backdrop-blur-md border border-border/50 shadow-lg px-3 py-2">
        {toolCategory === 'text' && <TextToolOptions />}
        {toolCategory === 'pen' && <PenToolOptions />}
        {toolCategory === 'shape' && <ShapeToolOptions />}
      </div>
    </div>
  );
}

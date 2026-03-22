'use client';

import { useState, useCallback, useEffect } from 'react';
import { ApiKeyProvider, useApiKey, IMAGE_MODELS, type ImageModelId } from '@/contexts/ApiKeyContext';
import { CanvasProvider, useCanvas } from '@/contexts/CanvasContext';
import ApiKeyGuard from '@/components/ApiKeyGuard';
import { HeaderBar } from '@/components/canvas/HeaderBar';
import { ImageCanvas } from '@/components/canvas/ImageCanvas';
import { CanvasToolbar } from '@/components/canvas/CanvasToolbar';
import { ZoomControls } from '@/components/canvas/ZoomControls';
import { ToolOptionBar } from '@/components/canvas/ToolOptionBar';
import { LayerPanel } from '@/components/canvas/LayerPanel';
import { ChatPanel } from '@/components/canvas/ChatPanel';
import { HugeiconsIcon } from '@hugeicons/react';
import { Settings01Icon, ViewIcon, ViewOffIcon, Delete01Icon } from '@hugeicons/core-free-icons';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

function SettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { apiKey, setApiKey, clearApiKey, imageModel, setImageModel } = useApiKey();
  const [showKey, setShowKey] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  const maskedKey = apiKey ? `${apiKey.slice(0, 6)}${'•'.repeat(20)}${apiKey.slice(-4)}` : '';

  const handleUpdate = () => {
    const trimmed = newKey.trim();
    if (trimmed.length >= 10) {
      setApiKey(trimmed);
      setNewKey('');
    }
  };

  const handleClear = () => {
    if (confirmClear) {
      clearApiKey();
      setConfirmClear(false);
      onOpenChange(false);
    } else {
      setConfirmClear(true);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); setConfirmClear(false); setNewKey(''); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>API Key Settings</DialogTitle>
          <DialogDescription>Manage your Google Gemini API key.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs uppercase tracking-wider">Current Key</Label>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-muted px-3 py-2 text-sm font-mono truncate">
                {showKey ? apiKey : maskedKey}
              </code>
              <Button variant="ghost" size="icon" onClick={() => setShowKey(!showKey)}>
                <HugeiconsIcon icon={showKey ? ViewOffIcon : ViewIcon} size={16} />
              </Button>
            </div>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs uppercase tracking-wider">Image Model</Label>
            <Select value={imageModel} onValueChange={(v) => setImageModel(v as ImageModelId)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(IMAGE_MODELS).map(([id, name]) => (
                  <SelectItem key={id} value={id}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label htmlFor="new-key">Update Key</Label>
            <div className="flex gap-2">
              <Input
                id="new-key"
                type="password"
                placeholder="Enter new API key..."
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUpdate()}
              />
              <Button onClick={handleUpdate} disabled={newKey.trim().length < 10}>Save</Button>
            </div>
          </div>
        </div>
        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button variant="destructive" size="sm" onClick={handleClear} className="gap-1.5">
            <HugeiconsIcon icon={Delete01Icon} size={14} />
            {confirmClear ? 'Confirm Remove' : 'Remove Key'}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StudioContent() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStep, setLoadingStep] = useState<'generating' | 'editing' | null>(null);
  const [currentState, setCurrentState] = useState<any>(null);
  const [history, setHistory] = useState<{ image: string; state: any }[]>([]);
  const { dispatch } = useCanvas();
  const { state: canvasState } = useCanvas();

  const handleResultImage = useCallback((url: string) => {
    setResultImage(url);

    const img = new Image();
    img.onload = () => {
      const existingImgLayer = canvasState.layers.find(l => l.type === 'image');
      if (existingImgLayer) {
        dispatch({ type: 'UPDATE_LAYER', id: existingImgLayer.id, updates: { data: url } });
      } else {
        const layerId = `img-${Date.now()}`;
        dispatch({
          type: 'ADD_LAYER',
          layer: {
            id: layerId,
            type: 'image',
            name: 'Generated Image',
            visible: true,
            data: url,
            x: 50,
            y: 50,
            width: img.naturalWidth || 512,
            height: img.naturalHeight || 512,
          }
        });
        dispatch({ type: 'SELECT_LAYER', id: layerId });
      }
    };
    img.src = url;
  }, [dispatch, canvasState.layers]);

  const handleQuickEdit = useCallback(() => {
    const chatInput = document.querySelector<HTMLTextAreaElement>('[data-slot="textarea"]');
    if (chatInput) {
      chatInput.focus();
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && canvasState.selectedLayerId) {
        const active = document.activeElement;
        const isInChat = active?.closest('[data-slot="textarea"]') || active?.closest('input');
        if (!isInChat) {
          e.preventDefault();
          handleQuickEdit();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canvasState.selectedLayerId, handleQuickEdit]);

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <HeaderBar
        projectName="Untitled"
        onSettingsClick={() => setSettingsOpen(true)}
      />

      <div className="flex-1 flex overflow-hidden">
        <LayerPanel />

        <div className="flex-1 relative flex flex-col">
          <ImageCanvas resultImage={resultImage} onQuickEdit={handleQuickEdit} />
          <ToolOptionBar />
          <ZoomControls />
          <CanvasToolbar />
        </div>

        <ChatPanel
          resultImage={resultImage}
          onResultImage={handleResultImage}
          isGenerating={isGenerating}
          setIsGenerating={setIsGenerating}
          loadingStep={loadingStep}
          setLoadingStep={setLoadingStep}
          currentState={currentState}
          setCurrentState={setCurrentState}
          history={history}
          setHistory={setHistory}
        />
      </div>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}

export default function Home() {
  return (
    <ApiKeyProvider>
      <ApiKeyGuard>
        <CanvasProvider>
          <StudioContent />
        </CanvasProvider>
      </ApiKeyGuard>
    </ApiKeyProvider>
  );
}

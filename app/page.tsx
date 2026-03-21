'use client';

import { useState } from 'react';
import { ApiKeyProvider, useApiKey, IMAGE_MODELS, type ImageModelId } from '@/contexts/ApiKeyContext';
import ApiKeyGuard from '@/components/ApiKeyGuard';
import { ProductDesignMode } from '@/components/ProductDesignMode';
import { VirtualTryOnMode } from '@/components/VirtualTryOnMode';
import { EnhanceMode } from '@/components/EnhanceMode';
import { HugeiconsIcon } from '@hugeicons/react';
import { SparklesIcon, Shirt01Icon, Image01Icon, ArrowExpand01Icon, Settings01Icon, ViewIcon, ViewOffIcon, Delete01Icon } from '@hugeicons/core-free-icons';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
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
              <Button onClick={handleUpdate} disabled={newKey.trim().length < 10}>
                Save
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleClear}
            className="gap-1.5"
          >
            <HugeiconsIcon icon={Delete01Icon} size={14} />
            {confirmClear ? 'Confirm Remove' : 'Remove Key'}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AppContent() {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <ApiKeyGuard>
      <main className="min-h-screen bg-background text-foreground selection:bg-primary/20">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <header className="mb-12 text-center space-y-4 relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0"
              onClick={() => setSettingsOpen(true)}
            >
              <HugeiconsIcon icon={Settings01Icon} size={20} className="text-muted-foreground" />
            </Button>
            <div className="inline-flex items-center justify-center p-3 bg-primary/10 mb-4">
              <HugeiconsIcon icon={SparklesIcon} size={32} className="text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight font-sans">
              AI Studio <span className="text-primary">Vision</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Advanced image generation platform powered by Gemini 3.1 Flash Image.
            </p>
          </header>

          <Tabs defaultValue="design" className="w-full">
            <TabsList
              className="w-full grid grid-cols-3 h-auto p-1 bg-[#f6f8fa] border border-[#e5e5e5] mb-8"
              aria-label="Mode selection"
            >
              <TabsTrigger
                value="design"
                className="flex items-center justify-center gap-2.5 h-auto py-3 px-4 text-[15px] font-normal text-[#656d76] transition-all duration-200 ease-in-out hover:text-[#1f2328] data-[state=active]:bg-white data-[state=active]:text-[#1f2328] data-[state=active]:font-semibold"
              >
                <HugeiconsIcon icon={Image01Icon} size={18} />
                Product Design
              </TabsTrigger>
              <TabsTrigger
                value="tryon"
                className="flex items-center justify-center gap-2.5 h-auto py-3 px-4 text-[15px] font-normal text-[#656d76] transition-all duration-200 ease-in-out hover:text-[#1f2328] data-[state=active]:bg-white data-[state=active]:text-[#1f2328] data-[state=active]:font-semibold"
              >
                <HugeiconsIcon icon={Shirt01Icon} size={18} />
                Virtual Try-On
              </TabsTrigger>
              <TabsTrigger
                value="enhance"
                className="flex items-center justify-center gap-2.5 h-auto py-3 px-4 text-[15px] font-normal text-[#656d76] transition-all duration-200 ease-in-out hover:text-[#1f2328] data-[state=active]:bg-white data-[state=active]:text-[#1f2328] data-[state=active]:font-semibold"
              >
                <HugeiconsIcon icon={ArrowExpand01Icon} size={18} />
                AI Enhance
              </TabsTrigger>
            </TabsList>

            <Card className="p-6 md:p-8">
              <TabsContent value="design" className="mt-0">
                <ProductDesignMode />
              </TabsContent>
              <TabsContent value="tryon" className="mt-0">
                <VirtualTryOnMode />
              </TabsContent>
              <TabsContent value="enhance" className="mt-0">
                <EnhanceMode />
              </TabsContent>
            </Card>
          </Tabs>
        </div>
      </main>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </ApiKeyGuard>
  );
}

export default function Home() {
  return (
    <ApiKeyProvider>
      <AppContent />
    </ApiKeyProvider>
  );
}

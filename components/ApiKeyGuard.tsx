'use client';

import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { SparklesIcon, ViewIcon, ViewOffIcon, LinkSquare01Icon, SecurityCheckIcon } from '@hugeicons/core-free-icons';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { useApiKey } from '@/contexts/ApiKeyContext';

export default function ApiKeyGuard({ children }: { children: React.ReactNode }) {
  const { apiKey, setApiKey } = useApiKey();
  const [inputKey, setInputKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState('');

  const handleSave = () => {
    const trimmed = inputKey.trim();
    if (!trimmed) {
      setError('Please enter an API key.');
      return;
    }
    if (trimmed.length < 10) {
      setError('That doesn\'t look like a valid API key.');
      return;
    }
    setError('');
    setApiKey(trimmed);
  };

  if (apiKey) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center bg-primary/10">
            <HugeiconsIcon icon={SparklesIcon} size={28} className="text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Welcome to AI Studio Vision</CardTitle>
          <CardDescription className="text-base">
            Enter your Google Gemini API key to get started. You need a key with billing enabled for image generation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-key">API Key</Label>
            <div className="relative">
              <Input
                id="api-key"
                type={showKey ? 'text' : 'password'}
                placeholder="AIza..."
                value={inputKey}
                onChange={(e) => {
                  setInputKey(e.target.value);
                  if (error) setError('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowKey(!showKey)}
              >
                <HugeiconsIcon icon={showKey ? ViewOffIcon : ViewIcon} size={16} className="text-muted-foreground" />
              </Button>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            Get your API key <HugeiconsIcon icon={LinkSquare01Icon} size={14} />
          </a>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button onClick={handleSave} className="w-full" size="lg">
            Save & Continue
          </Button>
          <Alert variant="default" className="border-muted">
            <HugeiconsIcon icon={SecurityCheckIcon} size={16} />
            <AlertDescription className="text-xs text-muted-foreground">
              Your API key is stored locally in your browser only. It is never sent to any server other than Google&apos;s API.
            </AlertDescription>
          </Alert>
        </CardFooter>
      </Card>
    </div>
  );
}

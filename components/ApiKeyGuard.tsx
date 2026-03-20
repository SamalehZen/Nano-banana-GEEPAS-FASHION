'use client';

import { useState, useEffect } from 'react';

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

export default function ApiKeyGuard({ children }: { children: React.ReactNode }) {
  const [hasKey, setHasKey] = useState<boolean | null>(null);

  useEffect(() => {
    const checkKey = async () => {
      if (typeof window !== 'undefined' && window.aistudio) {
        const keySelected = await window.aistudio.hasSelectedApiKey();
        setHasKey(keySelected);
      } else {
        // Fallback if not in AI Studio environment
        setHasKey(true);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (typeof window !== 'undefined' && window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasKey(true);
    }
  };

  if (hasKey === null) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!hasKey) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background text-foreground p-4">
        <div className="max-w-md text-center space-y-6 bg-card p-8 rounded-xl shadow-lg border border-border">
          <h1 className="text-2xl font-bold">API Key Required</h1>
          <p className="text-muted-foreground">
            This application uses advanced image generation models (Gemini 3.1 Flash Image) which require a paid Google Cloud API key.
          </p>
          <p className="text-sm text-muted-foreground">
            Please select a project with billing enabled. See <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-primary hover:underline">billing documentation</a> for details.
          </p>
          <button
            onClick={handleSelectKey}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-colors"
          >
            Select API Key
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

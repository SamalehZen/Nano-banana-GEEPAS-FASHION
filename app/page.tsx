'use client';

import { useState } from 'react';
import ApiKeyGuard from '@/components/ApiKeyGuard';
import { ProductDesignMode } from '@/components/ProductDesignMode';
import { VirtualTryOnMode } from '@/components/VirtualTryOnMode';
import { Sparkles, Shirt, Image as ImageIcon } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'design' | 'tryon'>('design');

  return (
    <ApiKeyGuard>
      <main className="min-h-screen bg-background text-foreground selection:bg-primary/20">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <header className="mb-12 text-center space-y-4">
            <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl mb-4">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight font-sans">
              AI Studio <span className="text-primary">Vision</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Advanced image generation platform powered by Gemini 3.1 Flash Image.
            </p>
          </header>

          <div className="flex justify-center mb-12">
            <div className="inline-flex bg-muted p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('design')}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                  activeTab === 'design' 
                    ? 'bg-background text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <ImageIcon size={18} />
                Product Design
              </button>
              <button
                onClick={() => setActiveTab('tryon')}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                  activeTab === 'tryon' 
                    ? 'bg-background text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Shirt size={18} />
                Virtual Try-On
              </button>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm">
            {activeTab === 'design' ? <ProductDesignMode /> : <VirtualTryOnMode />}
          </div>
        </div>
      </main>
    </ApiKeyGuard>
  );
}

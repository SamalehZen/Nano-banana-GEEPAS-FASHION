'use client';

import { useState, useRef, useEffect } from 'react';
import { Type } from '@google/genai';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowLeft01Icon,
  SentIcon,
  Loading03Icon,
  UndoIcon,
  Download01Icon,
  SparklesIcon,
  ViewIcon,
  BubbleChatIcon,
  SourceCodeIcon,
  AttachmentIcon,
} from '@hugeicons/core-free-icons';
import { IMAGE_METADATA_SCHEMA } from './DesignChatbot';
import { JsonViewer } from './JsonViewer';
import { useGemini } from '@/hooks/use-gemini';
import { useApiKey, IMAGE_MODELS, type ImageModelId } from '@/contexts/ApiKeyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

interface CanvasViewProps {
  resultImage: string | null;
  isGenerating: boolean;
  loadingStep: 'generating' | 'editing' | null;
  isExtractingMetadata: boolean;
  currentState: any;
  onApplyPatch: (newState: any, editPrompt: string) => void;
  onUndo: () => void;
  canUndo: boolean;
  onBack: () => void;
  onDownload: () => void;
  error: string | null;
}

export function CanvasView({
  resultImage,
  isGenerating,
  loadingStep,
  isExtractingMetadata,
  currentState,
  onApplyPatch,
  onUndo,
  canUndo,
  onBack,
  onDownload,
  error,
}: CanvasViewProps) {
  const ai = useGemini();
  const { imageModel } = useApiKey();
  const [panelMode, setPanelMode] = useState<'chat' | 'json'>('chat');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const [genStartTime, setGenStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (isGenerating && !genStartTime) {
      setGenStartTime(Date.now());
    }
    if (!isGenerating && genStartTime) {
      setGenStartTime(null);
    }
  }, [isGenerating, genStartTime]);

  useEffect(() => {
    if (!genStartTime) {
      setElapsed(0);
      return;
    }
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - genStartTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [genStartTime]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing, isGenerating]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const modelName = IMAGE_MODELS[imageModel as ImageModelId] || imageModel;

  const handleSend = async () => {
    if (!input.trim() || isProcessing || isGenerating || !ai || !currentState) return;

    const userMsg = input;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setIsProcessing(true);

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `You are a JSON modifier assistant. 
Current JSON State:
${JSON.stringify(currentState, null, 2)}

User Request: "${userMsg}"

Generate a FULLY UPDATED JSON state that incorporates the user's request. Keep everything else exactly the same. Only modify the fields that need to change based on the request. Also provide a friendly message explaining what you changed. Finally, provide a short, direct 'editPrompt' that will be sent to an image editing AI to perform this exact visual change (e.g., 'Change the text 75ml to 125L', 'Make the background sunset').`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              updatedState: IMAGE_METADATA_SCHEMA,
              editPrompt: {
                type: Type.STRING,
                description:
                  'A short, direct prompt for an image editing AI to perform this exact visual change.',
              },
              message: { type: Type.STRING },
            },
            required: ['updatedState', 'editPrompt', 'message'],
          },
        },
      });

      const text = response.text;
      if (!text) throw new Error('No response text received.');

      const result = JSON.parse(text);
      setMessages((prev) => [...prev, { role: 'assistant', content: result.message }]);
      onApplyPatch(result.updatedState, result.editPrompt);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I encountered an error processing your request.' },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col lg:flex-row bg-background">
      {/* ─── Left: Canvas ─── */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Top bar */}
        <div className="h-12 flex items-center gap-3 px-4 border-b border-border shrink-0">
          <Button variant="ghost" size="icon-sm" onClick={onBack}>
            <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
          </Button>
          <Separator orientation="vertical" className="h-5" />
          <div className="flex items-center gap-2">
            <HugeiconsIcon icon={SparklesIcon} size={16} className="text-primary" />
            <span className="text-sm font-semibold tracking-tight">AI Studio Vision</span>
          </div>
        </div>

        {/* Canvas area */}
        <div className="flex-1 flex items-center justify-center bg-[#f0f0f0] dark:bg-[#1a1a1a] relative overflow-hidden">
          {resultImage && !isGenerating ? (
            <img
              src={resultImage}
              alt="Generated"
              className="max-w-full max-h-full object-contain transition-opacity duration-300"
              style={{ maxHeight: 'calc(100vh - 6rem)' }}
            />
          ) : (
            <div className="w-[55%] max-w-lg aspect-square bg-gradient-to-br from-muted/70 to-muted/30 flex items-center justify-center relative overflow-hidden">
              {resultImage && (
                <img
                  src={resultImage}
                  alt="Previous"
                  className="absolute inset-0 w-full h-full object-contain opacity-30"
                />
              )}
              {isGenerating && (
                <>
                  <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                  </div>
                  <span className="relative px-5 py-2 bg-black/50 text-white text-sm backdrop-blur-sm tracking-wide">
                    Generating
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Bottom toolbar */}
        <div className="h-12 flex items-center justify-center px-4 border-t border-border shrink-0 gap-2">
          {resultImage && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDownload}
              className="gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <HugeiconsIcon icon={Download01Icon} size={14} />
              Download
            </Button>
          )}
        </div>
      </div>

      {/* ─── Right: Sidebar ─── */}
      <div className="w-full lg:w-[400px] h-[50vh] lg:h-auto flex flex-col border-t lg:border-t-0 lg:border-l border-border bg-card shrink-0">
        {/* Sidebar header */}
        <div className="h-12 flex items-center justify-between px-4 border-b border-border shrink-0">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onUndo}
            disabled={!canUndo || isGenerating || isProcessing}
            title="Undo last change"
          >
            <HugeiconsIcon icon={UndoIcon} size={14} />
          </Button>

          <Select
            value={panelMode}
            onValueChange={(v: string) => setPanelMode(v as 'chat' | 'json')}
          >
            <SelectTrigger className="w-auto gap-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="chat">
                <span className="flex items-center gap-1.5">
                  <HugeiconsIcon icon={BubbleChatIcon} size={14} />
                  Discussion
                </span>
              </SelectItem>
              <SelectItem value="json">
                <span className="flex items-center gap-1.5">
                  <HugeiconsIcon icon={SourceCodeIcon} size={14} />
                  JSON Result
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sidebar content */}
        <div className="flex-1 flex flex-col min-h-0">
          {panelMode === 'chat' ? (
            <>
              <ScrollArea className="flex-1" ref={scrollAreaRef}>
                <div className="flex flex-col gap-3 p-4">
                  {/* Generation status block (like lovart.ai) */}
                  {(isGenerating || resultImage) && (
                    <>
                      <span className="text-[11px] text-muted-foreground">
                        {new Date().toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>

                      {isGenerating && loadingStep === 'generating' && (
                        <>
                          <p className="text-sm leading-relaxed">
                            Generating your image. Please wait...
                          </p>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <HugeiconsIcon icon={ViewIcon} size={12} />
                            <span>{modelName}</span>
                          </div>
                          <p className="text-sm font-semibold">Executing</p>
                          <div className="w-full aspect-[4/3] bg-muted/40 overflow-hidden relative">
                            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                          </div>
                        </>
                      )}

                      {resultImage && !isGenerating && messages.length === 0 && (
                        <>
                          <p className="text-sm leading-relaxed">
                            Image generated successfully! You can now ask me to modify it.
                          </p>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <HugeiconsIcon icon={ViewIcon} size={12} />
                            <span>{modelName}</span>
                          </div>
                        </>
                      )}
                    </>
                  )}

                  {isExtractingMetadata && (
                    <div className="p-3 bg-muted/30 self-start flex items-center gap-2 text-sm text-muted-foreground">
                      <HugeiconsIcon icon={Loading03Icon} size={14} className="animate-spin" />
                      Analyzing image...
                    </div>
                  )}

                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`p-3 max-w-[85%] text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground self-end'
                          : 'bg-muted/50 border border-border self-start'
                      }`}
                    >
                      {msg.content}
                    </div>
                  ))}

                  {(isProcessing || (isGenerating && loadingStep === 'editing')) && (
                    <div className="p-3 bg-muted/50 border border-border self-start flex items-center gap-2 text-sm text-muted-foreground">
                      <HugeiconsIcon icon={Loading03Icon} size={14} className="animate-spin" />
                      {isProcessing
                        ? 'Analyzing request...'
                        : 'Applying edits to image...'}
                    </div>
                  )}

                  {error && (
                    <div className="p-3 bg-destructive/10 text-destructive self-start text-sm border border-destructive/20">
                      {error}
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Progress bar (lovart.ai style) */}
              {isGenerating && (
                <div className="px-4 py-2.5 border-t border-border flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <HugeiconsIcon
                      icon={Loading03Icon}
                      size={12}
                      className="animate-spin text-primary"
                    />
                    <span className="truncate">
                      Generating image using {modelName}...
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums shrink-0 ml-3">
                    {formatTime(elapsed)} / 2 m
                  </span>
                </div>
              )}

              {/* Chat input */}
              <div className="p-3 border-t border-border shrink-0">
                <div className="flex items-center gap-2 border border-border bg-background px-2 py-1 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30 transition-colors">
                  <AttachmentButton />
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Start with an idea, or type to edit..."
                    disabled={isProcessing || isGenerating || !currentState}
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50 py-1.5"
                  />
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={handleSend}
                    disabled={!input.trim() || isProcessing || isGenerating || !currentState}
                  >
                    <HugeiconsIcon icon={SentIcon} size={16} />
                  </Button>
                </div>
                <div className="flex items-center justify-between mt-2 px-0.5">
                  <div className="flex items-center gap-1">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] text-primary bg-primary/10 font-medium">
                      <HugeiconsIcon icon={SparklesIcon} size={10} />
                      Agent
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <ScrollArea className="flex-1 p-4">
              {currentState ? (
                <JsonViewer data={currentState} />
              ) : isExtractingMetadata ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
                  <HugeiconsIcon icon={Loading03Icon} size={18} className="animate-spin" />
                  <span className="text-sm">Extracting metadata...</span>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm text-center py-16">
                  JSON metadata will appear after generation
                </p>
              )}
            </ScrollArea>
          )}
        </div>
      </div>
    </div>
  );
}

function AttachmentButton() {
  return (
    <button
      type="button"
      className="shrink-0 p-1 text-muted-foreground hover:text-foreground transition-colors"
      title="Attach file"
    >
      <HugeiconsIcon icon={AttachmentIcon} size={16} />
    </button>
  );
}

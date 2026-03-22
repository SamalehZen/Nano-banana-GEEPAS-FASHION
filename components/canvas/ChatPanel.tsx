'use client';

import { useState, useRef, useEffect } from 'react';
import { Type } from '@google/genai';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  SentIcon, UndoIcon, Loading03Icon, AttachmentIcon,
  MagicWandIcon, GlobeIcon, SparklesIcon, Cancel01Icon,
  Image01Icon, Shirt01Icon, ArrowExpandIcon,
} from '@hugeicons/core-free-icons';
import { useCanvas, useCanvasActions } from '@/contexts/CanvasContext';
import { useGemini } from '@/hooks/use-gemini';
import { useApiKey } from '@/contexts/ApiKeyContext';
import { IMAGE_METADATA_SCHEMA } from '@/components/DesignChatbot';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  image?: string;
  model?: string;
}

interface ChatPanelProps {
  resultImage: string | null;
  onResultImage: (url: string) => void;
  isGenerating: boolean;
  setIsGenerating: (v: boolean) => void;
  loadingStep: 'generating' | 'editing' | null;
  setLoadingStep: (v: 'generating' | 'editing' | null) => void;
  currentState: any;
  setCurrentState: (v: any) => void;
  history: { image: string; state: any }[];
  setHistory: (v: { image: string; state: any }[]) => void;
}

export function ChatPanel({
  resultImage,
  onResultImage,
  isGenerating,
  setIsGenerating,
  loadingStep,
  setLoadingStep,
  currentState,
  setCurrentState,
  history,
  setHistory,
}: ChatPanelProps) {
  const ai = useGemini();
  const { imageModel } = useApiKey();
  const { state: canvasState } = useCanvas();
  const { clearSelectionRefs } = useCanvasActions();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mode, setMode] = useState<'design' | 'tryon' | 'enhance'>('design');
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [productImages, setProductImages] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isProcessing, isGenerating]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const data = reader.result as string;
        if (!referenceImage) {
          setReferenceImage(data);
        } else {
          setProductImages(prev => [...prev, data]);
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleGenerate = async () => {
    if (!ai || !referenceImage || productImages.length === 0) return;
    setIsGenerating(true);
    setLoadingStep('generating');

    const userMsg = input.trim() || `Generate a product design with the uploaded images`;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);

    try {
      const refBase64 = referenceImage.split(',')[1];
      const refMime = referenceImage.split(';')[0].split(':')[1];

      const productParts: any[] = [];
      productImages.forEach((img, i) => {
        const base64 = img.split(',')[1];
        const mime = img.split(';')[0].split(':')[1];
        productParts.push(
          { text: `Product image ${i + 1}:` },
          { inlineData: { data: base64, mimeType: mime } }
        );
      });

      const prompt = `Analyze the reference design image. Recreate the exact same design style, but seamlessly integrate the provided product image(s). Maintain high visual realism and professional quality.`;

      const response = await ai.models.generateContent({
        model: imageModel,
        contents: {
          parts: [
            { text: 'Reference design:' },
            { inlineData: { data: refBase64, mimeType: refMime } },
            ...productParts,
            { text: prompt }
          ]
        },
        config: { imageConfig: { aspectRatio: '1:1' as any, imageSize: '2K' as any } }
      });

      let generatedBase64 = '';
      let generatedMime = '';
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData?.data && part.inlineData?.mimeType) {
          generatedBase64 = part.inlineData.data;
          generatedMime = part.inlineData.mimeType;
          break;
        }
      }

      if (!generatedBase64) throw new Error('No image generated');

      const imageUrl = `data:${generatedMime};base64,${generatedBase64}`;
      onResultImage(imageUrl);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `I've created your design. You can now select areas on the canvas and ask me to edit specific parts.`,
        image: imageUrl,
        model: imageModel === 'gemini-3.1-flash-image-preview' ? 'Nano Banana 2' : 'Nano Banana Pro',
      }]);

      ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          { inlineData: { data: generatedBase64, mimeType: generatedMime } },
          { text: 'Analyze this image and extract metadata.' }
        ],
        config: { responseMimeType: 'application/json', responseSchema: IMAGE_METADATA_SCHEMA }
      }).then(res => {
        const metadata = JSON.parse(res.text!);
        setCurrentState(metadata);
        setHistory([{ image: imageUrl, state: metadata }]);
      }).catch(() => {
        const fallback = { style: 'Generated image', keyElements: ['Product design'] };
        setCurrentState(fallback);
        setHistory([{ image: imageUrl, state: fallback }]);
      });
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.message}` }]);
    } finally {
      setIsGenerating(false);
      setLoadingStep(null);
    }
  };

  const handleEdit = async () => {
    if (!input.trim() || !resultImage || !ai || isProcessing || isGenerating) return;

    const userMsg = input.trim();
    setInput('');
    clearSelectionRefs();
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsProcessing(true);

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `You are a JSON modifier assistant.
Current JSON State:
${JSON.stringify(currentState, null, 2)}

User Request: "${userMsg}"

Generate a FULLY UPDATED JSON state. Also provide a friendly message and a short 'editPrompt' for image editing AI.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              updatedState: IMAGE_METADATA_SCHEMA,
              editPrompt: { type: Type.STRING },
              message: { type: Type.STRING }
            },
            required: ['updatedState', 'editPrompt', 'message']
          }
        }
      });

      const result = JSON.parse(response.text!);
      setMessages(prev => [...prev, { role: 'assistant', content: result.message }]);

      setIsGenerating(true);
      setLoadingStep('editing');

      const base64 = resultImage.split(',')[1];
      const mimeType = resultImage.split(';')[0].split(':')[1];

      const editResponse = await ai.models.generateContent({
        model: imageModel,
        contents: {
          parts: [
            { inlineData: { data: base64, mimeType } },
            { text: result.editPrompt }
          ]
        },
        config: { imageConfig: { aspectRatio: '1:1' as any, imageSize: '2K' as any } }
      });

      let newImageUrl = '';
      for (const part of editResponse.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData?.data && part.inlineData?.mimeType) {
          newImageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          break;
        }
      }

      if (!newImageUrl) throw new Error('No image generated during edit');

      onResultImage(newImageUrl);
      setCurrentState(result.updatedState);
      setHistory([...history, { image: newImageUrl, state: result.updatedState }]);

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Edit applied successfully.',
        image: newImageUrl,
        model: imageModel === 'gemini-3.1-flash-image-preview' ? 'Nano Banana 2' : 'Nano Banana Pro',
      }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.message}` }]);
    } finally {
      setIsProcessing(false);
      setIsGenerating(false);
      setLoadingStep(null);
    }
  };

  const handleSend = () => {
    if (!input.trim()) return;
    if (resultImage && currentState) {
      handleEdit();
    } else if (referenceImage && productImages.length > 0) {
      handleGenerate();
    } else {
      const msg = input;
      setInput('');
      setMessages(prev => [...prev,
        { role: 'user', content: msg },
        { role: 'assistant', content: 'Please upload a reference image and at least one product image first, then I can generate a design for you.' },
      ]);
    }
  };

  const handleUndo = () => {
    if (history.length > 1) {
      const newHistory = history.slice(0, -1);
      const prev = newHistory[newHistory.length - 1];
      setHistory(newHistory);
      onResultImage(prev.image);
      setCurrentState(prev.state);
    }
  };

  return (
    <div className="w-[360px] border-l border-border bg-popover flex flex-col flex-shrink-0">
      <div className="px-3 py-2 border-b border-border flex items-center justify-between">
        <Tabs value={mode} onValueChange={v => setMode(v as any)} className="w-full">
          <TabsList className="w-full grid grid-cols-3 h-7 p-0.5">
            <TabsTrigger value="design" className="text-[10px] gap-1 h-6">
              <HugeiconsIcon icon={Image01Icon} size={12} /> Design
            </TabsTrigger>
            <TabsTrigger value="tryon" className="text-[10px] gap-1 h-6">
              <HugeiconsIcon icon={Shirt01Icon} size={12} /> Try-On
            </TabsTrigger>
            <TabsTrigger value="enhance" className="text-[10px] gap-1 h-6">
              <HugeiconsIcon icon={ArrowExpandIcon} size={12} /> Enhance
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {history.length > 1 && (
          <Button variant="ghost" size="icon-xs" onClick={handleUndo} className="ml-1 flex-shrink-0">
            <HugeiconsIcon icon={UndoIcon} size={12} />
          </Button>
        )}
      </div>

      {(!referenceImage || productImages.length === 0) && (
        <div className="px-3 py-3 border-b border-border space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <UploadSlot
              label="Reference"
              image={referenceImage}
              onClear={() => setReferenceImage(null)}
              onClick={() => {
                fileInputRef.current?.click();
              }}
            />
            <UploadSlot
              label={`Product${productImages.length > 0 ? ` (${productImages.length})` : ''}`}
              image={productImages[0] || null}
              onClear={() => setProductImages([])}
              onClick={() => {
                if (referenceImage) fileInputRef.current?.click();
              }}
            />
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-1 p-3">
          {messages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-xs">Start with an idea, or type &quot;@&quot; to mention</p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={cn('max-w-[90%] text-xs', msg.role === 'user' ? 'self-end' : 'self-start')}>
                {msg.role === 'assistant' && msg.model && (
                  <div className="flex items-center gap-1 mb-1 text-[10px] text-muted-foreground">
                    <HugeiconsIcon icon={SparklesIcon} size={10} />
                    {msg.model}
                  </div>
                )}
                <div className={cn(
                  'px-3 py-2',
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                )}>
                  {msg.content}
                </div>
                {msg.image && (
                  <div className="mt-1 border border-border overflow-hidden">
                    <img src={msg.image} alt="" className="w-full object-contain max-h-[200px]" />
                  </div>
                )}
              </div>
            ))
          )}

          {(isProcessing || isGenerating) && (
            <div className="self-start flex items-center gap-2 text-xs text-muted-foreground px-3 py-2 bg-muted">
              <HugeiconsIcon icon={Loading03Icon} size={12} className="animate-spin" />
              {isProcessing ? 'Analyzing...' : loadingStep === 'editing' ? 'Editing image...' : 'Generating...'}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border p-2 space-y-2">
        {canvasState.selectionRefs.length > 0 && (
          <div className="flex items-center gap-1 px-1">
            {canvasState.selectionRefs.map(ref => (
              <div key={ref.id} className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-medium">
                <div className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] flex items-center justify-center font-bold">
                  {ref.id}
                </div>
                {ref.label}
                <button onClick={clearSelectionRefs} className="ml-0.5 hover:text-destructive">
                  <HugeiconsIcon icon={Cancel01Icon} size={8} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="relative">
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder='Start with an idea, or type "@" to mention'
            disabled={isProcessing || isGenerating}
            className="min-h-[60px] max-h-[120px] pr-10 text-xs resize-none"
          />
        </div>

        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => fileInputRef.current?.click()}
            >
              <HugeiconsIcon icon={AttachmentIcon} size={14} className="text-muted-foreground" />
            </Button>

            <Button variant="outline" size="xs" className="gap-1 text-[10px]">
              <HugeiconsIcon icon={MagicWandIcon} size={10} className="text-primary" />
              Agent
            </Button>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-xs">
              <HugeiconsIcon icon={GlobeIcon} size={14} className="text-muted-foreground" />
            </Button>
            <Button variant="ghost" size="icon-xs">
              <HugeiconsIcon icon={SparklesIcon} size={14} className="text-primary" />
            </Button>
            <Button
              size="icon-xs"
              onClick={handleSend}
              disabled={!input.trim() || isProcessing || isGenerating}
              className={cn(
                'transition-colors',
                input.trim() ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              )}
            >
              <HugeiconsIcon icon={SentIcon} size={14} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function UploadSlot({
  label,
  image,
  onClear,
  onClick,
}: {
  label: string;
  image: string | null;
  onClear: () => void;
  onClick: () => void;
}) {
  return (
    <div className="space-y-1">
      <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
      {image ? (
        <div className="relative aspect-square overflow-hidden border border-border group">
          <img src={image} alt={label} className="w-full h-full object-cover" />
          <button
            onClick={onClear}
            className="absolute top-1 right-1 w-4 h-4 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={8} />
          </button>
        </div>
      ) : (
        <button
          onClick={onClick}
          className="w-full aspect-square border-2 border-dashed border-border flex items-center justify-center hover:bg-muted/50 transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { Send, Undo, Loader2 } from 'lucide-react';
import { JsonViewer } from './JsonViewer';
import { useApiKey } from '@/contexts/ApiKeyContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

export const IMAGE_METADATA_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    style: { type: Type.STRING, description: "Overall visual style and aesthetic" },
    composition: { type: Type.STRING, description: "Layout, pose, and framing" },
    lighting: { type: Type.STRING, description: "Lighting conditions and shadows" },
    background: { type: Type.STRING, description: "Environment and background details" },
    visibleText: { 
      type: Type.ARRAY, 
      description: "All readable text in the image",
      items: { 
        type: Type.OBJECT, 
        properties: { 
          text: { type: Type.STRING, description: "The actual text" }, 
          location: { type: Type.STRING, description: "Where the text is located" },
          appearance: { type: Type.STRING, description: "Font style, color, size" }
        } 
      } 
    },
    keyElements: { 
      type: Type.ARRAY, 
      description: "Main objects, clothing, or products in the image",
      items: { type: Type.STRING } 
    }
  }
};

interface DesignChatbotProps {
  currentState: any;
  onApplyPatch: (newState: any, editPrompt: string) => void;
  onUndo: () => void;
  canUndo: boolean;
  isGenerating: boolean;
  loadingStep?: string | null;
}

export function DesignChatbot({ currentState, onApplyPatch, onUndo, canUndo, isGenerating, loadingStep }: DesignChatbotProps) {
  const { apiKey } = useApiKey();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{role: 'user'|'assistant', content: string}[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || isProcessing || isGenerating) return;
    
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsProcessing(true);

    try {
      const ai = new GoogleGenAI({ apiKey: apiKey! });
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `You are a JSON modifier assistant. 
Current JSON State:
${JSON.stringify(currentState, null, 2)}

User Request: "${userMsg}"

Generate a FULLY UPDATED JSON state that incorporates the user's request. Keep everything else exactly the same. Only modify the fields that need to change based on the request. Also provide a friendly message explaining what you changed. Finally, provide a short, direct 'editPrompt' that will be sent to an image editing AI to perform this exact visual change (e.g., 'Change the text 75ml to 125L', 'Make the background sunset').`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              updatedState: IMAGE_METADATA_SCHEMA,
              editPrompt: { type: Type.STRING, description: "A short, direct prompt for an image editing AI to perform this exact visual change." },
              message: { type: Type.STRING }
            },
            required: ["updatedState", "editPrompt", "message"]
          }
        }
      });

      const text = response.text;
      if (!text) throw new Error("No response text received from the model.");
      
      const result = JSON.parse(text);
      setMessages(prev => [...prev, { role: 'assistant', content: result.message }]);
      onApplyPatch(result.updatedState, result.editPrompt);

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error processing your request." }]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Separator className="lg:col-span-3" />
      <div className="lg:col-span-2 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">AI Assistant</h3>
          <Button 
            variant="outline"
            size="sm"
            onClick={onUndo} 
            disabled={!canUndo || isGenerating || isProcessing}
            className="gap-2"
          >
            <Undo size={14} /> Undo Last Change
          </Button>
        </div>
        
        <ScrollArea className="flex-1 min-h-[200px] max-h-[300px] bg-muted/30 p-4 border border-border">
          <div className="flex flex-col gap-3">
            {messages.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center my-auto py-16">
                Ask me to change text, colors, lighting, background, or add elements!
              </p>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={`p-3 max-w-[85%] text-sm ${msg.role === 'user' ? 'bg-primary text-primary-foreground self-end' : 'bg-card border border-border self-start'}`}>
                  {msg.content}
                </div>
              ))
            )}
            {(isProcessing || isGenerating) && (
              <div className="p-3 bg-card border border-border self-start flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 size={14} className="animate-spin" /> 
                {isProcessing ? "Analyzing request..." : 
                 loadingStep === 'extracting' ? "Extracting image metadata..." :
                 loadingStep === 'editing' ? "Applying edits to image..." :
                 "Generating new image..."}
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex gap-2">
          <Input 
            type="text" 
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="e.g., Change the text '75ml' to '125L'..."
            disabled={isProcessing || isGenerating}
          />
          <Button 
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || isProcessing || isGenerating}
          >
            <Send size={18} />
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Extracted JSON Metadata</h3>
        <JsonViewer data={currentState} />
      </div>
    </div>
  );
}

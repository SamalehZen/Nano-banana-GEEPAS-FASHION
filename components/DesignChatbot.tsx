'use client';

import { useState } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { Send, Undo, Loader2 } from 'lucide-react';
import { JsonViewer } from './JsonViewer';

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
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY as string });
      
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
    <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6 border-t border-border pt-8">
      <div className="lg:col-span-2 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">AI Assistant</h3>
          <button 
            onClick={onUndo} 
            disabled={!canUndo || isGenerating || isProcessing}
            className="flex items-center gap-2 text-sm px-3 py-1.5 bg-muted text-muted-foreground rounded-md hover:bg-muted/80 disabled:opacity-50 transition-colors"
          >
            <Undo size={14} /> Undo Last Change
          </button>
        </div>
        
        <div className="flex-1 min-h-[200px] max-h-[300px] overflow-y-auto bg-muted/30 rounded-xl p-4 border border-border flex flex-col gap-3">
          {messages.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center my-auto">
              Ask me to change text, colors, lighting, background, or add elements!
            </p>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={`p-3 rounded-lg max-w-[85%] text-sm ${msg.role === 'user' ? 'bg-primary text-primary-foreground self-end' : 'bg-card border border-border self-start'}`}>
                {msg.content}
              </div>
            ))
          )}
          {(isProcessing || isGenerating) && (
            <div className="p-3 rounded-lg bg-card border border-border self-start flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 size={14} className="animate-spin" /> 
              {isProcessing ? "Analyzing request..." : 
               loadingStep === 'extracting' ? "Extracting image metadata..." :
               loadingStep === 'editing' ? "Applying edits to image..." :
               "Generating new image..."}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <input 
            type="text" 
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="e.g., Change the text '75ml' to '125L'..."
            className="flex-1 bg-background border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            disabled={isProcessing || isGenerating}
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isProcessing || isGenerating}
            className="bg-primary text-primary-foreground p-3 rounded-lg disabled:opacity-50 hover:bg-primary/90 transition-colors flex items-center justify-center"
          >
            <Send size={18} />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Extracted JSON Metadata</h3>
        <JsonViewer data={currentState} />
      </div>
    </div>
  );
}

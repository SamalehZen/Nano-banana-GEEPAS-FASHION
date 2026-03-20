import { useState } from 'react';
import { ImageUploader } from './ImageUploader';
import { Loader2, Wand2 } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { DesignChatbot, IMAGE_METADATA_SCHEMA } from './DesignChatbot';

export function VirtualTryOnMode() {
  const [personImage, setPersonImage] = useState<string | null>(null);
  const [clothingImage, setClothingImage] = useState<string | null>(null);
  const [locationImage, setLocationImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStep, setLoadingStep] = useState<'generating' | 'extracting' | 'editing' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<string>("3:4");
  const [imageSize, setImageSize] = useState<string>("1K");
  
  const [currentState, setCurrentState] = useState<any>(null);
  const [history, setHistory] = useState<{image: string, state: any}[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);

  const extractMetadata = async (base64Image: string, mimeType: string) => {
    const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY as string });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        { inlineData: { data: base64Image, mimeType } },
        { text: 'Analyze this image and extract its metadata, style, composition, and all visible text into a detailed JSON object. Be extremely precise about the visible text and its location.' }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: IMAGE_METADATA_SCHEMA
      }
    });
    return JSON.parse(response.text!);
  };

  const handleGenerate = async () => {
    if (!personImage || !clothingImage || !locationImage) return;
    setIsGenerating(true);
    setLoadingStep('generating');
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY as string });

      const personBase64 = personImage.split(',')[1];
      const personMime = personImage.split(';')[0].split(':')[1];
      
      const clothingBase64 = clothingImage.split(',')[1];
      const clothingMime = clothingImage.split(';')[0].split(':')[1];

      const locationBase64 = locationImage.split(',')[1];
      const locationMime = locationImage.split(';')[0].split(':')[1];

      const prompt = `CRITICAL INSTRUCTION: You are an expert photo editor performing a virtual try-on. 
1. BASE IMAGE: Use the Person/Model image as your exact base. 
2. IDENTITY PRESERVATION: The face, facial features, hair, and skin tone MUST remain 100% IDENTICAL to the original person. Do not alter their identity, expression, or facial structure in any way. 100% resemblance is mandatory.
3. CLOTHING TRANSFER: Dress the person in the exact Clothing/Outfit provided in the second image. Ensure natural folds, shadows, and fit.
4. ENVIRONMENT: Place the person in the Location/Environment provided in the third image, matching the lighting and shadows perfectly.
It is absolutely mandatory that the person's face looks exactly like the original photo without any AI modifications to their facial identity.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: {
          parts: [
            { text: "Person/Model:" },
            { inlineData: { data: personBase64, mimeType: personMime } },
            { text: "Clothing/Outfit:" },
            { inlineData: { data: clothingBase64, mimeType: clothingMime } },
            { text: "Location/Environment:" },
            { inlineData: { data: locationBase64, mimeType: locationMime } },
            { text: prompt }
          ]
        },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio as any,
            imageSize: imageSize as any
          }
        }
      });

      let foundImage = false;
      let generatedBase64 = '';
      let generatedMime = '';

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData?.data && part.inlineData?.mimeType) {
          generatedBase64 = part.inlineData.data;
          generatedMime = part.inlineData.mimeType;
          foundImage = true;
          break;
        }
      }

      if (!foundImage) {
        throw new Error("No image generated in the response.");
      }

      setLoadingStep('extracting');
      const metadata = await extractMetadata(generatedBase64, generatedMime);
      
      const finalImageUrl = `data:${generatedMime};base64,${generatedBase64}`;
      setResultImage(finalImageUrl);
      setCurrentState(metadata);
      setHistory([{ image: finalImageUrl, state: metadata }]);
      setHasGenerated(true);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred during generation.");
    } finally {
      setIsGenerating(false);
      setLoadingStep(null);
    }
  };

  const handleEdit = async (newState: any, editPrompt: string) => {
    if (!resultImage) return;
    setIsGenerating(true);
    setLoadingStep('editing');
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY as string });
      const base64 = resultImage.split(',')[1];
      const mimeType = resultImage.split(';')[0].split(':')[1];

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: {
          parts: [
            { inlineData: { data: base64, mimeType } },
            { text: editPrompt }
          ]
        },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio as any,
            imageSize: imageSize as any
          }
        }
      });

      let foundImage = false;
      let newImageUrl = '';
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData?.data && part.inlineData?.mimeType) {
          newImageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          foundImage = true;
          break;
        }
      }

      if (!foundImage) throw new Error("No image generated during edit.");

      setResultImage(newImageUrl);
      setCurrentState(newState);
      setHistory(prev => [...prev, { image: newImageUrl, state: newState }]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred during editing.");
    } finally {
      setIsGenerating(false);
      setLoadingStep(null);
    }
  };

  const undo = () => {
    if (history.length > 1) {
      const newHistory = history.slice(0, -1);
      const previous = newHistory[newHistory.length - 1];
      setHistory(newHistory);
      setResultImage(previous.image);
      setCurrentState(previous.state);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <ImageUploader label="1. Model" image={personImage} setImage={setPersonImage} />
          <ImageUploader label="2. Clothing" image={clothingImage} setImage={setClothingImage} />
          <ImageUploader label="3. Location" image={locationImage} setImage={setLocationImage} />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Aspect Ratio</label>
            <select 
              value={aspectRatio} 
              onChange={(e) => setAspectRatio(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="1:1">1:1 (Square)</option>
              <option value="3:4">3:4 (Portrait)</option>
              <option value="4:3">4:3 (Landscape)</option>
              <option value="16:9">16:9 (Widescreen)</option>
              <option value="9:16">9:16 (Vertical)</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Quality</label>
            <select 
              value={imageSize} 
              onChange={(e) => setImageSize(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="1K">1K (Standard)</option>
              <option value="2K">2K (High)</option>
              <option value="4K">4K (Ultra)</option>
            </select>
          </div>
        </div>
        
        <button
          onClick={() => handleGenerate()}
          disabled={!personImage || !clothingImage || !locationImage || isGenerating}
          className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
        >
          {isGenerating ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              {loadingStep === 'generating' ? 'Generating Image...' : 
               loadingStep === 'extracting' ? 'Extracting Metadata...' : 
               loadingStep === 'editing' ? 'Applying Edits...' : 'Processing...'}
            </>
          ) : (
            <>
              <Wand2 size={20} />
              Generate Try-On
            </>
          )}
        </button>

        {error && (
          <div className="p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-xl text-sm">
            {error}
          </div>
        )}
      </div>

      <div className="bg-muted/30 rounded-2xl border border-border flex flex-col items-center justify-center overflow-hidden min-h-[400px] relative">
        {resultImage ? (
          <img src={resultImage} alt="Virtual Try-On Result" className="w-full h-full object-contain" />
        ) : (
          <div className="text-center text-muted-foreground p-8">
            <Wand2 size={48} className="mx-auto mb-4 opacity-20" />
            <p>Your virtual try-on result will appear here</p>
          </div>
        )}
        
        {resultImage && (
          <a
            href={resultImage}
            download="virtual-try-on.png"
            className="absolute bottom-4 right-4 py-2 px-4 bg-secondary/90 backdrop-blur-sm text-secondary-foreground rounded-lg text-center font-medium hover:bg-secondary transition-colors shadow-lg"
          >
            Download Image
          </a>
        )}
      </div>
    </div>

    {hasGenerated && currentState && (
      <DesignChatbot 
        currentState={currentState}
        onApplyPatch={handleEdit}
        onUndo={undo}
        canUndo={history.length > 1}
        isGenerating={isGenerating}
        loadingStep={loadingStep}
      />
    )}
  </div>
  );
}

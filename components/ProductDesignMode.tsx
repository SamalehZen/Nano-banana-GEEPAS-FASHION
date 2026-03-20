import { useState } from 'react';
import { ImageUploader } from './ImageUploader';
import { Loader2, Wand2 } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

export function ProductDesignMode() {
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [productImage, setProductImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<string>("1:1");
  const [imageSize, setImageSize] = useState<string>("1K");

  const handleGenerate = async () => {
    if (!referenceImage || !productImage) return;
    setIsGenerating(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY });

      const refBase64 = referenceImage.split(',')[1];
      const refMime = referenceImage.split(';')[0].split(':')[1];

      const prodBase64 = productImage.split(',')[1];
      const prodMime = productImage.split(';')[0].split(':')[1];

      const prompt = `Analyze the reference design image (layout, colors, lighting, composition, textures, branding style). Recreate the exact same design style, but seamlessly integrate the provided product image into that design. Maintain high visual realism and professional quality. The final result must look identical in style to the reference image, but with the user's product perfectly embedded as if it were originally part of the design.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: {
          parts: [
            { text: "Reference design style:" },
            { inlineData: { data: refBase64, mimeType: refMime } },
            { text: "Product image to integrate:" },
            { inlineData: { data: prodBase64, mimeType: prodMime } },
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
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          setResultImage(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
          foundImage = true;
          break;
        }
      }

      if (!foundImage) {
        throw new Error("No image generated in the response.");
      }

    } catch (err: any) {
      console.error(err);
      if (err.message?.includes("Requested entity was not found")) {
        setError("API Key error. Please re-select your API key.");
        if (typeof window !== 'undefined' && window.aistudio) {
           window.aistudio.openSelectKey();
        }
      } else {
        setError(err.message || "An error occurred during generation.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <ImageUploader label="1. Reference Design" image={referenceImage} setImage={setReferenceImage} />
          <ImageUploader label="2. Product Image" image={productImage} setImage={setProductImage} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground">Aspect Ratio</label>
            <select
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value)}
              className="w-full p-2 rounded-lg border border-border bg-background text-foreground"
            >
              <option value="1:1">1:1 (Square)</option>
              <option value="16:9">16:9 (Landscape)</option>
              <option value="9:16">9:16 (Portrait)</option>
              <option value="4:3">4:3</option>
              <option value="3:4">3:4</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground">Resolution</label>
            <select
              value={imageSize}
              onChange={(e) => setImageSize(e.target.value)}
              className="w-full p-2 rounded-lg border border-border bg-background text-foreground"
            >
              <option value="1K">1K (Standard)</option>
              <option value="2K">2K (High)</option>
              <option value="4K">4K (Ultra High)</option>
            </select>
          </div>
        </div>
        
        <button
          onClick={handleGenerate}
          disabled={!referenceImage || !productImage || isGenerating}
          className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
        >
          {isGenerating ? <Loader2 className="animate-spin" /> : <Wand2 />}
          {isGenerating ? 'Generating...' : 'Generate Design'}
        </button>

        {error && (
          <div className="p-4 bg-destructive/10 text-destructive rounded-lg border border-destructive/20 text-sm">
            {error}
          </div>
        )}
      </div>

      <div className="flex flex-col">
        <label className="text-sm font-medium text-foreground mb-2">Result</label>
        <div className="flex-1 min-h-[400px] border border-border rounded-xl bg-muted/30 flex items-center justify-center overflow-hidden relative">
          {resultImage ? (
            <img src={resultImage} alt="Generated Design" className="w-full h-full object-contain" />
          ) : (
            <div className="text-muted-foreground text-center p-8">
              <Wand2 className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>Your generated design will appear here</p>
            </div>
          )}
        </div>
        {resultImage && (
          <a
            href={resultImage}
            download="generated-design.png"
            className="mt-4 py-2 px-4 bg-secondary text-secondary-foreground rounded-lg text-center font-medium hover:bg-secondary/80 transition-colors"
          >
            Download Image
          </a>
        )}
      </div>
    </div>
  );
}

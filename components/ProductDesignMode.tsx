import { useState } from 'react';
import { ImageUploader } from './ImageUploader';
import { MultiImageUploader } from './MultiImageUploader';
import { HugeiconsIcon } from '@hugeicons/react';
import { Loading03Icon, MagicWand01Icon, Download01Icon } from '@hugeicons/core-free-icons';
import { downloadDataUri } from '@/lib/download';
import { DesignChatbot, IMAGE_METADATA_SCHEMA } from './DesignChatbot';
import { useGemini } from '@/hooks/use-gemini';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

export function ProductDesignMode() {
  const ai = useGemini();
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [productImages, setProductImages] = useState<string[]>([]);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExtractingMetadata, setIsExtractingMetadata] = useState(false);
  const [loadingStep, setLoadingStep] = useState<'generating' | 'editing' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<string>("1:1");
  const [imageSize, setImageSize] = useState<string>("1K");
  
  const [currentState, setCurrentState] = useState<any>(null);
  const [history, setHistory] = useState<{image: string, state: any}[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);

  const handleGenerate = async () => {
    if (!referenceImage || productImages.length === 0 || !ai) return;
    setIsGenerating(true);
    setLoadingStep('generating');
    setError(null);

    try {
      const refBase64 = referenceImage.split(',')[1];
      const refMime = referenceImage.split(';')[0].split(':')[1];

      const productParts: { text: string }[] | { inlineData: { data: string; mimeType: string } }[] = [];
      productImages.forEach((img, i) => {
        const base64 = img.split(',')[1];
        const mime = img.split(';')[0].split(':')[1];
        productParts.push(
          { text: `Product image ${i + 1} of ${productImages.length}:` } as any,
          { inlineData: { data: base64, mimeType: mime } } as any
        );
      });

      const isSingle = productImages.length === 1;
      const prompt = isSingle
        ? `Analyze the reference design image (layout, colors, lighting, composition, textures, branding style). Recreate the exact same design style, but seamlessly integrate the provided product image into that design. Maintain high visual realism and professional quality. The final result must look identical in style to the reference image, but with the user's product perfectly embedded as if it were originally part of the design.`
        : `Analyze the reference design image (layout, colors, lighting, composition, textures, branding style). The user has provided ${productImages.length} product images. Intelligently map each product image to a corresponding product placement/slot in the reference design. Replace or integrate each product into its matching position while preserving the exact same layout, colors, lighting, composition, textures, and branding style. Each product must be seamlessly embedded in its correct location as if it were originally part of the design. Maintain high visual realism and professional quality throughout.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: {
          parts: [
            { text: "Reference design style:" },
            { inlineData: { data: refBase64, mimeType: refMime } },
            ...productParts,
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

      const finalImageUrl = `data:${generatedMime};base64,${generatedBase64}`;
      setResultImage(finalImageUrl);
      setHasGenerated(true);
      setIsGenerating(false);
      setLoadingStep(null);

      setIsExtractingMetadata(true);
      ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          { inlineData: { data: generatedBase64, mimeType: generatedMime } },
          { text: 'Analyze this image and extract its metadata, style, composition, and all visible text into a detailed JSON object. Be extremely precise about the visible text and its location.' }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: IMAGE_METADATA_SCHEMA
        }
      }).then(res => {
        const metadata = JSON.parse(res.text!);
        setCurrentState(metadata);
        setHistory([{ image: finalImageUrl, state: metadata }]);
      }).catch(err => {
        console.error('Metadata extraction failed:', err);
        const fallback = { style: 'Generated image', keyElements: ['Product design'] };
        setCurrentState(fallback);
        setHistory([{ image: finalImageUrl, state: fallback }]);
      }).finally(() => {
        setIsExtractingMetadata(false);
      });

    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred during generation.");
      setIsGenerating(false);
      setLoadingStep(null);
    }
  };

  const handleEdit = async (newState: any, editPrompt: string) => {
    if (!resultImage || !ai) return;
    setIsGenerating(true);
    setLoadingStep('editing');
    setError(null);

    try {
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
          <div className="grid grid-cols-2 gap-4">
            <ImageUploader label="1. Reference Design" image={referenceImage} setImage={setReferenceImage} />
            <MultiImageUploader label="2. Product Images" images={productImages} setImages={setProductImages} />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Aspect Ratio</Label>
              <Select value={aspectRatio} onValueChange={setAspectRatio}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1:1">1:1 (Square)</SelectItem>
                  <SelectItem value="3:4">3:4 (Portrait)</SelectItem>
                  <SelectItem value="4:3">4:3 (Landscape)</SelectItem>
                  <SelectItem value="16:9">16:9 (Widescreen)</SelectItem>
                  <SelectItem value="9:16">9:16 (Vertical)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Quality</Label>
              <Select value={imageSize} onValueChange={setImageSize}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1K">1K — Standard</SelectItem>
                  <SelectItem value="2K">2K — Slower generation</SelectItem>
                  <SelectItem value="4K">4K — Much slower generation</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Button
            onClick={() => handleGenerate()}
            disabled={!referenceImage || productImages.length === 0 || isGenerating}
            className="w-full h-auto py-3 text-base font-semibold gap-2"
            size="lg"
          >
            {isGenerating ? (
              <>
                <HugeiconsIcon icon={Loading03Icon} size={20} className="animate-spin" />
                {loadingStep === 'generating' ? 'Generating Image...' : 
                 loadingStep === 'editing' ? 'Applying Edits...' : 'Processing...'}
              </>
            ) : (
              <>
                <HugeiconsIcon icon={MagicWand01Icon} size={20} />
                Generate Design
              </>
            )}
          </Button>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <Card className="flex flex-col items-center justify-center overflow-hidden min-h-[400px] relative bg-muted/30">
          {resultImage ? (
            <img src={resultImage} alt="Generated Design" className="w-full h-full object-contain" />
          ) : (
            <div className="text-center text-muted-foreground p-8">
              <HugeiconsIcon icon={MagicWand01Icon} size={48} className="mx-auto mb-4 opacity-20" />
              <p>Your generated design will appear here</p>
            </div>
          )}
          
          {resultImage && (
            <Button
              variant="secondary"
              className="absolute bottom-4 right-4 shadow-lg backdrop-blur-sm gap-2"
              onClick={() => downloadDataUri(resultImage, 'generated-design.png')}
            >
              <HugeiconsIcon icon={Download01Icon} size={16} />
              Download Image
            </Button>
          )}
        </Card>
      </div>

      {hasGenerated && (
        isExtractingMetadata ? (
          <div className="flex items-center justify-center gap-3 py-8 text-muted-foreground">
            <HugeiconsIcon icon={Loading03Icon} size={18} className="animate-spin" />
            <span className="text-sm">Analyzing image for AI assistant...</span>
          </div>
        ) : currentState ? (
          <DesignChatbot 
            currentState={currentState}
            onApplyPatch={handleEdit}
            onUndo={undo}
            canUndo={history.length > 1}
            isGenerating={isGenerating}
            loadingStep={loadingStep}
          />
        ) : null
      )}
    </div>
  );
}

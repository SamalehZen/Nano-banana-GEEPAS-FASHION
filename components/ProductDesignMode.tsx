import { useState } from 'react';
import { ImageUploader } from './ImageUploader';
import { MultiImageUploader } from './MultiImageUploader';
import { HugeiconsIcon } from '@hugeicons/react';
import { Loading03Icon, MagicWand01Icon } from '@hugeicons/core-free-icons';
import { downloadDataUri } from '@/lib/download';
import { DesignChatbot, IMAGE_METADATA_SCHEMA } from './DesignChatbot';
import { useGemini } from '@/hooks/use-gemini';
import { useApiKey } from '@/contexts/ApiKeyContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { CanvasEditor } from './CanvasEditor';

export function ProductDesignMode() {
  const ai = useGemini();
  const { imageModel } = useApiKey();

  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [productImages, setProductImages] = useState<string[]>([]);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExtractingMetadata, setIsExtractingMetadata] = useState(false);
  const [loadingStep, setLoadingStep] = useState<'generating' | 'editing' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<string>("1:1");
  const [imageSize, setImageSize] = useState<string>("2K");

  const [currentState, setCurrentState] = useState<any>(null);
  const [history, setHistory] = useState<{ image: string; state: any }[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [chatPrefill, setChatPrefill] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!referenceImage || productImages.length === 0 || !ai) return;

    setIsGenerating(true);
    setLoadingStep('generating');
    setError(null);

    try {
      const refBase64 = referenceImage.split(',')[1];
      const refMime = referenceImage.split(';')[0].split(':')[1];

      const productParts: any[] = [];
      productImages.forEach((img, i) => {
        const base64 = img.split(',')[1];
        const mime = img.split(';')[0].split(':')[1];
        productParts.push(
          { text: `Product image ${i + 1} of ${productImages.length}:` },
          { inlineData: { data: base64, mimeType: mime } }
        );
      });

      const prompt =
        productImages.length === 1
          ? `Analyze the reference design image and recreate the same design with the product integrated.`
          : `Analyze the reference design and map ${productImages.length} products into the layout.`;

      const response = await ai.models.generateContent({
        model: imageModel,
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

      let generatedBase64 = '';
      let generatedMime = '';

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData?.data) {
          generatedBase64 = part.inlineData.data;
          generatedMime = part.inlineData.mimeType;
          break;
        }
      }

      if (!generatedBase64) throw new Error("No image generated.");

      const finalImageUrl = `data:${generatedMime};base64,${generatedBase64}`;
      setResultImage(finalImageUrl);
      setHasGenerated(true);

      setIsGenerating(false);
      setLoadingStep(null);

      // Metadata extraction
      setIsExtractingMetadata(true);
      ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          { inlineData: { data: generatedBase64, mimeType: generatedMime } },
          { text: 'Extract metadata as JSON.' }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: IMAGE_METADATA_SCHEMA
        }
      }).then(res => {
        const metadata = JSON.parse(res.text!);
        setCurrentState(metadata);
        setHistory([{ image: finalImageUrl, state: metadata }]);
      }).catch(() => {
        const fallback = { style: 'Generated', keyElements: [] };
        setCurrentState(fallback);
        setHistory([{ image: finalImageUrl, state: fallback }]);
      }).finally(() => {
        setIsExtractingMetadata(false);
      });

    } catch (err: any) {
      setError(err.message);
      setIsGenerating(false);
      setLoadingStep(null);
    }
  };

  const handleEdit = async (newState: any, editPrompt: string) => {
    if (!resultImage || !ai) return;

    setIsGenerating(true);
    setLoadingStep('editing');

    try {
      const base64 = resultImage.split(',')[1];
      const mimeType = resultImage.split(';')[0].split(':')[1];

      const response = await ai.models.generateContent({
        model: imageModel,
        contents: {
          parts: [
            { inlineData: { data: base64, mimeType } },
            { text: editPrompt }
          ]
        }
      });

      let newImageUrl = '';

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData?.data) {
          newImageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          break;
        }
      }

      if (!newImageUrl) throw new Error("Edit failed");

      setResultImage(newImageUrl);
      setCurrentState(newState);
      setHistory(prev => [...prev, { image: newImageUrl, state: newState }]);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
      setLoadingStep(null);
    }
  };

  const undo = () => {
    if (history.length > 1) {
      const prev = history[history.length - 2];
      setHistory(history.slice(0, -1));
      setResultImage(prev.image);
      setCurrentState(prev.state);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* LEFT */}
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <ImageUploader label="1. Reference Design" image={referenceImage} setImage={setReferenceImage} />
            <MultiImageUploader label="2. Product Images" images={productImages} setImages={setProductImages} />
          </div>

          <Button onClick={handleGenerate} disabled={isGenerating} className="w-full">
            {isGenerating ? "Generating..." : "Generate Design"}
          </Button>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* RIGHT (FIXED) */}
        {resultImage ? (
          <CanvasEditor
            image={resultImage}
            alt="Generated Design"
            downloadLabel="Download Image"
            onDownload={() => downloadDataUri(resultImage, 'generated-design.png')}
            onSelectionPrompt={(prompt) => setChatPrefill(prompt)}
          />
        ) : (
          <Card className="flex items-center justify-center min-h-[400px]">
            <p className="text-muted-foreground">Your generated design will appear here</p>
          </Card>
        )}

      </div>

      {/* CHATBOT */}
      {hasGenerated && currentState && (
        <DesignChatbot
          currentState={currentState}
          onApplyPatch={handleEdit}
          onUndo={undo}
          canUndo={history.length > 1}
          isGenerating={isGenerating}
          loadingStep={loadingStep}
          prefillRequest={chatPrefill}
        />
      )}
    </div>
  );
}

import { useState } from 'react';
import { ImageUploader } from './ImageUploader';
import { HugeiconsIcon } from '@hugeicons/react';
import { Loading03Icon, ArrowExpand01Icon, Download01Icon } from '@hugeicons/core-free-icons';
import { downloadDataUri } from '@/lib/download';
import { useGemini } from '@/hooks/use-gemini';
import { useApiKey } from '@/contexts/ApiKeyContext';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';

export function EnhanceMode() {
  const ai = useGemini();
  const { imageModel } = useApiKey();
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEnhance = async () => {
    if (!sourceImage || !ai) return;
    setIsEnhancing(true);
    setError(null);

    try {
      const base64 = sourceImage.split(',')[1];
      const mime = sourceImage.split(';')[0].split(':')[1];

      const response = await ai.models.generateContent({
        model: imageModel,
        contents: {
          parts: [
            { inlineData: { data: base64, mimeType: mime } },
            { text: 'Output this exact image at the highest possible resolution. Do NOT modify, add, remove, recolor, reshape, or alter anything. The output must be pixel-for-pixel identical in content, colors, composition, lighting, text, and every visual detail — only the resolution changes.' }
          ]
        },
        config: {
          imageConfig: {
            imageSize: '4K' as any
          }
        }
      });

      let foundImage = false;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData?.data && part.inlineData?.mimeType) {
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
      setError(err.message || "An error occurred during enhancement.");
    } finally {
      setIsEnhancing(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <ImageUploader label="Upload Image" image={sourceImage} setImage={(img) => { setSourceImage(img); setResultImage(null); }} />

          <Button
            onClick={handleEnhance}
            disabled={!sourceImage || isEnhancing}
            className="w-full h-auto py-3 text-base font-semibold gap-2"
            size="lg"
          >
            {isEnhancing ? (
              <>
                <HugeiconsIcon icon={Loading03Icon} size={20} className="animate-spin" />
                Enhancing to 4K...
              </>
            ) : (
              <>
                <HugeiconsIcon icon={ArrowExpand01Icon} size={20} />
                Enhance to 4K
              </>
            )}
          </Button>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="text-xs text-muted-foreground space-y-1">
            <p>Outputs the same image at 4K resolution without altering content, colors, or composition.</p>
            <p>Works with any image — photos, designs, AI-generated results.</p>
          </div>
        </div>

        <Card className="flex flex-col items-center justify-center overflow-hidden min-h-[400px] relative bg-muted/30">
          {resultImage ? (
            <img src={resultImage} alt="Enhanced Result" className="w-full h-full object-contain" />
          ) : (
            <div className="text-center text-muted-foreground p-8">
              <HugeiconsIcon icon={ArrowExpand01Icon} size={48} className="mx-auto mb-4 opacity-20" />
              <p>Your enhanced image will appear here</p>
            </div>
          )}

          {resultImage && (
            <Button
              variant="secondary"
              className="absolute bottom-4 right-4 shadow-lg backdrop-blur-sm gap-2"
              onClick={() => downloadDataUri(resultImage, 'enhanced-4k.png')}
            >
              <HugeiconsIcon icon={Download01Icon} size={16} />
              Download 4K
            </Button>
          )}
        </Card>
      </div>
    </div>
  );
}

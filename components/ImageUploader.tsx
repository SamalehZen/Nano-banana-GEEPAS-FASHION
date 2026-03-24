import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { CloudUploadIcon, Cancel01Icon } from '@hugeicons/core-free-icons';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ImageUploaderProps {
  label: string;
  image: string | null;
  setImage: (image: string | null) => void;
}

export function ImageUploader({ label, image, setImage }: ImageUploaderProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      {image ? (
        <div className="relative w-full aspect-square overflow-hidden border border-border group">
          <img src={image} alt={label} className="w-full h-full object-cover" />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setImage(null)}
            className="absolute top-2 right-2 h-7 w-7 bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={14} />
          </Button>
        </div>
      ) : (
        <Card className="border-2 border-dashed hover:bg-muted/50 transition-colors cursor-pointer p-0">
          <label className="flex flex-col items-center justify-center w-full aspect-square cursor-pointer">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <HugeiconsIcon icon={CloudUploadIcon} size={32} className="mb-3 text-muted-foreground" />
              <p className="mb-2 text-sm text-muted-foreground text-center px-2">
                <span className="font-semibold">Click to upload</span>
              </p>
            </div>
            <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
          </label>
        </Card>
      )}
    </div>
  );
}

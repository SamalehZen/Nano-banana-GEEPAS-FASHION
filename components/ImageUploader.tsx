import React from 'react';
import { UploadCloud, X } from 'lucide-react';

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
      <label className="text-sm font-medium text-foreground">{label}</label>
      {image ? (
        <div className="relative w-full aspect-square rounded-lg overflow-hidden border border-border group">
          <img src={image} alt={label} className="w-full h-full object-cover" />
          <button
            onClick={() => setImage(null)}
            className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-full aspect-square border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <UploadCloud className="w-8 h-8 mb-3 text-muted-foreground" />
            <p className="mb-2 text-sm text-muted-foreground text-center px-2">
              <span className="font-semibold">Click to upload</span>
            </p>
          </div>
          <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
        </label>
      )}
    </div>
  );
}

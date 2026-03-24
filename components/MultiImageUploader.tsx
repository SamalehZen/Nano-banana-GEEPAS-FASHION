'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HugeiconsIcon } from '@hugeicons/react';
import { CloudUploadIcon, Cancel01Icon, Add01Icon } from '@hugeicons/core-free-icons';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface MultiImageUploaderProps {
  label: string;
  images: string[];
  setImages: (images: string[]) => void;
  maxImages?: number;
}

const itemVariants = {
  initial: { opacity: 0, scale: 0.6 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 400, damping: 22 }
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    transition: { duration: 0.2, ease: 'easeOut' as const }
  }
};

const emptyVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25 } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } }
};

export function MultiImageUploader({ label, images, setImages, maxImages = 10 }: MultiImageUploaderProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const addInputRef = React.useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const remaining = maxImages - images.length;
    const toProcess = Array.from(files).slice(0, remaining);

    Promise.all(
      toProcess.map(file => new Promise<string>(resolve => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      }))
    ).then(results => {
      setImages([...images, ...results]);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const canAdd = images.length < maxImages;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <AnimatePresence mode="wait">
          {images.length > 0 && (
            <motion.span
              key={images.length}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              className="text-xs text-muted-foreground tabular-nums"
            >
              {images.length} image{images.length > 1 ? 's' : ''}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence mode="wait">
        {images.length === 0 ? (
          <motion.div key="empty" variants={emptyVariants} initial="initial" animate="animate" exit="exit">
            <Card className="border-2 border-dashed hover:bg-muted/50 transition-colors cursor-pointer p-0">
              <label className="flex flex-col items-center justify-center w-full aspect-square cursor-pointer">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <HugeiconsIcon icon={CloudUploadIcon} size={32} className="mb-3 text-muted-foreground" />
                  <p className="mb-1 text-sm text-muted-foreground text-center px-2">
                    <span className="font-semibold">Click to upload</span>
                  </p>
                  <p className="text-xs text-muted-foreground/60">Multiple images supported</p>
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  className="hidden"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                />
              </label>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-3 gap-1.5"
          >
            <AnimatePresence initial={false}>
              {images.map((img, i) => (
                <motion.div
                  key={img.slice(-20) + i}
                  layout
                  variants={itemVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="relative aspect-square overflow-hidden border border-border group"
                >
                  <img src={img} alt={`Product ${i + 1}`} className="w-full h-full object-cover" />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 h-5 w-5 bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} size={10} />
                  </Button>
                  <span className="absolute bottom-0.5 left-1 text-[10px] font-medium text-white bg-black/50 px-1 rounded-sm">
                    {i + 1}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>

            {canAdd && (
              <motion.label
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring' as const, stiffness: 300, damping: 25 }}
                className="flex items-center justify-center aspect-square border-2 border-dashed border-border cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <HugeiconsIcon icon={Add01Icon} size={20} className="text-muted-foreground" />
                <input
                  ref={addInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                />
              </motion.label>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

'use client';

import { createContext, useContext, useState, useEffect } from 'react';

export const IMAGE_MODELS = {
  'gemini-3.1-flash-image-preview': 'Nano Banana 2 (Flash)',
  'gemini-3-pro-image-preview': 'Nano Banana Pro',
} as const;

export type ImageModelId = keyof typeof IMAGE_MODELS;

export const DEFAULT_IMAGE_MODEL: ImageModelId = 'gemini-3.1-flash-image-preview';

interface ApiKeyContextType {
  apiKey: string | null;
  setApiKey: (key: string) => void;
  clearApiKey: () => void;
  imageModel: ImageModelId;
  setImageModel: (model: ImageModelId) => void;
}

const ApiKeyContext = createContext<ApiKeyContextType | null>(null);

export function ApiKeyProvider({ children }: { children: React.ReactNode }) {
  const [apiKey, setApiKeyState] = useState<string | null>(null);
  const [imageModel, setImageModelState] = useState<ImageModelId>(DEFAULT_IMAGE_MODEL);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('gemini_api_key');
    const envKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    setApiKeyState(stored || envKey || null);

    const storedModel = localStorage.getItem('gemini_image_model') as ImageModelId | null;
    if (storedModel && storedModel in IMAGE_MODELS) {
      setImageModelState(storedModel);
    }

    setIsLoaded(true);
  }, []);

  const setApiKey = (key: string) => {
    localStorage.setItem('gemini_api_key', key);
    setApiKeyState(key);
  };

  const clearApiKey = () => {
    localStorage.removeItem('gemini_api_key');
    setApiKeyState(null);
  };

  const setImageModel = (model: ImageModelId) => {
    localStorage.setItem('gemini_image_model', model);
    setImageModelState(model);
  };

  if (!isLoaded) return null;

  return (
    <ApiKeyContext.Provider value={{ apiKey, setApiKey, clearApiKey, imageModel, setImageModel }}>
      {children}
    </ApiKeyContext.Provider>
  );
}

export function useApiKey() {
  const ctx = useContext(ApiKeyContext);
  if (!ctx) throw new Error('useApiKey must be used within ApiKeyProvider');
  return ctx;
}

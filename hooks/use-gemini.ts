'use client';

import { useMemo } from 'react';
import { GoogleGenAI } from '@google/genai';
import { useApiKey } from '@/contexts/ApiKeyContext';

export function useGemini() {
  const { apiKey } = useApiKey();

  const ai = useMemo(() => {
    if (!apiKey) return null;
    return new GoogleGenAI({ apiKey });
  }, [apiKey]);

  return ai;
}

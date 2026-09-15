"use client";

import { useState, useEffect, useCallback } from "react";

export interface GeminiModelInfo {
  id: string;
  label: string;
  shortName: string;
  badge: string;
  description: string;
}

export const GEMINI_MODELS: GeminiModelInfo[] = [
  {
    id: "gemini-3.8-flash",
    label: "Gemini 3.8 Flash (Default)",
    shortName: "GEMINI 3.8 FLASH",
    badge: "RECOMMENDED",
    description: "Multimodal turbo cerdas dengan latensi seimbang dan penalaran gizi tinggi.",
  },
  {
    id: "gemini-3.7-flash",
    label: "Gemini 3.7 Flash",
    shortName: "GEMINI 3.7 FLASH",
    badge: "FAST",
    description: "Model ultra-cepat responsif untuk inferensi cepat porsi dan gramatur makanan.",
  },
  {
    id: "gemini-3.6-flash",
    label: "Gemini 3.6 Flash",
    shortName: "GEMINI 3.6 FLASH",
    badge: "LEGACY",
    description: "Model stabil teruji untuk lingkungan jaringan dengan bandwidth rendah.",
  },
  {
    id: "gemini-3.1-pro-preview",
    label: "Gemini 3.1 Pro (Preview)",
    shortName: "GEMINI 3.1 PRO",
    badge: "PREVIEW",
    description: "Model penalaran tingkat tinggi untuk analisis makronutrisi kompleks.",
  },
];

export const DEFAULT_MODEL_ID = "gemini-3.8-flash";

export function getGeminiModelById(id: string): GeminiModelInfo {
  const found = GEMINI_MODELS.find((m) => m.id === id);
  return found || GEMINI_MODELS[0];
}

/**
 * Global reactive hook that binds the selected Gemini model across all HUD screens:
 * Profile, Activities, Tracking (Scanner), Program, and Meal Plan.
 */
export function useSelectedAiModel() {
  const [modelId, setModelId] = useState<string>(DEFAULT_MODEL_ID);

  // Sync initial value from localStorage or cookie
  useEffect(() => {
    if (typeof window === "undefined") return;

    const readActiveModel = () => {
      const saved = localStorage.getItem("chai_ai_model");
      if (saved && GEMINI_MODELS.some((m) => m.id === saved)) {
        setModelId(saved);
      } else {
        const cookieMatch = document.cookie.match(/(?:^|;\s*)chai_ai_model=([^;]+)/);
        if (cookieMatch && cookieMatch[1]) {
          const cookieVal = decodeURIComponent(cookieMatch[1]);
          if (GEMINI_MODELS.some((m) => m.id === cookieVal)) {
            setModelId(cookieVal);
          }
        }
      }
    };

    readActiveModel();

    // Listen to local model change events across tabs and components
    const handleModelChange = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        setModelId(customEvent.detail);
      } else {
        readActiveModel();
      }
    };

    window.addEventListener("chai_ai_model_changed", handleModelChange);
    window.addEventListener("storage", readActiveModel);

    return () => {
      window.removeEventListener("chai_ai_model_changed", handleModelChange);
      window.removeEventListener("storage", readActiveModel);
    };
  }, []);

  const changeModel = useCallback((newModelId: string) => {
    if (!GEMINI_MODELS.some((m) => m.id === newModelId)) return;

    setModelId(newModelId);
    if (typeof window !== "undefined") {
      localStorage.setItem("chai_ai_model", newModelId);
      document.cookie = `chai_ai_model=${encodeURIComponent(newModelId)}; path=/; max-age=31536000; SameSite=Lax`;
      window.dispatchEvent(new CustomEvent("chai_ai_model_changed", { detail: newModelId }));
    }
  }, []);

  const activeModel = getGeminiModelById(modelId);

  return {
    modelId,
    activeModel,
    changeModel,
    availableModels: GEMINI_MODELS,
  };
}

"use client";

import { useState, useEffect, useCallback } from "react";

export type AiProvider = "google" | "openai" | "deepseek";

export interface GeminiModelInfo {
  id: string;
  label: string;
  shortName: string;
  badge: string;
  description: string;
  provider: AiProvider;
  envKeyName: string;
}

export const GEMINI_MODELS: GeminiModelInfo[] = [
  // Google Gemini Series
  {
    id: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash (Google Default)",
    shortName: "GEMINI 2.5 FLASH",
    badge: "RECOMMENDED",
    description: "Model multimodal turbo resmi Google dengan latensi super rendah dan ketersediaan kapasitas 99.9%.",
    provider: "google",
    envKeyName: "GEMINI_API_KEY",
  },
  {
    id: "gemini-2.5-pro",
    label: "Gemini 2.5 Pro (Google Reasoning)",
    shortName: "GEMINI 2.5 PRO",
    badge: "PRO REASON",
    description: "Model penalaran tingkat tinggi Google untuk audit makronutrisi dan metabolisme kompleks.",
    provider: "google",
    envKeyName: "GEMINI_API_KEY",
  },
  {
    id: "gemini-2.0-flash",
    label: "Gemini 2.0 Flash (Google Ultra-Fast)",
    shortName: "GEMINI 2.0 FLASH",
    badge: "FAST",
    description: "Model ultra-cepat responsif untuk inferensi cepat porsi dan gramatur makanan.",
    provider: "google",
    envKeyName: "GEMINI_API_KEY",
  },

  // OpenAI Series
  {
    id: "gpt-5.6-luna",
    label: "GPT-5.6 Luna (OpenAI)",
    shortName: "GPT-5.6 LUNA",
    badge: "OPENAI",
    description: "Model vision & multimodal mutakhir OpenAI untuk pemindaian presisi tinggi hidangan makanan.",
    provider: "openai",
    envKeyName: "OPENAI_API_KEY",
  },
  {
    id: "gpt-5-thinking-mini",
    label: "GPT-5 Thinking Mini (OpenAI)",
    shortName: "GPT-5 THINKING",
    badge: "REASONING",
    description: "Model penalaran bertahap (deep reasoning) untuk analisis metabolisme dan defisit kalori.",
    provider: "openai",
    envKeyName: "OPENAI_API_KEY",
  },

  // DeepSeek Series
  {
    id: "deepseek-v4-flash",
    label: "DeepSeek-V4-Flash",
    shortName: "DEEPSEEK V4 FLASH",
    badge: "DEEPSEEK",
    description: "Arsitektur MoE super-cepat dengan latensi rendah untuk inferensi porsi ransum instan.",
    provider: "deepseek",
    envKeyName: "DEEPSEEK_API_KEY",
  },
  {
    id: "deepseek-v4-pro",
    label: "DeepSeek-V4-Pro",
    shortName: "DEEPSEEK V4 PRO",
    badge: "PRO REASON",
    description: "Model penalaran intensif DeepSeek untuk audit makro & mikro nutrisi tingkat tinggi.",
    provider: "deepseek",
    envKeyName: "DEEPSEEK_API_KEY",
  },
];

export const DEFAULT_MODEL_ID = "gemini-2.5-flash";

export function getGeminiModelById(id: string): GeminiModelInfo {
  const found = GEMINI_MODELS.find((m) => m.id === id);
  return found || GEMINI_MODELS[0];
}

/**
 * Global reactive hook that binds the selected AI model across all HUD screens:
 * Profile, Activities, Tracking (Scanner), Program, and Meal Plan.
 */
export function useSelectedAiModel() {
  const [modelId, setModelId] = useState<string>(DEFAULT_MODEL_ID);

  // Sync initial value from localStorage or cookie
  useEffect(() => {
    if (typeof window === "undefined") return;

    const readActiveModel = () => {
      const saved = localStorage.getItem("chai_ai_model");
      // Auto-migrate legacy fictional 3.x models to default
      if (saved && saved.startsWith("gemini-3")) {
        localStorage.setItem("chai_ai_model", DEFAULT_MODEL_ID);
        document.cookie = `chai_ai_model=${encodeURIComponent(DEFAULT_MODEL_ID)}; path=/; max-age=31536000; SameSite=Lax`;
        setModelId(DEFAULT_MODEL_ID);
        return;
      }
      if (saved && GEMINI_MODELS.some((m) => m.id === saved)) {
        setModelId(saved);
      } else {
        const cookieMatch = document.cookie.match(/(?:^|;\s*)chai_ai_model=([^;]+)/);
        if (cookieMatch && cookieMatch[1]) {
          const cookieVal = decodeURIComponent(cookieMatch[1]);
          if (cookieVal.startsWith("gemini-3")) {
            document.cookie = `chai_ai_model=${encodeURIComponent(DEFAULT_MODEL_ID)}; path=/; max-age=31536000; SameSite=Lax`;
            setModelId(DEFAULT_MODEL_ID);
            return;
          }
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

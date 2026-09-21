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
    id: "gemini-3.8-flash",
    label: "Gemini 3.8 Flash (High • Google)",
    shortName: "GEMINI 3.8 FLASH HIGH",
    badge: "RECOMMENDED",
    description: "Multimodal turbo tingkat tinggi dengan penalaran gizi tinggi dan akurasi kalori maksimal.",
    provider: "google",
    envKeyName: "GEMINI_API_KEY",
  },
  {
    id: "gemini-3.7-flash",
    label: "Gemini 3.7 Flash (Google)",
    shortName: "GEMINI 3.7 FLASH",
    badge: "FAST",
    description: "Model ultra-cepat responsif untuk inferensi cepat porsi dan gramatur makanan.",
    provider: "google",
    envKeyName: "GEMINI_API_KEY",
  },
  {
    id: "gemini-3.6-flash",
    label: "Gemini 3.6 Flash (Google)",
    shortName: "GEMINI 3.6 FLASH",
    badge: "LEGACY",
    description: "Model stabil teruji untuk lingkungan jaringan dengan bandwidth rendah.",
    provider: "google",
    envKeyName: "GEMINI_API_KEY",
  },
  {
    id: "gemini-3.1-pro-preview",
    label: "Gemini 3.1 Pro (Google Preview)",
    shortName: "GEMINI 3.1 PRO",
    badge: "PREVIEW",
    description: "Model penalaran tingkat tinggi untuk analisis makronutrisi kompleks.",
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

export const DEFAULT_MODEL_ID = "gemini-3.8-flash";

export function sanitizeModelId(raw?: string | null): string {
  if (!raw || typeof raw !== "string") return DEFAULT_MODEL_ID;
  const match = GEMINI_MODELS.find((m) => m.id === raw);
  if (match) return match.id;
  const lower = raw.toLowerCase().trim();
  if (lower.includes("3.8")) return "gemini-3.8-flash";
  if (lower.includes("3.7")) return "gemini-3.7-flash";
  if (lower.includes("3.6")) return "gemini-3.6-flash";
  if (lower.includes("3.1") || lower.includes("pro")) return "gemini-3.1-pro-preview";
  if (lower.includes("flash")) return "gemini-3.8-flash";
  if (lower.includes("luna") || lower.includes("gpt-5.6")) return "gpt-5.6-luna";
  if (lower.includes("gpt-5") || lower.includes("thinking") || lower.includes("o3") || lower.includes("o1")) return "gpt-5-thinking-mini";
  if (lower.includes("deepseek-v4-pro") || lower.includes("reasoner")) return "deepseek-v4-pro";
  if (lower.includes("deepseek")) return "deepseek-v4-flash";
  return DEFAULT_MODEL_ID;
}

export function getGeminiModelById(id: string): GeminiModelInfo {
  const cleanId = sanitizeModelId(id);
  const found = GEMINI_MODELS.find((m) => m.id === cleanId);
  return found || GEMINI_MODELS[0];
}

/**
 * Global reactive hook that binds the selected AI model across all HUD screens:
 * Profile, Activities, Tracking (Scanner), Program, and Meal Plan.
 */
export function useSelectedAiModel() {
  const [modelId, setModelId] = useState<string>(DEFAULT_MODEL_ID);

  // Sync initial value from localStorage or cookie with auto-migration of legacy models
  useEffect(() => {
    if (typeof window === "undefined") return;

    const readActiveModel = () => {
      let candidate: string | null = null;
      const saved = localStorage.getItem("chai_ai_model");
      if (saved) {
        candidate = saved;
      } else {
        const cookieMatch = document.cookie.match(/(?:^|;\s*)chai_ai_model=([^;]+)/);
        if (cookieMatch && cookieMatch[1]) {
          candidate = decodeURIComponent(cookieMatch[1]);
        }
      }
      const clean = sanitizeModelId(candidate);
      setModelId(clean);

      // Clean up legacy cookies or localStorage entries (e.g. gemini-1.5-pro)
      if (candidate !== clean) {
        localStorage.setItem("chai_ai_model", clean);
        document.cookie = `chai_ai_model=${encodeURIComponent(clean)}; path=/; max-age=31536000; SameSite=Lax`;
      }
    };

    readActiveModel();

    // Listen to local model change events across tabs and components
    const handleModelChange = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        const clean = sanitizeModelId(customEvent.detail);
        setModelId(clean);
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

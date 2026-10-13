"use client";

import { useState, useEffect, useCallback } from "react";

export type AiProvider = "google" | "openai" | "deepseek" | "groq";

export interface GeminiModelInfo {
  id: string;
  label: string;
  shortName: string;
  badge: string;
  description: string;
  provider: AiProvider;
  envKeyName: string;
  visionCapable: boolean;
}

export const GEMINI_MODELS: GeminiModelInfo[] = [
  // Google Gemini Series (All are multimodal vision capable)
  {
    id: "gemini-3.8-flash",
    label: "Gemini 3.8 Flash (Terbaru • Google)",
    shortName: "GEMINI 3.8 FLASH",
    badge: "RECOMMENDED",
    description: "Model flagship cepat versi paling baru untuk kebutuhan app umum dan multimodal vision.",
    provider: "google",
    envKeyName: "GEMINI_API_KEY",
    visionCapable: true,
  },
  {
    id: "gemini-3.7-flash",
    label: "Gemini 3.7 Flash (Google)",
    shortName: "GEMINI 3.7 FLASH",
    badge: "FAST",
    description: "Seri Flash generasi 3 untuk analisis teks, koding, dan multimodal.",
    provider: "google",
    envKeyName: "GEMINI_API_KEY",
    visionCapable: true,
  },
  {
    id: "gemini-3.5-flash-lite",
    label: "Gemini 3.5 Flash-Lite (Google)",
    shortName: "GEMINI 3.5 LITE",
    badge: "TURBO LITE",
    description: "Versi lightweight berkecepatan ekstra tinggi untuk ekstraksi data makanan instan.",
    provider: "google",
    envKeyName: "GEMINI_API_KEY",
    visionCapable: true,
  },
  {
    id: "gemini-3.1-flash-lite",
    label: "Gemini 3.1 Flash-Lite (Google)",
    shortName: "GEMINI 3.1 LITE",
    badge: "NEW FLASH",
    description: "Model multimodal efisien tinggi untuk inferensi cepat volume tinggi.",
    provider: "google",
    envKeyName: "GEMINI_API_KEY",
    visionCapable: true,
  },
  {
    id: "gemini-3.1-pro-preview",
    label: "Gemini 3.1 Pro Preview (Google)",
    shortName: "GEMINI 3.1 PRO",
    badge: "PRO REASON",
    description: "Model reasoning mendalam dengan jendela konteks 1 juta token.",
    provider: "google",
    envKeyName: "GEMINI_API_KEY",
    visionCapable: true,
  },
  {
    id: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash (Stabil • Google)",
    shortName: "GEMINI 2.5 FLASH",
    badge: "STABLE",
    description: "Model Flash stabil yang paling banyak digunakan untuk eksperimen & produksi.",
    provider: "google",
    envKeyName: "GEMINI_API_KEY",
    visionCapable: true,
  },
  {
    id: "gemini-2.5-flash-lite",
    label: "Gemini 2.5 Flash-Lite (Google)",
    shortName: "GEMINI 2.5 LITE",
    badge: "LIGHTWEIGHT",
    description: "Sangat ringan untuk pemrosesan teks tingkat dasar dalam jumlah banyak.",
    provider: "google",
    envKeyName: "GEMINI_API_KEY",
    visionCapable: true,
  },
  {
    id: "gemini-2.5-pro",
    label: "Gemini 2.5 Pro (Google)",
    shortName: "GEMINI 2.5 PRO",
    badge: "PRO REASON",
    description: "Model Pro untuk penalaran rumit dan analisis gizi mendalam.",
    provider: "google",
    envKeyName: "GEMINI_API_KEY",
    visionCapable: true,
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
    visionCapable: true,
  },
  {
    id: "gpt-5-thinking-mini",
    label: "GPT-5 Thinking Mini (OpenAI)",
    shortName: "GPT-5 THINKING",
    badge: "REASONING",
    description: "Model penalaran bertahap (deep reasoning) untuk analisis metabolisme dan defisit kalori.",
    provider: "openai",
    envKeyName: "OPENAI_API_KEY",
    visionCapable: false,
  },

  // DeepSeek Series (Text Only)
  {
    id: "deepseek-v4-flash",
    label: "DeepSeek-V4-Flash",
    shortName: "DEEPSEEK V4 FLASH",
    badge: "DEEPSEEK",
    description: "Arsitektur MoE super-cepat dengan latensi rendah untuk inferensi porsi ransum instan.",
    provider: "deepseek",
    envKeyName: "DEEPSEEK_API_KEY",
    visionCapable: false,
  },
  {
    id: "deepseek-v4-pro",
    label: "DeepSeek-V4-Pro",
    shortName: "DEEPSEEK V4 PRO",
    badge: "PRO REASON",
    description: "Model penalaran intensif DeepSeek untuk audit makro & mikro nutrisi tingkat tinggi.",
    provider: "deepseek",
    envKeyName: "DEEPSEEK_API_KEY",
    visionCapable: false,
  },

  // Groq Series (Text Only)
  {
    id: "llama-3.3-70b-versatile",
    label: "Llama 3.3 70B Versatile (Groq)",
    shortName: "LLAMA 3.3 70B",
    badge: "GROQ FAST",
    description: "Model 70B serbaguna dengan throughput kilat pada hardware LPU Groq.",
    provider: "groq",
    envKeyName: "GROQ_API_KEY",
    visionCapable: false,
  },
  {
    id: "llama-3.1-8b-instant",
    label: "Llama 3.1 8B Instant (Groq)",
    shortName: "LLAMA 3.1 8B",
    badge: "GROQ ULTRA",
    description: "Model ultra-cepat berlatensi ultra-rendah untuk penguraian instan.",
    provider: "groq",
    envKeyName: "GROQ_API_KEY",
    visionCapable: false,
  },
  {
    id: "openai/gpt-oss-120b",
    label: "GPT OSS 120B (Groq)",
    shortName: "GPT OSS 120B",
    badge: "GROQ OSS",
    description: "Model bobot terbuka 120B berkecepatan tinggi via LPU Groq.",
    provider: "groq",
    envKeyName: "GROQ_API_KEY",
    visionCapable: false,
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
  if (lower.includes("3.5")) return "gemini-3.5-flash-lite";
  if (lower.includes("3.1") && lower.includes("pro")) return "gemini-3.1-pro-preview";
  if (lower.includes("3.1")) return "gemini-3.1-flash-lite";
  if (lower.includes("2.5") && lower.includes("pro")) return "gemini-2.5-pro";
  if (lower.includes("2.5") && lower.includes("lite")) return "gemini-2.5-flash-lite";
  if (lower.includes("2.5")) return "gemini-2.5-flash";
  if (lower.includes("flash") && !lower.includes("deepseek")) return "gemini-3.8-flash";
  if (lower.includes("luna") || lower.includes("gpt-5.6")) return "gpt-5.6-luna";
  if (lower.includes("gpt-5") || lower.includes("thinking") || lower.includes("o3") || lower.includes("o1")) return "gpt-5-thinking-mini";
  if (lower.includes("deepseek-v4-pro") || lower.includes("reasoner")) return "deepseek-v4-pro";
  if (lower.includes("deepseek")) return "deepseek-v4-flash";
  if (lower.includes("llama-3.3") || lower.includes("70b")) return "llama-3.3-70b-versatile";
  if (lower.includes("llama-3.1") || lower.includes("8b")) return "llama-3.1-8b-instant";
  if (lower.includes("gpt-oss")) return "openai/gpt-oss-120b";
  return DEFAULT_MODEL_ID;
}

export function getGeminiModelById(id: string): GeminiModelInfo {
  const cleanId = sanitizeModelId(id);
  const found = GEMINI_MODELS.find((m) => m.id === cleanId);
  return found || GEMINI_MODELS[0];
}

/**
 * Global reactive hook that binds the selected AI model across all HUD screens.
 */
export function useSelectedAiModel() {
  const [modelId, setModelId] = useState<string>(DEFAULT_MODEL_ID);

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

      if (candidate !== clean) {
        localStorage.setItem("chai_ai_model", clean);
        document.cookie = `chai_ai_model=${encodeURIComponent(clean)}; path=/; max-age=31536000; SameSite=Lax`;
      }
    };

    readActiveModel();

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

/**
 * Hook to retrieve user's custom BYOK keys and server default environment keys status.
 * Gracefully fallbacks if user is unauthenticated.
 */
export function useAiKeyStatus() {
  const [userKeys, setUserKeys] = useState<Record<string, { hasKey: boolean; isTested: boolean; testStatus?: string }>>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("chai_user_keys_status");
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return {};
  });
  const [serverEnvKeys, setServerEnvKeys] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("chai_auth_token") : null;
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      const [keysRes, healthRes] = await Promise.all([
        fetch("/api/ai-keys", { headers }).catch(() => null),
        fetch("/api/ai/health", { headers }).catch(() => null),
      ]);

      if (keysRes && keysRes.ok) {
        const keysData = await keysRes.json();
        if (keysData.keys && Array.isArray(keysData.keys)) {
          const mapped: Record<string, { hasKey: boolean; isTested: boolean; testStatus?: string }> = {};
          keysData.keys.forEach((k: any) => {
            const hasKey = Boolean(k.hasKey || k.has_key || k.status === "valid" || k.status === "unverified");
            const isTested = Boolean(k.isTested || k.is_tested || k.status === "valid");
            const testStatus = k.status || k.test_status || (hasKey ? "valid" : "unconfigured");

            const entry = { hasKey, isTested, testStatus };
            mapped[k.provider] = entry;

            // Bridge provider names: "gemini" in backend <-> "google" in frontend
            if (k.provider === "gemini") {
              mapped["google"] = entry;
            } else if (k.provider === "google") {
              mapped["gemini"] = entry;
            }
          });
          setUserKeys(mapped);
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem("chai_user_keys_status", JSON.stringify(mapped));
            } catch {}
          }
        }
      }

      if (healthRes && healthRes.ok) {
        const healthData = await healthRes.json();
        if (healthData.env_keys_status) {
          setServerEnvKeys(healthData.env_keys_status);
        }
      }
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();

    const handleKeyUpdate = () => {
      fetchStatus();
    };

    window.addEventListener("chai_keys_updated", handleKeyUpdate);
    return () => {
      window.removeEventListener("chai_keys_updated", handleKeyUpdate);
    };
  }, [fetchStatus]);

  const isProviderAvailable = useCallback((provider: AiProvider): boolean => {
    // 1. User has custom BYOK key (check both google and gemini aliases)
    if (userKeys[provider]?.hasKey) return true;
    if (provider === "google" && userKeys["gemini"]?.hasKey) return true;
    if ((provider as string) === "gemini" && userKeys["google"]?.hasKey) return true;

    // Check localStorage cache as immediate client fallback
    if (typeof window !== "undefined") {
      try {
        const cached = JSON.parse(localStorage.getItem("chai_user_keys_status") || "{}");
        if (cached[provider]?.hasKey || cached[provider]?.status === "valid" || cached[provider]?.testStatus === "valid") return true;
        if (provider === "google" && (cached["gemini"]?.hasKey || cached["gemini"]?.status === "valid" || cached["gemini"]?.testStatus === "valid")) return true;
        if ((provider as string) === "gemini" && (cached["google"]?.hasKey || cached["google"]?.status === "valid" || cached["google"]?.testStatus === "valid")) return true;
      } catch {}
    }

    // 2. Server has default environment key
    const envKeyMap: Record<string, string> = {
      google: "GEMINI_API_KEY",
      gemini: "GEMINI_API_KEY",
      openai: "OPENAI_API_KEY",
      deepseek: "DEEPSEEK_API_KEY",
      groq: "GROQ_API_KEY",
    };
    const envKeyName = envKeyMap[provider];
    if (envKeyName && serverEnvKeys[envKeyName]) return true;

    return false;
  }, [userKeys, serverEnvKeys]);

  const isModelAvailable = useCallback((modelId: string): boolean => {
    const model = getGeminiModelById(modelId);
    return isProviderAvailable(model.provider);
  }, [isProviderAvailable]);

  return {
    userKeys,
    serverEnvKeys,
    loading,
    isProviderAvailable,
    isModelAvailable,
    refreshStatus: fetchStatus,
  };
}


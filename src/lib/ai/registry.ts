/**
 * Calorie Hunter AI - Provider & Model Registry
 * Verified Date: 2026-10-13
 * Single source of truth for AI providers, supported models, capabilities, and base URLs.
 */

export type ProviderType = "gemini" | "openai" | "deepseek" | "groq";

export interface ModelCapabilities {
  vision: boolean;
  jsonMode: boolean;
}

export interface AiModelDefinition {
  id: string;
  label: string;
  provider: ProviderType;
  capabilities: ModelCapabilities;
  verifiedAt: string; // ISO date string (YYYY-MM-DD)
  description: string;
  badge?: string;
}

export interface AiProviderDefinition {
  id: ProviderType;
  name: string;
  defaultBaseUrl: string;
  defaultModel: string;
  capabilities: ModelCapabilities;
  verifiedAt: string;
  models: AiModelDefinition[];
}

export const AI_PROVIDERS: Record<ProviderType, AiProviderDefinition> = {
  gemini: {
    id: "gemini",
    name: "Google Gemini",
    defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
    defaultModel: "gemini-3.8-flash",
    capabilities: {
      vision: true,
      jsonMode: true,
    },
    verifiedAt: "2026-10-13",
    models: [
      {
        id: "gemini-3.8-flash",
        label: "Gemini 3.8 Flash (Terbaru • Google)",
        provider: "gemini",
        capabilities: { vision: true, jsonMode: true },
        verifiedAt: "2026-10-13",
        description: "Model flagship cepat versi paling baru untuk kebutuhan app umum dan multimodal vision.",
        badge: "RECOMMENDED",
      },
      {
        id: "gemini-3.7-flash",
        label: "Gemini 3.7 Flash (Google)",
        provider: "gemini",
        capabilities: { vision: true, jsonMode: true },
        verifiedAt: "2026-10-13",
        description: "Seri Flash generasi 3 untuk analisis teks, koding, dan multimodal.",
        badge: "FAST",
      },
      {
        id: "gemini-3.5-flash-lite",
        label: "Gemini 3.5 Flash-Lite (Google)",
        provider: "gemini",
        capabilities: { vision: true, jsonMode: true },
        verifiedAt: "2026-10-13",
        description: "Versi lightweight berkecepatan ekstra tinggi untuk ekstraksi data makanan instan.",
        badge: "TURBO LITE",
      },
      {
        id: "gemini-3.1-flash-lite",
        label: "Gemini 3.1 Flash-Lite (Google)",
        provider: "gemini",
        capabilities: { vision: true, jsonMode: true },
        verifiedAt: "2026-10-13",
        description: "Model multimodal efisien tinggi untuk pemrosesan berfrekuensi tinggi.",
        badge: "NEW",
      },
      {
        id: "gemini-3.1-pro-preview",
        label: "Gemini 3.1 Pro Preview (Google)",
        provider: "gemini",
        capabilities: { vision: true, jsonMode: true },
        verifiedAt: "2026-10-13",
        description: "Model reasoning mendalam dengan jendela konteks 1 juta token.",
        badge: "PREVIEW",
      },
      {
        id: "gemini-2.5-flash",
        label: "Gemini 2.5 Flash (Stabil • Google)",
        provider: "gemini",
        capabilities: { vision: true, jsonMode: true },
        verifiedAt: "2026-10-13",
        description: "Model Flash stabil yang paling banyak digunakan untuk eksperimen & produksi.",
        badge: "STABLE",
      },
      {
        id: "gemini-2.5-flash-lite",
        label: "Gemini 2.5 Flash-Lite (Google)",
        provider: "gemini",
        capabilities: { vision: true, jsonMode: true },
        verifiedAt: "2026-10-13",
        description: "Sangat ringan untuk pemrosesan teks tingkat dasar dalam jumlah banyak.",
        badge: "LIGHTWEIGHT",
      },
      {
        id: "gemini-2.5-pro",
        label: "Gemini 2.5 Pro (Google)",
        provider: "gemini",
        capabilities: { vision: true, jsonMode: true },
        verifiedAt: "2026-10-13",
        description: "Model Pro untuk penalaran rumit dan analisis gizi mendalam.",
        badge: "PRO REASON",
      },
    ],
  },

  openai: {
    id: "openai",
    name: "OpenAI GPT",
    defaultBaseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-5.6-luna",
    capabilities: {
      vision: true,
      jsonMode: true,
    },
    verifiedAt: "2026-10-13",
    models: [
      {
        id: "gpt-5.6-luna",
        label: "GPT-5.6 Luna (OpenAI)",
        provider: "openai",
        capabilities: { vision: true, jsonMode: true },
        verifiedAt: "2026-10-13",
        description: "Model vision & multimodal mutakhir OpenAI untuk pemindaian presisi tinggi hidangan makanan.",
        badge: "OPENAI",
      },
      {
        id: "gpt-5-thinking-mini",
        label: "GPT-5 Thinking Mini (OpenAI)",
        provider: "openai",
        capabilities: { vision: false, jsonMode: true },
        verifiedAt: "2026-10-13",
        description: "Model penalaran bertahap (deep reasoning) untuk analisis metabolisme dan defisit kalori.",
        badge: "REASONING",
      },
    ],
  },

  deepseek: {
    id: "deepseek",
    name: "DeepSeek",
    defaultBaseUrl: "https://api.deepseek.com",
    defaultModel: "deepseek-v4-flash",
    capabilities: {
      vision: false,
      jsonMode: true,
    },
    verifiedAt: "2026-10-13",
    models: [
      {
        id: "deepseek-v4-flash",
        label: "DeepSeek-V4-Flash",
        provider: "deepseek",
        capabilities: { vision: false, jsonMode: true },
        verifiedAt: "2026-10-13",
        description: "Arsitektur MoE super-cepat dengan latensi rendah untuk inferensi porsi ransum instan.",
        badge: "DEEPSEEK",
      },
      {
        id: "deepseek-v4-pro",
        label: "DeepSeek-V4-Pro",
        provider: "deepseek",
        capabilities: { vision: false, jsonMode: true },
        verifiedAt: "2026-10-13",
        description: "Model penalaran intensif DeepSeek untuk audit makro & mikro nutrisi tingkat tinggi.",
        badge: "PRO REASON",
      },
    ],
  },

  groq: {
    id: "groq",
    name: "Groq LPU",
    defaultBaseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
    capabilities: {
      vision: false,
      jsonMode: true,
    },
    verifiedAt: "2026-10-13",
    models: [
      {
        id: "llama-3.3-70b-versatile",
        label: "Llama 3.3 70B Versatile (Groq)",
        provider: "groq",
        capabilities: { vision: false, jsonMode: true },
        verifiedAt: "2026-10-13",
        description: "Model 70B serbaguna dengan throughput kilat pada hardware LPU Groq.",
        badge: "GROQ FAST",
      },
      {
        id: "llama-3.1-8b-instant",
        label: "Llama 3.1 8B Instant (Groq)",
        provider: "groq",
        capabilities: { vision: false, jsonMode: true },
        verifiedAt: "2026-10-13",
        description: "Model ultra-cepat dan berlatensi ultra-rendah untuk penguraian instan.",
        badge: "ULTRA FAST",
      },
      {
        id: "openai/gpt-oss-120b",
        label: "GPT OSS 120B (Groq)",
        provider: "groq",
        capabilities: { vision: false, jsonMode: true },
        verifiedAt: "2026-10-13",
        description: "Model bobot terbuka kelas 120B yang dioptimalkan untuk akurasi tinggi.",
        badge: "GROQ OSS",
      },
    ],
  },
};

export const ALL_AI_MODELS: AiModelDefinition[] = Object.values(AI_PROVIDERS).flatMap(
  (p) => p.models
);

export function getProviderDefinition(provider: ProviderType): AiProviderDefinition {
  const p = AI_PROVIDERS[provider];
  if (!p) {
    throw new Error(`Provider tidak dikenal: ${provider}`);
  }
  return p;
}

export function findModelDefinition(modelId: string): AiModelDefinition | undefined {
  return ALL_AI_MODELS.find((m) => m.id === modelId);
}

export function isModelVisionSupported(modelId: string): boolean {
  const m = findModelDefinition(modelId);
  return Boolean(m?.capabilities.vision);
}

export function getProviderForModel(modelId: string): ProviderType {
  const found = findModelDefinition(modelId);
  if (found) return found.provider;
  if (modelId.startsWith("gemini-")) return "gemini";
  if (modelId.startsWith("gpt-")) return "openai";
  if (modelId.startsWith("deepseek-")) return "deepseek";
  if (modelId.includes("llama-") || modelId.startsWith("openai/")) return "groq";
  return "gemini";
}

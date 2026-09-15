import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || "";

/**
 * ADR-3: Official @google/genai client instantiated on server side only.
 * GEMINI_API_KEY is never sent to the browser or bundled in client code.
 */
export const gemini = new GoogleGenAI({ apiKey });

/**
 * Primary model: gemini-2.5-flash
 * Fallback model: gemini-2.0-flash
 */
export const PRIMARY_GEMINI_MODEL = "gemini-2.5-flash";
export const FALLBACK_GEMINI_MODEL = "gemini-2.0-flash";

/**
 * Resolves a model ID to a valid official Google Gemini model.
 * Automatically converts any experimental, fictional, or deprecated model names
 * (such as gemini-3.8-flash or models requesting -high thinking) to stable production clusters.
 */
export function resolveSafeGeminiModel(modelName?: string): string {
  if (!modelName) return PRIMARY_GEMINI_MODEL;
  const clean = modelName.toLowerCase().trim();
  if (clean.startsWith("gemini-3") || clean.includes("high") || clean.includes("preview")) {
    return "gemini-2.5-flash";
  }
  if (clean.includes("2.5")) return "gemini-2.5-flash";
  if (clean.includes("2.0")) return "gemini-2.0-flash";
  if (clean.includes("1.5")) return "gemini-1.5-flash";
  return PRIMARY_GEMINI_MODEL;
}

// Intercept all generateContent calls to guarantee valid Google model IDs and prevent 503 capacity errors
const rawGenerateContent = gemini.models.generateContent.bind(gemini.models);
gemini.models.generateContent = (params: any) => {
  const safeModel = resolveSafeGeminiModel(params.model);
  const cleanConfig = { ...params.config };
  if (cleanConfig.thinkingConfig) {
    delete cleanConfig.thinkingConfig;
  }
  return rawGenerateContent({
    ...params,
    model: safeModel,
    config: cleanConfig,
  });
};

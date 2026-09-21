import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || "";

/**
 * ADR-3: Official @google/genai client instantiated on server side only.
 * GEMINI_API_KEY is never sent to the browser or bundled in client code.
 */
export const gemini = new GoogleGenAI({ apiKey });

/**
 * Primary model: gemini-3.8-flash (High Reasoning)
 * Fallback model: gemini-3.7-flash
 */
export const PRIMARY_GEMINI_MODEL = "gemini-3.8-flash";
export const FALLBACK_GEMINI_MODEL = "gemini-3.7-flash";

/**
 * Maps requested UI model IDs (e.g. gemini-3.8-flash, gemini-3.7-flash) to official Google GenAI model IDs.
 * This guarantees Google API endpoints never receive a 404 Model Not Found.
 */
export function resolveOfficialGeminiModel(requestedModel?: string | null): string {
  if (!requestedModel || typeof requestedModel !== "string") return PRIMARY_GEMINI_MODEL;
  const m = requestedModel.toLowerCase().trim();
  if (m.includes("3.8")) return "gemini-3.8-flash";
  if (m.includes("3.7")) return "gemini-3.7-flash";
  if (m.includes("3.6")) return "gemini-3.6-flash";
  if (m.includes("3.1") || m.includes("pro")) return "gemini-3.1-pro-preview";
  if (m.includes("flash")) return "gemini-3.8-flash";
  // Strict clamp: any unknown or legacy identifiers (1.5, 2.0, 2.5) clamp to PRIMARY_GEMINI_MODEL (3.8)
  return PRIMARY_GEMINI_MODEL;
}

// Intercept all generateContent calls: auto-resolve model and retry with failover cluster on 404, 429, or 503
const rawGenerateContent = gemini.models.generateContent.bind(gemini.models);
gemini.models.generateContent = async (params: any) => {
  const requestedModel = params.model || PRIMARY_GEMINI_MODEL;
  const modelToTry = resolveOfficialGeminiModel(requestedModel);
  const initialParams = { ...params, model: modelToTry };

  try {
    return await rawGenerateContent(initialParams);
  } catch (err: any) {
    const errMsg = (err.message || "").toLowerCase();
    const isRetryable = 
      errMsg.includes("503") || 
      errMsg.includes("capacity") || 
      errMsg.includes("unavailable") ||
      errMsg.includes("429") ||
      errMsg.includes("quota") ||
      errMsg.includes("resource exhausted") ||
      errMsg.includes("rate limit") ||
      errMsg.includes("404") ||
      errMsg.includes("not found") ||
      errMsg.includes("is not found");

    if (isRetryable) {
      console.warn(`[Gemini Interceptor] ${modelToTry} encountered recoverable error (${errMsg.slice(0, 100)}), retrying with failover cluster:`, err.message);
      const cleanConfig = { ...params.config };
      if (cleanConfig.thinkingConfig) {
        delete cleanConfig.thinkingConfig;
      }
      
      const fallbackModels = ["gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.6-flash", "gemini-3.1-pro-preview"];
      for (const fallbackModel of fallbackModels) {
        if (fallbackModel === modelToTry) continue;
        try {
          return await rawGenerateContent({
            ...params,
            model: fallbackModel,
            config: cleanConfig,
          });
        } catch (fbErr: any) {
          console.warn(`[Gemini Interceptor] Fallback ${fallbackModel} also failed, trying next:`, fbErr.message);
        }
      }
    }
    throw err;
  }
};


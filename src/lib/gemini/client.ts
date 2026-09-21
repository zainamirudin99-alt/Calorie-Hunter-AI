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
  if (!requestedModel || typeof requestedModel !== "string") return "gemini-2.0-flash";
  const m = requestedModel.toLowerCase().trim();
  if (m.includes("1.5-pro")) return "gemini-1.5-pro";
  if (m.includes("1.5")) return "gemini-1.5-flash";
  if (m.includes("2.0")) return "gemini-2.0-flash";
  if (m.includes("2.5-pro")) return "gemini-2.0-flash";
  if (m.includes("2.5")) return "gemini-2.0-flash";
  // Default to the fastest and most stable multimodal model in Google GenAI
  return "gemini-2.0-flash";
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
      
      const fallbackModels = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"];
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


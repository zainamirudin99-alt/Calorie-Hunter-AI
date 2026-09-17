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

// Intercept all generateContent calls: try the requested model first; if 503 capacity limit or 429 quota/rate limit is returned by Google, gracefully failover so the app never crashes
const rawGenerateContent = gemini.models.generateContent.bind(gemini.models);
gemini.models.generateContent = async (params: any) => {
  const modelToTry = params.model || PRIMARY_GEMINI_MODEL;
  try {
    return await rawGenerateContent(params);
  } catch (err: any) {
    const errMsg = (err.message || "").toLowerCase();
    const isCapacityOrQuota = 
      errMsg.includes("503") || 
      errMsg.includes("capacity") || 
      errMsg.includes("unavailable") ||
      errMsg.includes("429") ||
      errMsg.includes("quota") ||
      errMsg.includes("resource exhausted") ||
      errMsg.includes("rate limit");

    if (isCapacityOrQuota) {
      console.warn(`[Gemini Interceptor] ${modelToTry} encountered capacity/quota limit (${errMsg.slice(0, 100)}), retrying with failover cluster:`, err.message);
      const cleanConfig = { ...params.config };
      if (cleanConfig.thinkingConfig) {
        delete cleanConfig.thinkingConfig;
      }
      
      const fallbackModels = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
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

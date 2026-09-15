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

// Intercept all generateContent calls: try the requested model first; if 503 capacity limit is returned by Google, gracefully failover so the app never crashes
const rawGenerateContent = gemini.models.generateContent.bind(gemini.models);
gemini.models.generateContent = async (params: any) => {
  const modelToTry = params.model || PRIMARY_GEMINI_MODEL;
  try {
    return await rawGenerateContent(params);
  } catch (err: any) {
    const errMsg = (err.message || "").toLowerCase();
    const isCapacity = errMsg.includes("503") || errMsg.includes("capacity") || errMsg.includes("unavailable");
    if (isCapacity) {
      console.warn(`[Gemini Interceptor] ${modelToTry} capacity overloaded (503), retrying with failover cluster:`, err.message);
      const cleanConfig = { ...params.config };
      if (cleanConfig.thinkingConfig) {
        delete cleanConfig.thinkingConfig;
      }
      try {
        return await rawGenerateContent({
          ...params,
          model: "gemini-2.5-flash",
          config: cleanConfig,
        });
      } catch {
        throw err;
      }
    }
    throw err;
  }
};

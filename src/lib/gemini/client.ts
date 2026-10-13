import { GoogleGenAI } from "@google/genai";

/**
 * BYOK Architecture:
 * System environment keys have been deprecated in favor of user-managed encrypted keys.
 * New server routes use `callAI` from `@/lib/ai/adapter`.
 */
export const gemini = new GoogleGenAI({ apiKey: "byok-user-key-managed" });

export const PRIMARY_GEMINI_MODEL = "gemini-3.8-flash";
export const FALLBACK_GEMINI_MODEL = "gemini-3.7-flash";

/**
 * Maps requested UI model IDs to official Google GenAI model IDs.
 */
export function resolveOfficialGeminiModel(requestedModel?: string | null): string {
  if (!requestedModel || typeof requestedModel !== "string") return PRIMARY_GEMINI_MODEL;
  const m = requestedModel.toLowerCase().trim();
  if (m.includes("3.8")) return "gemini-3.8-flash";
  if (m.includes("3.7")) return "gemini-3.7-flash";
  if (m.includes("3.5")) return "gemini-3.5-flash-lite";
  if (m.includes("3.1") && m.includes("pro")) return "gemini-3.1-pro-preview";
  if (m.includes("3.1")) return "gemini-3.1-flash-lite";
  if (m.includes("2.5") && m.includes("pro")) return "gemini-2.5-pro";
  if (m.includes("2.5") && m.includes("lite")) return "gemini-2.5-flash-lite";
  if (m.includes("2.5")) return "gemini-2.5-flash";
  if (m.includes("flash")) return "gemini-3.8-flash";
  return PRIMARY_GEMINI_MODEL;
}

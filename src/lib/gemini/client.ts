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

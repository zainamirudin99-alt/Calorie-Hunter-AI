import { z } from "zod";
import {
  AiError,
  CallAiOptions,
  CallAiResult,
  AiMessage,
  UserApiKeyInfo,
} from "./types";
import {
  AI_PROVIDERS,
  ProviderType,
  getProviderDefinition,
  isModelVisionSupported,
} from "./registry";

function extractCleanBase64(input: string): { data: string; mimeType: string } {
  const match = input.match(/^data:([^;]+);base64,(.+)$/);
  if (match) {
    return { mimeType: match[1], data: match[2] };
  }
  return { mimeType: "image/jpeg", data: input.trim() };
}

function cleanJsonText(raw: string): string {
  let cleaned = raw.trim();
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  } else {
    // If no code block, extract from first { to last }
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1).trim();
    }
  }
  return cleaned;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfter(headerValue: string | null): number {
  if (!headerValue) return 1500;
  const seconds = parseInt(headerValue, 10);
  if (isNaN(seconds)) return 1500;
  // Maximum wait 8 seconds as per rule
  return Math.min(Math.max(seconds * 1000, 1000), 8000);
}

/**
 * Resolves requested Gemini model to official Google GenAI model IDs with fallback cascade
 */
function resolveGeminiModelCandidates(requestedModel: string): string[] {
  const m = requestedModel.toLowerCase().trim();
  const primaryCandidates: string[] = [];
  
  if (m.includes("3.8") || m.includes("3.7") || m.includes("2.5-flash")) {
    primaryCandidates.push("gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash");
  } else if (m.includes("lite") || m.includes("3.5") || m.includes("3.1-flash")) {
    primaryCandidates.push("gemini-2.0-flash-lite", "gemini-2.5-flash", "gemini-1.5-flash");
  } else if (m.includes("pro")) {
    primaryCandidates.push("gemini-2.5-pro", "gemini-1.5-pro", "gemini-2.5-flash");
  } else {
    primaryCandidates.push("gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash");
  }

  // Deduplicate while preserving order: test requestedModel first, then official fallbacks
  const candidates = [requestedModel, ...primaryCandidates];
  return Array.from(new Set(candidates));
}

/**
 * Native REST call to Google Gemini with model candidate cascade
 */
async function executeGeminiRequest(
  options: CallAiOptions,
  baseUrl: string,
  timeoutSignal: AbortSignal
): Promise<string> {
  const { model, apiKey, messages, image, temperature, jsonMode, schema } = options;
  const cleanBaseUrl = baseUrl.replace(/\/+$/, "");

  const systemMsg = messages.find((m) => m.role === "system");
  const otherMessages = messages.filter((m) => m.role !== "system");

  const contents = otherMessages.map((msg, index) => {
    const isLastUser =
      msg.role === "user" && index === otherMessages.length - 1;
    const parts: Array<Record<string, unknown>> = [{ text: msg.content }];

    if (isLastUser && image) {
      const { mimeType, data } = extractCleanBase64(image.base64);
      parts.push({
        inlineData: {
          mimeType: image.mimeType || mimeType,
          data,
        },
      });
    }

    return {
      role: msg.role === "assistant" ? "model" : "user",
      parts,
    };
  });

  const bodyPayload: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: temperature ?? 0.2,
      ...(jsonMode || schema ? { responseMimeType: "application/json" } : {}),
    },
  };

  if (systemMsg) {
    bodyPayload.systemInstruction = {
      parts: [{ text: systemMsg.content }],
    };
  }

  const modelCandidates = resolveGeminiModelCandidates(model);
  let lastErrorText = "";
  let lastStatus = 500;

  for (const candidateModel of modelCandidates) {
    const endpoint = `${cleanBaseUrl}/models/${candidateModel}:generateContent?key=${apiKey}`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bodyPayload),
      signal: timeoutSignal,
    });

    if (response.ok) {
      const data = (await response.json()) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{ text?: string }>;
          };
        }>;
      };

      const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (typeof candidateText === "string" && candidateText.trim().length > 0) {
        return candidateText;
      }
    }

    lastStatus = response.status;
    lastErrorText = await response.text();

    const last4 = apiKey.slice(-4);
    if (response.status === 401 || response.status === 403) {
      throw new AiError("AI_KEY_INVALID", {
        provider: "gemini",
        last4,
        status: response.status,
        message: `Kunci API Gemini tidak valid (last4: ...${last4}).`,
      });
    }

    if (response.status === 429) {
      const retryMs = parseRetryAfter(response.headers.get("Retry-After"));
      throw new AiError("AI_RATE_LIMITED", {
        provider: "gemini",
        last4,
        status: 429,
        details: { retryMs },
      });
    }

    // If 404 (model not found), proceed to next candidate in cascade
    if (response.status === 404) {
      continue;
    }
  }

  const last4 = apiKey.slice(-4);
  if (lastStatus >= 500) {
    throw new AiError("AI_PROVIDER_DOWN", {
      provider: "gemini",
      last4,
      status: lastStatus,
    });
  }

  throw new AiError("AI_BAD_OUTPUT", {
    provider: "gemini",
    last4,
    status: lastStatus,
    message: `Gemini mengembalikan error: ${lastErrorText.slice(0, 200)}`,
  });
}

/**
 * OpenAI-compatible /chat/completions call (OpenAI, DeepSeek, Groq)
 */
async function executeOpenAiCompatibleRequest(
  options: CallAiOptions,
  baseUrl: string,
  timeoutSignal: AbortSignal
): Promise<string> {
  const { provider, model, apiKey, messages, image, temperature, jsonMode, schema } = options;
  const cleanBaseUrl = baseUrl.replace(/\/+$/, "");
  const endpoint = cleanBaseUrl.endsWith("/chat/completions")
    ? cleanBaseUrl
    : `${cleanBaseUrl}/chat/completions`;

  const formattedMessages = messages.map((msg, index) => {
    const isLastUser =
      msg.role === "user" && index === messages.length - 1;

    if (isLastUser && image) {
      const { mimeType, data } = extractCleanBase64(image.base64);
      return {
        role: msg.role,
        content: [
          { type: "text", text: msg.content },
          {
            type: "image_url",
            image_url: {
              url: `data:${image.mimeType || mimeType};base64,${data}`,
            },
          },
        ],
      };
    }

    return {
      role: msg.role,
      content: msg.content,
    };
  });

  const payload: Record<string, unknown> = {
    model,
    messages: formattedMessages,
    temperature: temperature ?? 0.2,
  };

  // Modern token parameter per provider
  if (provider === "openai") {
    payload.max_completion_tokens = 4096;
  } else {
    payload.max_tokens = 4096;
  }

  // Force JSON
  if (jsonMode || schema) {
    payload.response_format = { type: "json_object" };
  }

  // Disable thinking mode for DeepSeek
  if (provider === "deepseek") {
    payload.thinking = { type: "disabled" };
    payload.reasoning_effort = "none";
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
    signal: timeoutSignal,
  });

  const last4 = apiKey.slice(-4);

  if (!response.ok) {
    const errorText = await response.text();
    if (response.status === 401 || response.status === 403) {
      throw new AiError("AI_KEY_INVALID", {
        provider,
        last4,
        status: response.status,
        message: `Kunci API ${provider} tidak valid atau kedaluwarsa (last4: ...${last4}).`,
      });
    }
    if (response.status === 429) {
      const retryMs = parseRetryAfter(response.headers.get("Retry-After"));
      throw new AiError("AI_RATE_LIMITED", {
        provider,
        last4,
        status: 429,
        details: { retryMs },
      });
    }
    if (response.status >= 500) {
      throw new AiError("AI_PROVIDER_DOWN", {
        provider,
        last4,
        status: response.status,
      });
    }
    throw new AiError("AI_BAD_OUTPUT", {
      provider,
      last4,
      status: response.status,
      message: `Provider ${provider} mengembalikan error: ${errorText.slice(0, 200)}`,
    });
  }

  const data = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };

  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new AiError("AI_BAD_OUTPUT", {
      provider,
      last4,
      message: `Jawaban dari ${provider} tidak memiliki choices yang valid.`,
    });
  }

  return content;
}

/**
 * Execute single AI request with TTFB (20s) and overall timeout (45s/60s), plus 1x retry on 429/5xx/timeout.
 */
async function executeWithTimeoutAndRetry(
  options: CallAiOptions,
  baseUrl: string
): Promise<string> {
  const { provider, apiKey, image } = options;
  const overallTimeoutMs = image ? 60_000 : 45_000;
  const ttfbTimeoutMs = 20_000;
  const last4 = apiKey.slice(-4);

  let attempt = 0;
  while (attempt <= 1) {
    attempt++;
    const controller = new AbortController();
    let isTimedOut = false;
    let ttfbTriggered = false;

    const ttfbTimer = setTimeout(() => {
      ttfbTriggered = true;
      isTimedOut = true;
      controller.abort("TTFB_TIMEOUT");
    }, ttfbTimeoutMs);

    const overallTimer = setTimeout(() => {
      isTimedOut = true;
      controller.abort("OVERALL_TIMEOUT");
    }, overallTimeoutMs);

    try {
      let resultText: string;
      if (provider === "gemini") {
        resultText = await executeGeminiRequest(options, baseUrl, controller.signal);
      } else {
        resultText = await executeOpenAiCompatibleRequest(
          options,
          baseUrl,
          controller.signal
        );
      }
      clearTimeout(ttfbTimer);
      clearTimeout(overallTimer);
      return resultText;
    } catch (err: unknown) {
      clearTimeout(ttfbTimer);
      clearTimeout(overallTimer);

      if (isTimedOut || (err instanceof Error && err.name === "AbortError")) {
        if (attempt <= 1) {
          // Retry 1x with slight backoff
          await sleep(1000 + Math.random() * 500);
          continue;
        }
        throw new AiError("AI_TIMEOUT", {
          provider,
          last4,
          message: ttfbTriggered
            ? "Penyedia AI tidak mengirimkan respons dalam batas byte pertama (20 detik)."
            : "Permintaan AI melebihi batas waktu maksimal.",
        });
      }

      if (err instanceof AiError) {
        // Retry 1x for 429 or 5xx
        if (
          (err.code === "AI_RATE_LIMITED" || err.code === "AI_PROVIDER_DOWN") &&
          attempt <= 1
        ) {
          const waitMs =
            (err.details as { retryMs?: number })?.retryMs ||
            1500 + Math.random() * 500;
          await sleep(waitMs);
          continue;
        }
        throw err;
      }

      // Unexpected error
      if (attempt <= 1) {
        await sleep(1000);
        continue;
      }
      throw new AiError("AI_PROVIDER_DOWN", {
        provider,
        last4,
        message: err instanceof Error ? err.message : "Kesalahan koneksi provider AI.",
      });
    }
  }

  throw new AiError("AI_PROVIDER_DOWN", { provider, last4 });
}

/**
 * 1x Repair mechanism for invalid JSON schema output
 */
async function attemptJsonRepair<T>(
  rawText: string,
  schema: z.ZodType<T>,
  options: CallAiOptions<T>,
  baseUrl: string,
  parseError: string
): Promise<{ text: string; data: T }> {
  const repairMessages: AiMessage[] = [
    {
      role: "system",
      content:
        "Anda adalah asisten perbaikan format JSON. Tugas Anda adalah mengembalikan HANYA valid JSON murni yang sesuai dengan skema tanpa markdown atau teks pengantar/penjelas apapun.",
    },
    {
      role: "user",
      content: `Output JSON sebelumnya tidak valid dan gagal divalidasi skema.\nError Validasi: ${parseError}\n\nOutput Sebelumnya:\n${rawText}\n\nKeluarkan HANYA JSON yang diperbaiki sekarang:`,
    },
  ];

  const repairOptions: CallAiOptions<T> = {
    ...options,
    messages: repairMessages,
    image: undefined, // repair only passes text
  };

  const repairedText = await executeWithTimeoutAndRetry(repairOptions, baseUrl);
  const cleaned = cleanJsonText(repairedText);
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(cleaned);
  } catch (err) {
    throw new AiError("AI_BAD_OUTPUT", {
      provider: options.provider,
      last4: options.apiKey.slice(-4),
      message: "Gagal memperbaiki format JSON setelah 1x percobaan.",
    });
  }

  const parsed = schema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new AiError("AI_BAD_OUTPUT", {
      provider: options.provider,
      last4: options.apiKey.slice(-4),
      message: "Output JSON hasil perbaikan tetap tidak memenuhi skema.",
      details: parsed.error.issues,
    });
  }

  return { text: repairedText, data: parsed.data };
}

/**
 * Single entry point adapter for calling AI models across all providers.
 */
export async function callAI<T = unknown>(
  options: CallAiOptions<T>
): Promise<CallAiResult<T>> {
  const startTime = Date.now();
  const { provider, model, apiKey, image, schema, availableKeys, _hopCount = 0 } = options;

  // 1. Check API Key
  if (!apiKey || apiKey.trim() === "") {
    throw new AiError("AI_KEY_REQUIRED", {
      provider,
      message: "Kunci API untuk provider ini belum dikonfigurasi pada akun Anda.",
    });
  }

  // 2. Check Vision capability upfront
  if (image && !isModelVisionSupported(model)) {
    throw new AiError("AI_MODEL_NO_VISION", {
      provider,
      last4: apiKey.slice(-4),
    });
  }

  // 3. Resolve base URL
  const providerDef = getProviderDefinition(provider);
  const baseUrl = options.baseUrl || providerDef.defaultBaseUrl;

  try {
    const rawText = await executeWithTimeoutAndRetry(options, baseUrl);
    let validatedData: T | undefined;

    // 4. Schema validation and 1x repair
    if (schema) {
      const cleaned = cleanJsonText(rawText);
      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(cleaned);
        const parsed = schema.safeParse(parsedJson);
        if (parsed.success) {
          validatedData = parsed.data;
        } else {
          // Attempt 1x repair
          const repair = await attemptJsonRepair(
            rawText,
            schema,
            options,
            baseUrl,
            parsed.error.message
          );
          validatedData = repair.data;
        }
      } catch (jsonErr) {
        // Attempt 1x repair on parse error
        const repair = await attemptJsonRepair(
          rawText,
          schema,
          options,
          baseUrl,
          jsonErr instanceof Error ? jsonErr.message : "JSON.parse failed"
        );
        validatedData = repair.data;
      }
    }

    return {
      rawText,
      data: validatedData,
      provider,
      model,
      latencyMs: Date.now() - startTime,
      attemptedProviders: [provider],
    };
  } catch (error: unknown) {
    // 5. Automatic 1-hop failover to other user-owned keys ONLY (no system fallback)
    const canFailover =
      _hopCount === 0 &&
      Array.isArray(availableKeys) &&
      availableKeys.length > 0 &&
      error instanceof AiError &&
      (error.code === "AI_RATE_LIMITED" ||
        error.code === "AI_TIMEOUT" ||
        error.code === "AI_PROVIDER_DOWN");

    if (canFailover) {
      const candidateKey = availableKeys.find((k) => {
        if (k.provider === provider || !k.key) return false;
        if (image) {
          const candDef = AI_PROVIDERS[k.provider];
          return Boolean(candDef?.capabilities.vision);
        }
        return true;
      });

      if (candidateKey) {
        const candDef = getProviderDefinition(candidateKey.provider);
        const failoverResult = await callAI<T>({
          ...options,
          provider: candidateKey.provider,
          model: candDef.defaultModel,
          apiKey: candidateKey.key,
          baseUrl: candidateKey.baseUrl || candDef.defaultBaseUrl,
          _hopCount: 1,
        });

        return {
          ...failoverResult,
          attemptedProviders: [provider, candidateKey.provider],
        };
      }
    }

    if (error instanceof AiError) {
      throw error;
    }

    throw new AiError("AI_PROVIDER_DOWN", {
      provider,
      last4: apiKey.slice(-4),
      message: error instanceof Error ? error.message : "Panggilan AI gagal.",
    });
  }
}

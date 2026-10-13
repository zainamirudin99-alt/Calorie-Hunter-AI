import { ProviderType, AI_PROVIDERS } from "./registry";
import { validateCustomBaseUrl } from "./user-keys";

export interface KeyTestResult {
  success: boolean;
  status: "valid" | "invalid";
  latencyMs: number;
  message: string;
}

/**
 * Tests an AI provider API key by pinging the official models endpoint or running a minimal check.
 */
export async function testProviderApiKey(
  provider: ProviderType,
  apiKey: string,
  customBaseUrl?: string | null
): Promise<KeyTestResult> {
  const startTime = Date.now();
  const providerDef = AI_PROVIDERS[provider];
  if (!providerDef) {
    return {
      success: false,
      status: "invalid",
      latencyMs: 0,
      message: `Provider ${provider} tidak didukung.`,
    };
  }

  // Base URL check
  let baseUrl = providerDef.defaultBaseUrl;
  if (customBaseUrl && customBaseUrl.trim() !== "") {
    if (provider !== "openai") {
      return {
        success: false,
        status: "invalid",
        latencyMs: 0,
        message: "Base URL kustom hanya diperbolehkan untuk slot OpenAI (GPT).",
      };
    }
    const val = validateCustomBaseUrl(customBaseUrl);
    if (!val.valid) {
      return {
        success: false,
        status: "invalid",
        latencyMs: 0,
        message: val.error || "Base URL tidak valid.",
      };
    }
    baseUrl = customBaseUrl.trim();
  }

  const cleanBaseUrl = baseUrl.replace(/\/+$/, "");

  const controller = new AbortController();
  const timeoutTimer = setTimeout(() => controller.abort(), 12_000);

  try {
    let testUrl: string;
    const headers: Record<string, string> = {};

    if (provider === "gemini") {
      testUrl = `${cleanBaseUrl}/models?key=${apiKey}`;
    } else {
      testUrl = cleanBaseUrl.endsWith("/models")
        ? cleanBaseUrl
        : `${cleanBaseUrl}/models`;
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const res = await fetch(testUrl, {
      method: "GET",
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutTimer);
    const latencyMs = Date.now() - startTime;

    if (res.ok) {
      return {
        success: true,
        status: "valid",
        latencyMs,
        message: `Kunci ${providerDef.name} valid dan terhubung aktif (${latencyMs}ms).`,
      };
    }

    const last4 = apiKey.slice(-4);
    if (res.status === 401 || res.status === 403) {
      return {
        success: false,
        status: "invalid",
        latencyMs,
        message: `Kunci API ditolak (HTTP ${res.status}). Pastikan API key (...${last4}) benar.`,
      };
    }

    if (res.status === 429) {
      return {
        success: false,
        status: "invalid",
        latencyMs,
        message: `Batas kuota/rate-limit provider tercapai (HTTP 429).`,
      };
    }

    return {
      success: false,
      status: "invalid",
      latencyMs,
      message: `Pemeriksaan kunci mengembalikan kode status HTTP ${res.status}.`,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutTimer);
    const latencyMs = Date.now() - startTime;
    if (err instanceof Error && err.name === "AbortError") {
      return {
        success: false,
        status: "invalid",
        latencyMs,
        message: "Pemeriksaan koneksi API key timeout (melebihi 12 detik).",
      };
    }
    return {
      success: false,
      status: "invalid",
      latencyMs,
      message: err instanceof Error ? err.message : "Gagal terhubung ke endpoint provider.",
    };
  }
}

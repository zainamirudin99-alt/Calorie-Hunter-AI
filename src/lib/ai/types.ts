import { z } from "zod";
import { ProviderType } from "./registry";

export type AiErrorCode =
  | "AI_KEY_REQUIRED"
  | "AI_KEY_INVALID"
  | "AI_RATE_LIMITED"
  | "AI_TIMEOUT"
  | "AI_BAD_OUTPUT"
  | "AI_MODEL_NO_VISION"
  | "AI_PROVIDER_DOWN";

export type AiActionType = "retry" | "change_model" | "nutrition_dictionary";

export interface AiErrorDescriptor {
  message: string;
  action: AiActionType;
  actionLabel: string;
}

export const AI_ERROR_MAP: Record<AiErrorCode, AiErrorDescriptor> = {
  AI_KEY_REQUIRED: {
    message: "Kunci API untuk provider ini belum dikonfigurasi pada akun Anda.",
    action: "change_model",
    actionLabel: "Pilih model lain atau masukkan API key di Profil",
  },
  AI_KEY_INVALID: {
    message: "Kunci API tidak valid atau tidak memiliki izin akses (HTTP 401/403).",
    action: "change_model",
    actionLabel: "Periksa API key di Pengaturan Profil",
  },
  AI_RATE_LIMITED: {
    message: "Batas kuota atau kecepatan provider tercapai (HTTP 429).",
    action: "retry",
    actionLabel: "Coba lagi beberapa saat lagi atau beralih ke provider lain",
  },
  AI_TIMEOUT: {
    message: "Permintaan AI melebihi batas waktu maksimal atau penyedia tidak merespons.",
    action: "retry",
    actionLabel: "Coba lagi atau gunakan model yang lebih ringan",
  },
  AI_BAD_OUTPUT: {
    message: "Respons format AI tidak sesuai dengan skema data nutrisi yang diharapkan.",
    action: "nutrition_dictionary",
    actionLabel: "Coba lagi atau gunakan pencarian manual di Kamus Gizi",
  },
  AI_MODEL_NO_VISION: {
    message: "Model yang dipilih tidak mendukung analisis gambar atau foto makanan.",
    action: "change_model",
    actionLabel: "Ganti ke model yang mendukung Vision (seperti Gemini Flash)",
  },
  AI_PROVIDER_DOWN: {
    message: "Layanan penyedia AI sedang mengalami gangguan internal (HTTP 5xx).",
    action: "retry",
    actionLabel: "Coba lagi nanti atau beralih ke provider alternatif",
  },
};

export class AiError extends Error {
  code: AiErrorCode;
  action: AiActionType;
  actionLabel: string;
  provider?: ProviderType;
  last4?: string;
  status?: number;
  details?: unknown;

  constructor(
    code: AiErrorCode,
    override?: {
      message?: string;
      provider?: ProviderType;
      last4?: string;
      status?: number;
      details?: unknown;
    }
  ) {
    const descriptor = AI_ERROR_MAP[code];
    super(override?.message || descriptor.message);
    this.name = "AiError";
    this.code = code;
    this.action = descriptor.action;
    this.actionLabel = descriptor.actionLabel;
    this.provider = override?.provider;
    this.last4 = override?.last4;
    this.status = override?.status;
    this.details = override?.details;
  }

  toJSON() {
    return {
      error: this.code,
      message: this.message,
      action: this.action,
      actionLabel: this.actionLabel,
      provider: this.provider,
      last4: this.last4,
      status: this.status,
    };
  }
}

export interface AiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AiImageInput {
  base64: string;
  mimeType: string;
}

export interface UserApiKeyInfo {
  provider: ProviderType;
  key: string;
  baseUrl?: string | null;
  last4: string;
}

export interface CallAiOptions<T = unknown> {
  provider: ProviderType;
  model: string;
  apiKey: string;
  baseUrl?: string | null;
  messages: AiMessage[];
  image?: AiImageInput;
  schema?: z.ZodType<T>;
  jsonMode?: boolean;
  temperature?: number;
  availableKeys?: UserApiKeyInfo[];
  _hopCount?: number;
}

export interface CallAiResult<T = unknown> {
  rawText: string;
  data?: T;
  provider: ProviderType;
  model: string;
  latencyMs: number;
  attemptedProviders: ProviderType[];
}

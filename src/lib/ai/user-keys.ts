import { createAdminClient } from "../supabase/server";
import { ProviderType, getProviderForModel } from "./registry";
import { UserApiKeyInfo, AiError } from "./types";
import { decryptApiKey, encryptApiKey } from "./encryption";

export interface UserApiKeyRecord {
  user_id: string;
  provider: ProviderType;
  key_last4: string;
  base_url: string | null;
  status: "valid" | "invalid" | "unverified";
  last_checked_at: string | null;
  updated_at: string;
}

/**
 * Validates custom base URL against SSRF threats.
 * Rules: Must be https, no localhost, no private IPs, no link-local, max 200 chars.
 */
export function validateCustomBaseUrl(urlStr: string): { valid: boolean; error?: string } {
  if (!urlStr || urlStr.trim() === "") return { valid: true };
  const trimmed = urlStr.trim();
  if (trimmed.length > 200) {
    return { valid: false, error: "Base URL tidak boleh melebihi 200 karakter." };
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:") {
      return { valid: false, error: "Base URL wajib menggunakan protokol HTTPS (https://)." };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Deny localhost & loopback
    if (
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname.startsWith("127.")
    ) {
      return { valid: false, error: "Base URL tidak boleh mengarah ke localhost atau alamat loopback." };
    }

    // Deny link-local & cloud metadata
    if (
      hostname.startsWith("169.254.") ||
      hostname === "metadata.google.internal" ||
      hostname.endsWith(".internal")
    ) {
      return { valid: false, error: "Base URL tidak boleh mengarah ke link-local atau metadata service internal." };
    }

    // Deny Private RFC1918 IPv4 ranges
    if (
      hostname.startsWith("10.") ||
      hostname.startsWith("192.168.") ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
    ) {
      return { valid: false, error: "Base URL tidak boleh mengarah ke IP privat internal (RFC1918)." };
    }

    // Deny Private RFC4193 IPv6
    if (hostname.startsWith("fc00:") || hostname.startsWith("fe80:")) {
      return { valid: false, error: "Base URL tidak boleh mengarah ke alamat IP privat IPv6." };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: "Format Base URL tidak valid." };
  }
}

/**
 * Loads all decrypted keys owned by a user from user_api_keys via server-side admin client.
 */
export async function getUserAvailableKeys(userId: string): Promise<UserApiKeyInfo[]> {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("user_api_keys")
    .select("provider, key_enc, key_last4, base_url, status")
    .eq("user_id", userId)
    .in("status", ["valid", "unverified"]);

  if (error || !data) {
    return [];
  }

  const keys: UserApiKeyInfo[] = [];
  for (const row of data) {
    try {
      const plaintext = decryptApiKey(row.key_enc);
      keys.push({
        provider: row.provider as ProviderType,
        key: plaintext,
        baseUrl: row.base_url,
        last4: row.key_last4,
      });
    } catch (decErr) {
      // Skip corrupted keys gracefully
      console.error(`Gagal mendekripsi kunci untuk provider ${row.provider}:`, decErr);
    }
  }

  return keys;
}

/**
 * Fetches user key metadata (without plaintext keys) for display in client UI.
 */
export async function getUserKeyMetadataList(userId: string): Promise<UserApiKeyRecord[]> {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("user_api_keys")
    .select("user_id, provider, key_last4, base_url, status, last_checked_at, updated_at")
    .eq("user_id", userId);

  if (error || !data) {
    return [];
  }

  return data as UserApiKeyRecord[];
}

/**
 * Server-side gatekeeper enforcing BYOK policy:
 * 1. User must have at least 1 valid key to use AI features.
 * 2. User must possess a valid key for the specific model's provider.
 * Returns the resolved UserApiKeyInfo and availableKeys for failover.
 */
export async function resolveUserAiAccess(
  userId: string,
  modelId: string
): Promise<{ selectedKey: UserApiKeyInfo; availableKeys: UserApiKeyInfo[] }> {
  const availableKeys = await getUserAvailableKeys(userId);

  if (availableKeys.length === 0) {
    throw new AiError("AI_KEY_REQUIRED", {
      message:
        "Fitur AI membutuhkan minimal 1 kunci API aktif pada akun Anda. Silakan tambahkan API key di menu Pengaturan Profil.",
    });
  }

  const targetProvider = getProviderForModel(modelId);
  const matchingKey = availableKeys.find((k) => k.provider === targetProvider);

  if (!matchingKey) {
    const ownedProviders = availableKeys.map((k) => k.provider.toUpperCase()).join(", ");
    throw new AiError("AI_KEY_REQUIRED", {
      provider: targetProvider,
      message: `Model "${modelId}" membutuhkan kunci ${targetProvider.toUpperCase()}, namun akun Anda hanya memiliki kunci untuk [${ownedProviders}]. Silakan pilih model yang sesuai atau tambahkan kunci ${targetProvider.toUpperCase()} di Profil.`,
    });
  }

  return {
    selectedKey: matchingKey,
    availableKeys,
  };
}

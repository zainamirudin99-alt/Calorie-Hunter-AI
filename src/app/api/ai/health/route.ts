import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getUserAvailableKeys } from "@/lib/ai/user-keys";
import { getProviderForModel } from "@/lib/ai/registry";
import { testProviderApiKey } from "@/lib/ai/test-key";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const model = url.searchParams.get("model") || "gemini-3.8-flash";

  const envKeysStatus = {
    GEMINI_API_KEY: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 5),
    OPENAI_API_KEY: Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.length > 5),
    DEEPSEEK_API_KEY: Boolean(process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_API_KEY.length > 5),
    GROQ_API_KEY: Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.length > 5),
  };

  const supabase = createServerClient(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const targetProvider = getProviderForModel(model);

  if (!user) {
    // Check if server env key exists as fallback
    const envKeyMap: Record<string, string | undefined> = {
      gemini: process.env.GEMINI_API_KEY,
      google: process.env.GEMINI_API_KEY,
      openai: process.env.OPENAI_API_KEY,
      deepseek: process.env.DEEPSEEK_API_KEY,
      groq: process.env.GROQ_API_KEY,
    };
    const sKey = envKeyMap[targetProvider];
    if (sKey && sKey.length > 5) {
      return NextResponse.json({
        status: "online",
        available: true,
        model,
        provider: targetProvider,
        message: "Server environment key aktif (Siap digunakan).",
        env_keys_status: envKeysStatus,
      });
    }

    return NextResponse.json({
      status: "no_key",
      available: false,
      model,
      message: "Silakan login untuk memeriksa dan menggunakan kunci API Anda.",
      env_keys_status: envKeysStatus,
    });
  }

  const availableKeys = await getUserAvailableKeys(user.id);
  const matchingKey = availableKeys.find((k) => k.provider === targetProvider);

  if (!matchingKey) {
    // Fall back to server environment key if available
    const envKeyMap: Record<string, string | undefined> = {
      gemini: process.env.GEMINI_API_KEY,
      google: process.env.GEMINI_API_KEY,
      openai: process.env.OPENAI_API_KEY,
      deepseek: process.env.DEEPSEEK_API_KEY,
      groq: process.env.GROQ_API_KEY,
    };
    const sKey = envKeyMap[targetProvider];
    if (sKey && sKey.length > 5) {
      return NextResponse.json({
        status: "online",
        available: true,
        model,
        provider: targetProvider,
        last4: sKey.slice(-4),
        message: "Server environment key aktif & siap digunakan.",
        env_keys_status: envKeysStatus,
      });
    }

    const owned = availableKeys.map((k) => k.provider.toUpperCase()).join(", ");
    return NextResponse.json({
      status: "no_key",
      available: false,
      model,
      provider: targetProvider,
      message:
        availableKeys.length === 0
          ? `Kunci API untuk provider ${targetProvider.toUpperCase()} belum disetel. Tambahkan kunci di Pengaturan Profil.`
          : `Model "${model}" membutuhkan kunci ${targetProvider.toUpperCase()}, akun Anda hanya memiliki [${owned}].`,
      env_keys_status: envKeysStatus,
    });
  }

  // Live test using user's own encrypted key
  const testRes = await testProviderApiKey(
    targetProvider,
    matchingKey.key,
    matchingKey.baseUrl
  );

  return NextResponse.json({
    status: testRes.status === "valid" ? "online" : "error",
    available: testRes.status === "valid",
    model,
    provider: targetProvider,
    latency_ms: testRes.latencyMs,
    last4: matchingKey.last4,
    message: testRes.message,
    env_keys_status: envKeysStatus,
  });
}

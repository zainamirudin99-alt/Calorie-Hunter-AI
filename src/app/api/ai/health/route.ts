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

  const supabase = createServerClient(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({
      status: "no_key",
      available: false,
      model,
      message: "Silakan login untuk memeriksa dan menggunakan kunci API Anda.",
    });
  }

  const availableKeys = await getUserAvailableKeys(user.id);
  const targetProvider = getProviderForModel(model);
  const matchingKey = availableKeys.find((k) => k.provider === targetProvider);

  if (!matchingKey) {
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
  });
}

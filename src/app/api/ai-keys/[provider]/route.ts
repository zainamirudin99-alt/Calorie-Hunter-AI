import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { ProviderType } from "@/lib/ai/registry";
import { encryptApiKey } from "@/lib/ai/encryption";
import { validateCustomBaseUrl } from "@/lib/ai/user-keys";
import { testProviderApiKey } from "@/lib/ai/test-key";

export const runtime = "nodejs";

const VALID_PROVIDERS: ProviderType[] = ["gemini", "openai", "deepseek", "groq"];

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider: rawProvider } = await params;
  const provider = rawProvider.toLowerCase() as ProviderType;

  if (!VALID_PROVIDERS.includes(provider)) {
    return NextResponse.json({ error: `Provider "${rawProvider}" tidak valid.` }, { status: 400 });
  }

  const supabase = createServerClient(request);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Sesi tidak valid atau telah berakhir." }, { status: 401 });
  }

  let body: { apiKey?: string; baseUrl?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Format request body tidak valid." }, { status: 400 });
  }

  const { apiKey, baseUrl } = body;
  if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length < 4) {
    return NextResponse.json(
      { error: "Kunci API tidak boleh kosong atau terlalu pendek." },
      { status: 400 }
    );
  }

  const cleanKey = apiKey.trim();
  const cleanBaseUrl = baseUrl ? baseUrl.trim() : null;

  // Custom Base URL validation
  if (cleanBaseUrl) {
    if (provider !== "openai") {
      return NextResponse.json(
        { error: "Base URL kustom hanya diperbolehkan untuk slot OpenAI (GPT)." },
        { status: 400 }
      );
    }
    const val = validateCustomBaseUrl(cleanBaseUrl);
    if (!val.valid) {
      return NextResponse.json({ error: val.error }, { status: 400 });
    }
  }

  // Live connectivity test
  const testResult = await testProviderApiKey(provider, cleanKey, cleanBaseUrl);

  // Encrypt and store key
  const encryptedKey = encryptApiKey(cleanKey);
  const adminClient = createAdminClient();

  const { error: upsertError } = await adminClient.from("user_api_keys").upsert(
    {
      user_id: user.id,
      provider,
      key_enc: encryptedKey,
      key_version: 1,
      key_last4: cleanKey.slice(-4),
      base_url: cleanBaseUrl,
      status: testResult.status,
      last_checked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,provider" }
  );

  if (upsertError) {
    return NextResponse.json(
      { error: `Gagal menyimpan kunci: ${upsertError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    provider,
    status: testResult.status,
    last4: cleanKey.slice(-4),
    latencyMs: testResult.latencyMs,
    message: testResult.message,
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider: rawProvider } = await params;
  const provider = rawProvider.toLowerCase() as ProviderType;

  if (!VALID_PROVIDERS.includes(provider)) {
    return NextResponse.json({ error: `Provider "${rawProvider}" tidak valid.` }, { status: 400 });
  }

  const supabase = createServerClient(request);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Sesi tidak valid atau telah berakhir." }, { status: 401 });
  }

  const adminClient = createAdminClient();
  const { error: deleteError } = await adminClient
    .from("user_api_keys")
    .delete()
    .eq("user_id", user.id)
    .eq("provider", provider);

  if (deleteError) {
    return NextResponse.json(
      { error: `Gagal menghapus kunci: ${deleteError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    provider,
    message: `Kunci untuk provider ${provider} berhasil dihapus.`,
  });
}

import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { ProviderType } from "@/lib/ai/registry";
import { decryptApiKey } from "@/lib/ai/encryption";
import { testProviderApiKey } from "@/lib/ai/test-key";

export const runtime = "nodejs";

const VALID_PROVIDERS: ProviderType[] = ["gemini", "openai", "deepseek", "groq"];

export async function POST(
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

  // Parse optional body (if user wants to test a key before saving)
  let body: { apiKey?: string; baseUrl?: string | null } = {};
  try {
    body = await request.json();
  } catch {
    // Body is optional
  }

  let testKey = body.apiKey?.trim();
  let testBaseUrl = body.baseUrl?.trim() || null;

  const adminClient = createAdminClient();

  // If no key in body, load from database
  if (!testKey) {
    const { data: dbRow, error: dbError } = await adminClient
      .from("user_api_keys")
      .select("key_enc, base_url")
      .eq("user_id", user.id)
      .eq("provider", provider)
      .maybeSingle();

    if (dbError || !dbRow) {
      return NextResponse.json(
        { error: `Belum ada kunci API ${provider} yang tersimpan untuk dites.` },
        { status: 404 }
      );
    }

    try {
      testKey = decryptApiKey(dbRow.key_enc);
      testBaseUrl = dbRow.base_url;
    } catch {
      return NextResponse.json(
        { error: "Gagal mendekripsi kunci dari penyimpanan database." },
        { status: 500 }
      );
    }
  }

  const testResult = await testProviderApiKey(provider, testKey, testBaseUrl);

  // Update status in database
  await adminClient
    .from("user_api_keys")
    .update({
      status: testResult.status,
      last_checked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .eq("provider", provider);

  return NextResponse.json({
    success: testResult.success,
    status: testResult.status,
    latencyMs: testResult.latencyMs,
    message: testResult.message,
  });
}

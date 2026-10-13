import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getUserKeyMetadataList } from "@/lib/ai/user-keys";
import { ProviderType, AI_PROVIDERS } from "@/lib/ai/registry";

export const runtime = "nodejs";

const ALL_SLOTS: ProviderType[] = ["gemini", "openai", "deepseek", "groq"];

export async function GET(request: NextRequest) {
  const supabase = createServerClient(request);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Sesi tidak valid atau telah berakhir." }, { status: 401 });
  }

  const records = await getUserKeyMetadataList(user.id);

  // Map to include all 4 slots consistently
  const slots = ALL_SLOTS.map((provider) => {
    const existing = records.find((r) => r.provider === provider);
    const def = AI_PROVIDERS[provider];
    if (existing) {
      return {
        provider,
        name: def.name,
        hasKey: true,
        last4: existing.key_last4,
        baseUrl: existing.base_url,
        status: existing.status,
        lastCheckedAt: existing.last_checked_at,
        updatedAt: existing.updated_at,
      };
    }
    return {
      provider,
      name: def.name,
      hasKey: false,
      last4: null,
      baseUrl: null,
      status: "unconfigured",
      lastCheckedAt: null,
      updatedAt: null,
    };
  });

  return NextResponse.json({ keys: slots });
}

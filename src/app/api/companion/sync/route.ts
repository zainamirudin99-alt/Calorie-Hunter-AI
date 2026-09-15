import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const supabase = createServerClient(req);
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ authenticated: false, companion: null });
    }

    const companion = user.user_metadata?.companion || null;
    return NextResponse.json({ authenticated: true, companion });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = createServerClient(req);
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { character_name, avatar_url, character_description } = body;

    const companionData = {
      character_name: String(character_name || "").trim() || "TITAN PROTO-GODZILLA",
      avatar_url: avatar_url || null,
      character_description: character_description || null,
      updated_at: new Date().toISOString(),
    };

    const admin = createAdminClient();
    const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        companion: companionData,
      },
    });

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Companion visual and attributes synced to cloud profile",
      companion: companionData,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

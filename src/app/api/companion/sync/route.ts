import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const supabase = createServerClient(req);
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ authenticated: false, companion: null });
    }

    const admin = createAdminClient();
    let companion = user.user_metadata?.companion || null;

    // Fetch authoritative user from DB to bypass stale JWT claims on other devices
    try {
      const { data: dbUser } = await admin.auth.admin.getUserById(user.id);
      if (dbUser?.user?.user_metadata?.companion) {
        companion = dbUser.user.user_metadata.companion;
      }
    } catch {}

    // Check profiles table fallback
    if (!companion) {
      try {
        const { data: profile } = await admin
          .from("profiles")
          .select("avatar_url, companion_data")
          .eq("id", user.id)
          .maybeSingle();

        if (profile?.companion_data) {
          companion = profile.companion_data;
        } else if (profile?.avatar_url) {
          companion = {
            character_name: "TITAN PROTO-GODZILLA",
            avatar_url: profile.avatar_url,
          };
        }
      } catch {}
    }

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

    let finalAvatarUrl = avatar_url || null;
    const admin = createAdminClient();

    // If avatar_url is a heavy base64 string, upload to Supabase storage to keep JWT & user_metadata lightweight
    if (avatar_url && typeof avatar_url === "string" && avatar_url.startsWith("data:image/")) {
      try {
        const base64Data = avatar_url.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        const filePath = `companions/${user.id}-${Date.now()}.jpg`;

        const { error: uploadError } = await admin.storage
          .from("food-photos")
          .upload(filePath, buffer, {
            contentType: "image/jpeg",
            upsert: true,
          });

        if (!uploadError) {
          const { data: publicData } = admin.storage
            .from("food-photos")
            .getPublicUrl(filePath);

          if (publicData?.publicUrl) {
            finalAvatarUrl = publicData.publicUrl;
          }
        }
      } catch (uploadEx: any) {
        console.warn("[Companion Sync] Storage upload warning:", uploadEx.message);
      }
    }

    const companionData = {
      character_name: String(character_name || "").trim() || "TITAN PROTO-GODZILLA",
      avatar_url: finalAvatarUrl,
      character_description: character_description || null,
      updated_at: new Date().toISOString(),
    };

    // 1. Update user_metadata in auth.users
    const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        companion: companionData,
      },
    });

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 2. Also try updating profiles table if columns exist
    try {
      await admin
        .from("profiles")
        .update({
          avatar_url: finalAvatarUrl,
          companion_data: companionData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
    } catch {}

    return NextResponse.json({
      success: true,
      message: "Companion visual and attributes synced to cloud profile",
      companion: companionData,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

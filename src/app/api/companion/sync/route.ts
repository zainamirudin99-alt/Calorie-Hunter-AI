import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Ensures any private Supabase storage path (e.g. food-photos bucket) is properly
 * signed for 10 years so it renders without 400/403 errors on all devices.
 */
async function resolveSafeAvatarUrl(admin: any, rawUrl: string | null): Promise<string | null> {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  // Base64 data URLs are self-contained and always render
  if (rawUrl.startsWith("data:image/")) return rawUrl;

  // Convert broken public URL or raw path from private food-photos bucket to long-lived Signed URL
  if (
    rawUrl.includes("/storage/v1/object/public/food-photos/") ||
    (rawUrl.includes("food-photos") && !rawUrl.includes("token="))
  ) {
    try {
      const match = rawUrl.match(/food-photos\/(.+?)(?:\?|$)/);
      if (match && match[1]) {
        const storagePath = decodeURIComponent(match[1]);
        const { data: signedData, error: signError } = await admin.storage
          .from("food-photos")
          .createSignedUrl(storagePath, 60 * 60 * 24 * 365 * 10);
        if (!signError && signedData?.signedUrl) {
          return signedData.signedUrl;
        }
      }
    } catch {}
  }

  return rawUrl;
}

export async function GET(req: Request) {
  try {
    const supabase = createServerClient(req);
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { authenticated: false, companion: null },
        { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
      );
    }

    const admin = createAdminClient();
    let companion: any = null;

    // 1. Prioritize profiles table as primary cloud single source of truth
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

    // 2. Fallback to auth.users user_metadata if profile column empty
    if (!companion) {
      try {
        const { data: dbUser } = await admin.auth.admin.getUserById(user.id);
        if (dbUser?.user?.user_metadata?.companion) {
          companion = dbUser.user.user_metadata.companion;
        }
      } catch {}
    }

    if (!companion && user.user_metadata?.companion) {
      companion = user.user_metadata.companion;
    }

    // Repair broken public storage URLs on the fly
    if (companion?.avatar_url) {
      const safeUrl = await resolveSafeAvatarUrl(admin, companion.avatar_url);
      if (safeUrl && safeUrl !== companion.avatar_url) {
        companion.avatar_url = safeUrl;
        // Background repair in profiles table
        admin
          .from("profiles")
          .update({
            avatar_url: safeUrl,
            companion_data: companion,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id)
          .then(() => {});
      }
    }

    return NextResponse.json(
      { authenticated: true, companion },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
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

    // If avatar_url is a base64 string, upload to storage and generate long-lived Signed URL
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
          // Generate long-lived Signed URL (10 years) because food-photos is private
          const { data: signedData, error: signError } = await admin.storage
            .from("food-photos")
            .createSignedUrl(filePath, 60 * 60 * 24 * 365 * 10);

          if (!signError && signedData?.signedUrl) {
            finalAvatarUrl = signedData.signedUrl;
          }
        }
      } catch (uploadEx: any) {
        console.warn("[Companion Sync] Storage upload warning:", uploadEx.message);
      }
      // If storage signed URL wasn't generated, finalAvatarUrl stays as the Base64 Data URL,
      // which is guaranteed to render 100% of the time.
    } else if (finalAvatarUrl) {
      // If client sent an existing URL, ensure it's safe and signed
      finalAvatarUrl = await resolveSafeAvatarUrl(admin, finalAvatarUrl);
    }

    const companionData = {
      character_name: String(character_name || "").trim() || "TITAN PROTO-GODZILLA",
      avatar_url: finalAvatarUrl,
      character_description: character_description || null,
      updated_at: new Date().toISOString(),
    };

    // 1. Update user_metadata in auth.users (keep JWT small if avatar is heavy base64)
    try {
      const isBase64 = typeof finalAvatarUrl === "string" && finalAvatarUrl.startsWith("data:image/");
      await admin.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...user.user_metadata,
          companion: {
            ...companionData,
            avatar_url: isBase64 ? null : finalAvatarUrl,
          },
        },
      });
    } catch (metaErr: any) {
      console.warn("[Companion Sync] user_metadata warning:", metaErr.message);
    }

    // 2. Primary cloud storage: profiles table JSONB (can easily store full base64 or signed URL)
    try {
      await admin
        .from("profiles")
        .update({
          avatar_url: finalAvatarUrl,
          companion_data: companionData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
    } catch (dbErr: any) {
      console.warn("[Companion Sync] profiles update warning:", dbErr.message);
    }

    return NextResponse.json({
      success: true,
      message: "Companion visual and attributes synced to cloud profile",
      companion: companionData,
    }, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" }
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  }
}

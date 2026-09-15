import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const supabase = createServerClient(req);
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { authenticated: false, message: "Belum login atau sesi telah kedaluwarsa" },
        { status: 401 }
      );
    }

    // Use admin client to reliably fetch user profile without RLS permission blockage
    const admin = createAdminClient();

    // Fetch authoritative user from DB to bypass stale JWT claims on other devices (e.g. mobile vs desktop)
    let freshUser = user;
    try {
      const { data: dbUser } = await admin.auth.admin.getUserById(user.id);
      if (dbUser?.user) {
        freshUser = dbUser.user;
      }
    } catch {}

    const { data: profile } = await admin
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    // Fetch active program
    const { data: program } = await admin
      .from("programs")
      .select("id, program_type, target_daily_kcal, start_date, end_date, status")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    const emailUsername = user.email ? user.email.split("@")[0] : "";
    const username = (profile?.username || freshUser.user_metadata?.username || emailUsername || "").trim().toLowerCase();
    const isAdmin = username === "zainamrdn99";

    const hasProfile = Boolean(
      profile && 
      profile.gender && 
      profile.height_cm && 
      profile.weight_kg && 
      profile.age
    );

    const hasProgram = Boolean(program && program.id);

    // Resolve freshest companion data from auth metadata or profile table
    const companion = 
      freshUser.user_metadata?.companion || 
      user.user_metadata?.companion || 
      (profile as any)?.companion_data || 
      ((profile as any)?.avatar_url ? { character_name: "TITAN PROTO-GODZILLA", avatar_url: (profile as any).avatar_url } : null);

    return NextResponse.json({
      authenticated: true,
      user_id: user.id,
      username,
      isAdmin,
      has_profile: hasProfile,
      has_program: hasProgram,
      profile: profile || null,
      program: program || null,
      companion,
      preferred_gemini_model: profile?.preferred_gemini_model || "gemini-2.5-flash",
    });
  } catch (error: any) {
    return NextResponse.json(
      { authenticated: false, error: error.message },
      { status: 500 }
    );
  }
}

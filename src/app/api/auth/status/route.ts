import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

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

    // Fetch user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    // Fetch active program
    const { data: program } = await supabase
      .from("programs")
      .select("id, program_type, target_daily_kcal, start_date, end_date, status")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    const username = (profile?.username || user.user_metadata?.username || "").trim().toLowerCase();
    const isAdmin = username === "zainamrdn99";

    const hasProfile = Boolean(
      profile && 
      profile.gender && 
      profile.height_cm && 
      profile.weight_kg && 
      profile.age
    );

    const hasProgram = Boolean(program && program.id);

    return NextResponse.json({
      authenticated: true,
      user_id: user.id,
      username,
      isAdmin,
      has_profile: hasProfile,
      has_program: hasProgram,
      profile: profile || null,
      program: program || null,
      preferred_gemini_model: profile?.preferred_gemini_model || "gemini-3.8-flash",
    });
  } catch (error: any) {
    return NextResponse.json(
      { authenticated: false, error: error.message },
      { status: 500 }
    );
  }
}

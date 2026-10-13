import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { calculateTDEE } from "@/lib/tdee/calculator";
import { ProgramType } from "@/types/database";

const profileSchema = z.object({
  full_name: z.string().optional(),
  gender: z.enum(["male", "female"], {
    errorMap: () => ({ message: "Pilih jenis kelamin pria atau wanita" }),
  }),
  age: z.number().int().min(10, "Usia minimal 10 tahun").max(100, "Usia maksimal 100 tahun"),
  height_cm: z.number().positive("Tinggi badan harus lebih dari 0"),
  weight_kg: z.number().positive("Berat badan harus lebih dari 0"),
  activity_level: z.enum(["sedentary", "light", "moderate", "active", "very_active"], {
    errorMap: () => ({ message: "Pilih level aktivitas fisik yang valid" }),
  }),
  preferred_gemini_model: z.string().optional(),
});

export async function GET(req: Request) {
  try {
    const supabase = createServerClient(req);
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: profile, error } = await admin
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ profile });
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
    const parseResult = profileSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const profileData = parseResult.data;

    const admin = createAdminClient();

    // 1. Fetch existing profile to preserve existing username or formulate fallback
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id, username")
      .eq("id", user.id)
      .maybeSingle();

    const emailUsername = user.email ? user.email.split("@")[0] : null;
    const fallbackUsername = 
      existingProfile?.username || 
      user.user_metadata?.username || 
      emailUsername || 
      `hunter_${user.id.slice(0, 8)}`;

    const upsertPayload: Record<string, any> = {
      id: user.id,
      username: fallbackUsername,
      full_name: profileData.full_name || null,
      gender: profileData.gender,
      age: profileData.age,
      height_cm: profileData.height_cm,
      weight_kg: profileData.weight_kg,
      activity_level: profileData.activity_level,
      updated_at: new Date().toISOString(),
    };

    let updatedProfile = null;
    const { data: upsertData, error: upsertError } = await admin
      .from("profiles")
      .upsert(upsertPayload)
      .select()
      .maybeSingle();

    if (upsertError) {
      // Secondary fallback: direct update matching user id
      const { data: updateData, error: updateError } = await admin
        .from("profiles")
        .update({
          full_name: profileData.full_name || null,
          gender: profileData.gender,
          age: profileData.age,
          height_cm: profileData.height_cm,
          weight_kg: profileData.weight_kg,
          activity_level: profileData.activity_level,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)
        .select()
        .maybeSingle();

      if (updateError) {
        return NextResponse.json({ error: upsertError.message || updateError.message }, { status: 500 });
      }
      updatedProfile = updateData;
    } else {
      updatedProfile = upsertData;
    }

    // 2. Automatically record weight log entry
    try {
      await admin.from("weight_logs").insert({
        user_id: user.id,
        weight_kg: profileData.weight_kg,
        note: "Pembaruan biometrik profil hunter",
        logged_at: new Date().toISOString(),
      });
    } catch {}

    // 3. Recalculate any active program target daily kcal & tdee base
    try {
      const { data: activeProgram } = await admin
        .from("programs")
        .select("id, program_type")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (activeProgram) {
        const tdeeRes = calculateTDEE({
          weight_kg: profileData.weight_kg,
          height_cm: profileData.height_cm,
          age: profileData.age,
          gender: profileData.gender,
          activity_level: profileData.activity_level,
        });

        const newTarget = tdeeRes.targets[activeProgram.program_type as ProgramType] || tdeeRes.tdee;
        await admin
          .from("programs")
          .update({
            tdee_base: tdeeRes.tdee,
            target_daily_kcal: newTarget,
            updated_at: new Date().toISOString(),
          })
          .eq("id", activeProgram.id);
      }
    } catch {}

    return NextResponse.json({
      success: true,
      message: "Profil biometrik berhasil diperbarui",
      profile: updatedProfile,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


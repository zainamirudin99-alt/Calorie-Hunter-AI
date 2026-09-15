import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { calculateTDEE } from "@/lib/tdee/calculator";
import { ProgramType } from "@/types/database";

const programSchema = z.object({
  program_type: z.enum([
    "cutting",
    "bulking",
    "maintenance",
    "weight_loss",
    "loss_fat",
    "loss_fat_build_muscle",
    "gain_mass",
    "gain_mass_build_muscle",
    "lean_mass",
  ], {
    errorMap: () => ({ message: "Tipe program harus salah satu dari 6 program tactical hunter" }),
  }),
});

export async function GET(req: Request) {
  try {
    const supabase = createServerClient(req);
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: program, error } = await admin
      .from("programs")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ program });
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
    const parseResult = programSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { program_type } = parseResult.data;

    // Fetch user profile using admin client to calculate accurate TDEE without RLS blocking
    const admin = createAdminClient();
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile || !profile.weight_kg || !profile.height_cm || !profile.age || !profile.gender) {
      return NextResponse.json(
        { error: "Data profil belum lengkap. Silakan lengkapi profil biometrik Anda terlebih dahulu." },
        { status: 400 }
      );
    }

    // Deterministic TDEE calculation
    const tdeeResult = calculateTDEE({
      weight_kg: Number(profile.weight_kg),
      height_cm: Number(profile.height_cm),
      age: Number(profile.age),
      gender: profile.gender,
      activity_level: profile.activity_level || "moderate",
    });

    const targetKcal = tdeeResult.targets[program_type] || tdeeResult.targets.cutting;

    // Invariant: Mark existing active programs as superseded
    await admin
      .from("programs")
      .update({ status: "superseded" })
      .eq("user_id", user.id)
      .eq("status", "active");

    const startDate = new Date();
    // 6 months = 180 days
    const endDate = new Date(startDate.getTime() + 180 * 24 * 60 * 60 * 1000);

    // Insert new active program (try exact program_type first)
    let newProgram: any = null;
    let insertErr: any = null;

    const res1 = await admin
      .from("programs")
      .insert({
        user_id: user.id,
        tdee_base: tdeeResult.tdee,
        program_type,
        target_daily_kcal: targetKcal,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        status: "active",
      })
      .select()
      .maybeSingle();

    if (res1.error) {
      // Check constraint fallback: If DB schema check constraint only allows ('cutting', 'bulking', 'maintenance')
      let baseCategory: "cutting" | "bulking" | "maintenance" = "cutting";
      if (program_type.includes("gain") || program_type === "bulking") {
        baseCategory = "bulking";
      } else if (program_type === "lean_mass" || program_type === "maintenance") {
        baseCategory = "maintenance";
      } else {
        baseCategory = "cutting";
      }

      const res2 = await admin
        .from("programs")
        .insert({
          user_id: user.id,
          tdee_base: tdeeResult.tdee,
          program_type: baseCategory,
          target_daily_kcal: targetKcal,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          status: "active",
        })
        .select()
        .maybeSingle();

      if (res2.error) {
        return NextResponse.json({ error: res2.error.message }, { status: 500 });
      }
      newProgram = { ...res2.data, program_type }; // preserve exact client program_type
    } else {
      newProgram = res1.data;
    }

    return NextResponse.json({
      success: true,
      message: `Program ${program_type.toUpperCase()} (${targetKcal} kcal) aktif untuk 180 hari ke depan!`,
      program: newProgram,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

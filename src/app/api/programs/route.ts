import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { calculateTDEE } from "@/lib/tdee/calculator";
import { ProgramType } from "@/types/database";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
    const startDate = new Date();
    // 6 months = 180 days
    const endDate = new Date(startDate.getTime() + 180 * 24 * 60 * 60 * 1000);

    let newProgram: any = null;

    // 1. Try atomic transition via Postgres RPC switch_active_program
    try {
      const { data: rpcData, error: rpcError } = await admin.rpc("switch_active_program", {
        p_user_id: user.id,
        p_tdee_base: tdeeResult.tdee,
        p_program_type: program_type,
        p_target_daily_kcal: targetKcal,
        p_start_date: startDate.toISOString(),
        p_end_date: endDate.toISOString(),
      });

      if (!rpcError && rpcData) {
        newProgram = rpcData;
      }
    } catch {
      // Fall through to atomic application layer handling
    }

    // 2. Application-layer transition with partial unique index conflict safety
    if (!newProgram) {
      await admin
        .from("programs")
        .update({ status: "superseded" })
        .eq("user_id", user.id)
        .eq("status", "active");

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
        // If conflict on idx_single_active_program_per_user (Postgres error 23505),
        // another concurrent request already activated a program. Query and return it!
        if (res1.error.code === "23505" || res1.error.message?.includes("idx_single_active_program_per_user")) {
          const { data: winningProgram } = await admin
            .from("programs")
            .select("*")
            .eq("user_id", user.id)
            .eq("status", "active")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (winningProgram) {
            newProgram = winningProgram;
          }
        }

        if (!newProgram) {
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
            // Check if concurrent insert succeeded
            const { data: activeProg } = await admin
              .from("programs")
              .select("*")
              .eq("user_id", user.id)
              .eq("status", "active")
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            if (activeProg) {
              newProgram = activeProg;
            } else {
              return NextResponse.json({ error: res2.error.message }, { status: 500 });
            }
          } else {
            newProgram = { ...res2.data, program_type };
          }
        }
      } else {
        newProgram = res1.data;
      }
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

import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { calculateBurnedCalories, findSportById } from "@/lib/workouts/sports";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const createWorkoutSchema = z.object({
  sport_category: z.enum([
    "gym",
    "cardio",
    "racket",
    "team_sports",
    "combat_water",
    "flexibility_hiit",
    "other",
  ]),
  sport_name: z.string().min(1, "Nama olahraga wajib diisi"),
  met_value: z.number().positive("Nilai MET harus lebih dari 0"),
  duration_minutes: z.number().int().positive("Durasi olahraga minimal 1 menit"),
  intensity: z.enum(["low", "moderate", "high"]).default("moderate"),
  logged_date: z.string().optional(),
  notes: z.string().optional().nullable(),
});

export async function GET(req: Request) {
  try {
    const supabase = createServerClient(req);
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const dateParam = url.searchParams.get("date"); // e.g. YYYY-MM-DD

    const admin = createAdminClient();
    let query = admin
      .from("workout_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (dateParam) {
      query = query.eq("logged_date", dateParam);
    } else {
      query = query.limit(50);
    }

    const { data: workouts, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Compute total calories burned for the queried set
    const totalBurnedKcal = (workouts || []).reduce(
      (sum, item) => sum + (Number(item.calories_burned) || 0),
      0
    );

    const totalDurationMinutes = (workouts || []).reduce(
      (sum, item) => sum + (Number(item.duration_minutes) || 0),
      0
    );

    return NextResponse.json({
      success: true,
      workouts: workouts || [],
      total_burned_kcal: totalBurnedKcal,
      total_duration_minutes: totalDurationMinutes,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = createServerClient(req);
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parseResult = createWorkoutSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const data = parseResult.data;
    const admin = createAdminClient();

    // Fetch user profile to get exact current weight for precision calculation
    const { data: profile } = await admin
      .from("profiles")
      .select("weight_kg")
      .eq("id", user.id)
      .maybeSingle();

    const userWeight = Number(profile?.weight_kg) || 75;

    // Calculate exact calories burned using MET formula
    const caloriesBurned = calculateBurnedCalories({
      met: data.met_value,
      weightKg: userWeight,
      durationMinutes: data.duration_minutes,
      intensity: data.intensity,
    });

    const targetDate = data.logged_date || new Date().toISOString().split("T")[0];

    const { data: newWorkout, error: insertError } = await admin
      .from("workout_logs")
      .insert({
        user_id: user.id,
        sport_category: data.sport_category,
        sport_name: data.sport_name,
        met_value: data.met_value,
        duration_minutes: data.duration_minutes,
        calories_burned: caloriesBurned,
        intensity: data.intensity,
        logged_date: targetDate,
        notes: data.notes || null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil mencatat latihan ${data.sport_name} (-${caloriesBurned} kcal)!`,
      workout: newWorkout,
      calories_burned: caloriesBurned,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = createServerClient(req);
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID latihan tidak valid" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error: deleteError } = await admin
      .from("workout_logs")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Log latihan berhasil dihapus",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

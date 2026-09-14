import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const supabase = createServerClient(req);
    const { data: { user } } = await supabase.auth.getUser();

    // Default telemetry values (matching the tactical HUD design theme)
    let dailyTargetKcal = 1950;
    let tdeeKcal = 2450;
    let weightTrend = [
      { week: "MG 1", weight: 82.0 },
      { week: "MG 2", weight: 81.2 },
      { week: "MG 3", weight: 80.5 },
      { week: "MG 4", weight: 79.8 },
      { week: "MG 5", weight: 79.1 },
      { week: "MG 6", weight: 78.4 },
    ];
    let dailyHistory = [
      { day: "SEN", calories: 1890, target: 1950 },
      { day: "SEL", calories: 1940, target: 1950 },
      { day: "RAB", calories: 1780, target: 1950 },
      { day: "KAM", calories: 1960, target: 1950 },
      { day: "JUM", calories: 1820, target: 1950 },
      { day: "SAB", calories: 2050, target: 1950 },
      { day: "HARI INI", calories: 1420, target: 1950 },
    ];
    let weeklyMacros = {
      protein_g: 1015,
      carbs_g: 1120,
      fat_g: 294,
      protein_pct: 38,
      carbs_pct: 42,
      fat_pct: 20,
    };
    let programStatus = {
      isExpired: false,
      daysRemaining: 138,
      totalDays: 180,
      type: "cutting",
    };

    if (user) {
      // Fetch active program
      const { data: program } = await supabase
        .from("programs")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (program) {
        dailyTargetKcal = Number(program.target_daily_kcal);
        tdeeKcal = Number(program.tdee_base);

        const endDate = new Date(program.end_date).getTime();
        const now = Date.now();
        const diffDays = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
        programStatus = {
          isExpired: diffDays <= 0,
          daysRemaining: Math.max(0, diffDays),
          totalDays: 180,
          type: program.program_type,
        };
      }

      // Fetch weight logs
      const { data: logs } = await supabase
        .from("weight_logs")
        .select("weight_kg, logged_at")
        .eq("user_id", user.id)
        .order("logged_at", { ascending: true })
        .limit(10);

      if (logs && logs.length > 1) {
        weightTrend = logs.map((log, i) => ({
          week: `LOG ${i + 1}`,
          weight: Number(log.weight_kg),
        }));
      }
    }

    return NextResponse.json({
      success: true,
      daily_target_kcal: dailyTargetKcal,
      tdee_kcal: tdeeKcal,
      daily_history: dailyHistory,
      weight_trend: weightTrend,
      weekly_macros: weeklyMacros,
      program_status: programStatus,
      today_consumed_kcal: 1420,
      today_remaining_kcal: Math.max(0, dailyTargetKcal - 1420),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

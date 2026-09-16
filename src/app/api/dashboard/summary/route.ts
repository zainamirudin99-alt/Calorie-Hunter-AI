import { NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { calculateRemainingCalories, calculateReassessmentStatus } from "@/lib/tdee/calculator";
import { getStandardWibDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const supabase = createServerClient(req);
    const { data: { user } } = await supabase.auth.getUser();

    // Default telemetry values (clean initial baseline)
    let dailyTargetKcal = 1950;
    let tdeeKcal = 2450;
    let weightTrend: { week: string; weight: number }[] = [];
    let todayConsumedKcal = 0;
    let todayFoodItems: any[] = [];
    let weeklyMacros = {
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      protein_pct: 0,
      carbs_pct: 0,
      fat_pct: 0,
    };
    let programStatus = {
      isExpired: false,
      daysRemaining: 180,
      totalDays: 180,
      type: "cutting",
    };

    const daysOfWeek = ["MIN", "SEN", "SEL", "RAB", "KAM", "JUM", "SAB"];
    const now = new Date();
    
    // Construct 7-day history skeleton
    const dailyHistory = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(now.getDate() - (6 - i));
      const dayLabel = i === 6 ? "HARI INI" : daysOfWeek[d.getDay()];
      return {
        day: dayLabel,
        dateStr: d.toISOString().split("T")[0],
        calories: 0,
        target: dailyTargetKcal,
      };
    });

    if (!user) {
      return NextResponse.json(
        { authenticated: false, message: "Belum login atau sesi telah kedaluwarsa" },
        { status: 401 }
      );
    }

    const admin = createAdminClient();

    // 0. Fetch user profile
    const { data: profile } = await admin
      .from("profiles")
      .select("full_name, username, avatar_url, companion_data, weight_kg, height_cm, age, gender, activity_level")
      .eq("id", user.id)
      .maybeSingle();

    // 1. Fetch active program
    const { data: program } = await admin
      .from("programs")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    let todayMealPlanSummary: any = null;

    if (program) {
      dailyTargetKcal = Number(program.target_daily_kcal);
      tdeeKcal = Number(program.tdee_base);

      const reassessment = calculateReassessmentStatus(program.start_date, program.end_date);
      programStatus = {
        isExpired: reassessment.isExpired,
        daysRemaining: reassessment.daysRemaining,
        totalDays: reassessment.totalDays,
        type: program.program_type,
      };

      // Update target in history
      dailyHistory.forEach((item) => {
        item.target = dailyTargetKcal;
      });

      // Fetch today's meal plan summary in the same round-trip
      const { data: mealPlanRow } = await admin
        .from("meal_plans")
        .select("plan_json")
        .eq("program_id", program.id)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (mealPlanRow?.plan_json?.days && Array.isArray(mealPlanRow.plan_json.days)) {
        const wibDayIdx = new Date(now.getTime() + 7 * 60 * 60 * 1000).getDay();
        const targetDayNum = wibDayIdx === 0 ? 7 : wibDayIdx;
        const matchedDay = mealPlanRow.plan_json.days.find((d: any) => d.day_number === targetDayNum) || mealPlanRow.plan_json.days[0];
        if (matchedDay) {
          todayMealPlanSummary = {
            has_meal_plan: true,
            day_name: matchedDay.day_name,
            total_day_kcal: matchedDay.total_day_kcal,
            meals: matchedDay.meals || [],
          };
        }
      }
    }

      // 2. Fetch weight logs
      const { data: logs } = await admin
        .from("weight_logs")
        .select("weight_kg, logged_at")
        .eq("user_id", user.id)
        .order("logged_at", { ascending: true })
        .limit(10);

      if (logs && logs.length > 0) {
        weightTrend = logs.map((log, i) => ({
          week: `LOG ${i + 1}`,
          weight: Number(log.weight_kg),
        }));
      }

      // 3. Fetch past 7 days food logs to populate dailyHistory and todayFoodItems
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      let foodLogsRes: any = await admin
        .from("food_logs")
        .select("id, logged_at, total_kcal, ai_response_json, food_log_items(*)")
        .eq("user_id", user.id)
        .gte("logged_at", sevenDaysAgo.toISOString())
        .order("logged_at", { ascending: true });

      if (foodLogsRes.error && foodLogsRes.error.message?.includes("logged_at")) {
        foodLogsRes = await admin
          .from("food_logs")
          .select("id, created_at, total_kcal, ai_response_json, food_log_items(*)")
          .eq("user_id", user.id)
          .gte("created_at", sevenDaysAgo.toISOString())
          .order("created_at", { ascending: true });
      }

      const foodLogs = foodLogsRes.data;

      const todayStrUtc = now.toISOString().split("T")[0];
      const todayStrWib = getStandardWibDate(now);

      let totalProteinG = 0;
      let totalCarbsG = 0;
      let totalFatG = 0;

      if (foodLogs && Array.isArray(foodLogs)) {
        for (const log of foodLogs) {
          const timestamp = log.logged_at || log.created_at || "";
          const logDateUtc = timestamp ? timestamp.split("T")[0] : "";
          const dateObj = timestamp ? new Date(timestamp) : null;
          const logDateWib = dateObj ? new Date(dateObj.getTime() + 7 * 60 * 60 * 1000).toISOString().split("T")[0] : "";
          const logKcal = Number(log.total_kcal) || 0;

          // Add to dailyHistory if matching date
          const histItem = dailyHistory.find((h) => h.dateStr === logDateUtc || h.dateStr === logDateWib);
          if (histItem) {
            histItem.calories += logKcal;
          }

          // Process today's items (support UTC or WIB date matching)
          const isToday = logDateUtc === todayStrUtc || logDateWib === todayStrWib || logDateUtc === todayStrWib;
          if (isToday) {
            todayConsumedKcal += logKcal;

            const timeStr = timestamp
              ? new Date(timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB"
              : "12:00 WIB";

            if (Array.isArray(log.food_log_items) && log.food_log_items.length > 0) {
              for (const item of log.food_log_items) {
                const itemProtein = Number(item.protein_g) || 0;
                const itemCarbs = Number(item.carbs_g) || 0;
                const itemFat = Number(item.fat_g) || 0;
                totalProteinG += itemProtein;
                totalCarbsG += itemCarbs;
                totalFatG += itemFat;

                todayFoodItems.push({
                  id: item.id || `item-${Math.random()}`,
                  food_name: item.food_name,
                  estimated_weight_g: Number(item.weight_g) || 100,
                  calories_kcal: Number(item.calories_kcal) || 0,
                  time_logged: timeStr,
                  meal_slot: "Ransum Tempur",
                  macros: {
                    carbs_g: itemCarbs,
                    protein_g: itemProtein,
                    fat_g: itemFat,
                  },
                });
              }
            } else if (log.ai_response_json?.items && Array.isArray(log.ai_response_json.items)) {
              for (const item of log.ai_response_json.items) {
                const itemProtein = Number(item.macros?.protein_g) || 0;
                const itemCarbs = Number(item.macros?.carbs_g) || 0;
                const itemFat = Number(item.macros?.fat_g) || 0;
                totalProteinG += itemProtein;
                totalCarbsG += itemCarbs;
                totalFatG += itemFat;

                todayFoodItems.push({
                  id: item.id || `item-${Math.random()}`,
                  food_name: item.food_name,
                  estimated_weight_g: Number(item.estimated_weight_g) || 100,
                  calories_kcal: Number(item.calories_kcal) || 0,
                  time_logged: timeStr,
                  meal_slot: "Ransum Tempur",
                  macros: {
                    carbs_g: itemCarbs,
                    protein_g: itemProtein,
                    fat_g: itemFat,
                  },
                });
              }
            }
          }
        }
      }

      // Calculate weekly macro percentages if consumed
      const totalMacroWeight = totalProteinG + totalCarbsG + totalFatG;
      if (totalMacroWeight > 0) {
        weeklyMacros = {
          protein_g: Math.round(totalProteinG),
          carbs_g: Math.round(totalCarbsG),
          fat_g: Math.round(totalFatG),
          protein_pct: Math.round((totalProteinG / totalMacroWeight) * 100),
          carbs_pct: Math.round((totalCarbsG / totalMacroWeight) * 100),
          fat_pct: Math.round((totalFatG / totalMacroWeight) * 100),
        };
      }

    return NextResponse.json({
      success: true,
      authenticated: true,
      has_profile: Boolean(profile?.weight_kg && profile?.height_cm && profile?.age && profile?.gender),
      has_program: Boolean(program),
      profile: profile || null,
      program: program || null,
      companion: profile?.companion_data || (profile?.avatar_url ? { avatar_url: profile.avatar_url, character_name: profile.username } : null),
      daily_target_kcal: dailyTargetKcal,
      tdee_kcal: tdeeKcal,
      daily_history: dailyHistory,
      weight_trend: weightTrend,
      weekly_macros: weeklyMacros,
      program_status: programStatus,
      today_consumed_kcal: todayConsumedKcal,
      today_remaining_kcal: calculateRemainingCalories(dailyTargetKcal, todayConsumedKcal),
      today_food_items: todayFoodItems,
      today_meal_plan_summary: todayMealPlanSummary,
    }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

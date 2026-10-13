import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { resolveUserAiAccess } from "@/lib/ai/user-keys";
import { callAI } from "@/lib/ai/adapter";
import { AiError } from "@/lib/ai/types";
import { calculateTDEE, getProgramNutrientRules } from "@/lib/tdee/calculator";
import { ProgramType } from "@/types/database";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const singleMealSchema = z.object({
  meal_name: z.string(),
  time_slot: z.string(),
  estimated_kcal: z.number(),
  macros: z.object({
    carbs_g: z.number(),
    protein_g: z.number(),
    fat_g: z.number(),
  }),
  suggested_menu: z.array(z.string()),
  tips: z.string().optional(),
});

const singleDayGenerationSchema = z.object({
  day_number: z.number(),
  day_name: z.string(),
  total_day_kcal: z.number(),
  meals: z.array(singleMealSchema),
});

const requestSchema = z.object({
  dayIndex: z.number().int().min(1).max(7).optional().default(1),
  force: z.boolean().optional().default(false),
  model: z.string().optional(),
});

const DAY_NAMES = [
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
  "Minggu",
];

export async function POST(req: Request) {
  try {
    const supabase = createServerClient(req);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Sesi tidak valid atau telah berakhir." },
        { status: 401 }
      );
    }

    let body = {};
    try {
      body = await req.json();
    } catch {
      // Body is optional
    }

    const parseResult = requestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { dayIndex, force, model: requestedModel } = parseResult.data;
    const dayName = DAY_NAMES[dayIndex - 1] || `Hari ke-${dayIndex}`;

    // Read active model
    const url = new URL(req.url);
    const selectedModel =
      requestedModel || url.searchParams.get("model") || "gemini-3.8-flash";

    // 1. Enforce BYOK access
    let access;
    try {
      access = await resolveUserAiAccess(user.id, selectedModel);
    } catch (err: unknown) {
      if (err instanceof AiError) {
        return NextResponse.json(err.toJSON(), {
          status: err.code === "AI_KEY_REQUIRED" ? 403 : 400,
        });
      }
      throw err;
    }

    const { selectedKey, availableKeys } = access;
    const adminClient = createAdminClient();

    // 2. Load user profile & active program
    const { data: profile } = await adminClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: "Profil belum dikonfigurasi. Lengkapi profil terlebih dahulu." },
        { status: 400 }
      );
    }

    const { data: activeProgram } = await adminClient
      .from("programs")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const tdeeResult = calculateTDEE({
      weight_kg: Number(profile.weight_kg) || 70,
      height_cm: Number(profile.height_cm) || 170,
      age: profile.age || 25,
      gender: profile.gender || "male",
      activity_level: profile.activity_level || "moderate",
    });

    const programType = (activeProgram?.program_type || "cutting") as ProgramType;
    const targetDailyKcal =
      Number(activeProgram?.target_daily_kcal) ||
      tdeeResult.targets[programType as "cutting" | "bulking" | "maintenance"] ||
      tdeeResult.tdee;

    const nutrientRules = getProgramNutrientRules(programType);

    // 3. Resolve or create meal_plans header record
    let mealPlanId: string;
    let existingPlanRecord = null;

    if (activeProgram) {
      const { data: mp } = await adminClient
        .from("meal_plans")
        .select("id, plan_json")
        .eq("program_id", activeProgram.id)
        .maybeSingle();

      if (mp) {
        mealPlanId = mp.id;
        existingPlanRecord = mp;
      } else {
        const { data: newMp, error: createMpErr } = await adminClient
          .from("meal_plans")
          .insert({
            program_id: activeProgram.id,
            week_start_date: new Date().toISOString().split("T")[0],
            plan_json: { days: [] },
            model_used: selectedModel,
          })
          .select("id, plan_json")
          .single();

        if (createMpErr || !newMp) {
          throw new Error("Gagal menginisialisasi catatan rencana makan.");
        }
        mealPlanId = newMp.id;
        existingPlanRecord = newMp;
      }
    } else {
      return NextResponse.json(
        { error: "Belum ada program nutrisi aktif. Aktifkan program terlebih dahulu di menu Program." },
        { status: 400 }
      );
    }

    // 4. Check existing days in meal_plan_days for idempotency & deduplication
    const { data: existingDaysRows } = await adminClient
      .from("meal_plan_days")
      .select("day_number, day_json")
      .eq("meal_plan_id", mealPlanId);

    const existingDays = existingDaysRows || [];
    const targetDayRow = existingDays.find((d) => d.day_number === dayIndex);

    if (targetDayRow && !force) {
      // Already generated, return cached day immediately
      return NextResponse.json({
        success: true,
        cached: true,
        day: targetDayRow.day_json,
        day_number: dayIndex,
        meal_plan_id: mealPlanId,
        meal_plan: existingPlanRecord?.plan_json || { days: existingDays.map((d) => d.day_json) },
      });
    }

    // Extract menu names from all other days to prevent duplicates
    const previousMenuNames: string[] = [];
    for (const d of existingDays) {
      if (d.day_number !== dayIndex && d.day_json?.meals) {
        for (const m of d.day_json.meals) {
          if (m.meal_name) previousMenuNames.push(m.meal_name);
          if (Array.isArray(m.suggested_menu)) {
            previousMenuNames.push(...m.suggested_menu);
          }
        }
      }
    }

    // 5. Build AI prompt for exactly 1 day with 4 meal slots
    const prompt = `Anda adalah Ahli Diet & Perencana Nutrisi Militer untuk Calorie Hunter AI.
Rancang rencana makan presisi tinggi HANYA UNTUK 1 HARI (Hari ke-${dayIndex}: ${dayName}) dengan tepat 4 waktu makan:
1. Sarapan (Pagi)
2. Makan Siang (Siang)
3. Snack / Pre-workout (Sore)
4. Makan Malam (Malam)

Profil Pengguna:
- Nama: ${profile.full_name || profile.username || "Hunter"}
- Gender: ${profile.gender}, Usia: ${profile.age} th, Berat: ${profile.weight_kg} kg, Tinggi: ${profile.height_cm} cm
- Program: ${programType.toUpperCase()} (${nutrientRules.ruleTitle})
- Target Kalori Harian: ${targetDailyKcal} kcal
- Aturan Gizi: ${nutrientRules.ruleDescription} (Target Protein: ${nutrientRules.proteinTargetDesc})

ATURAN PENTING:
- Total kalori ke-4 waktu makan HARUS mendekati target harian ${targetDailyKcal} kcal (toleransi +/- 50 kcal).
- Bahan makanan lokal Indonesia yang mudah didapat, bergizi tinggi, dan bersih (nasi merah/putih, ayam, telur, tempe, tahu, ikan, sayuran hijau).
- HINDARI DUPLIKASI MENU berikut yang telah disajikan pada hari-hari sebelumnya:
  [${previousMenuNames.slice(0, 30).join(", ") || "Belum ada menu sebelumnya"}]

Format output JSON:
{
  "day_number": ${dayIndex},
  "day_name": "${dayName}",
  "total_day_kcal": ${targetDailyKcal},
  "meals": [
    {
      "meal_name": "Nama hidangan lengkap",
      "time_slot": "Sarapan (07:00)",
      "estimated_kcal": 450,
      "macros": { "carbs_g": 50, "protein_g": 35, "fat_g": 12 },
      "suggested_menu": ["150g Nasi", "100g Dada Ayam Panggang", "Tumis Bayam"],
      "tips": "Tips taktis hidrasi atau persiapan"
    },
    ... (tepat 4 meal item)
  ]
}`;

    // 6. Invoke AI via unified adapter
    const aiRes = await callAI({
      provider: selectedKey.provider,
      model: selectedModel,
      apiKey: selectedKey.key,
      baseUrl: selectedKey.baseUrl,
      messages: [{ role: "user", content: prompt }],
      schema: singleDayGenerationSchema,
      availableKeys,
    });

    const generatedDay = aiRes.data || JSON.parse(aiRes.rawText);

    // 7. Persist to meal_plan_days enforcing (meal_plan_id, day_number) uniqueness
    await adminClient.from("meal_plan_days").upsert(
      {
        meal_plan_id: mealPlanId,
        day_number: dayIndex,
        day_json: generatedDay,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "meal_plan_id,day_number" }
    );

    // 8. Update consolidated plan_json in meal_plans for backward compatibility
    const updatedDaysList = [
      ...existingDays.filter((d) => d.day_number !== dayIndex).map((d) => d.day_json),
      generatedDay,
    ].sort((a, b) => a.day_number - b.day_number);

    const consolidatedPlan = {
      summary: `Rencana Nutrisi 7 Hari ${programType.toUpperCase()} (${targetDailyKcal} kcal/hari)`,
      target_daily_kcal: targetDailyKcal,
      weekly_split: {
        protein_pct: 30,
        carbs_pct: 45,
        fat_pct: 25,
      },
      days: updatedDaysList,
    };

    await adminClient
      .from("meal_plans")
      .update({
        plan_json: consolidatedPlan,
        model_used: selectedModel,
        generated_at: new Date().toISOString(),
      })
      .eq("id", mealPlanId);

    return NextResponse.json({
      success: true,
      day: generatedDay,
      day_number: dayIndex,
      meal_plan_id: mealPlanId,
      model_used: selectedModel,
      latency_ms: aiRes.latencyMs,
      meal_plan: consolidatedPlan,
    });
  } catch (error: any) {
    if (error instanceof AiError) {
      return NextResponse.json(error.toJSON(), {
        status: error.code === "AI_KEY_REQUIRED" ? 403 : 500,
      });
    }

    return NextResponse.json(
      { error: error.message || "Gagal membuat rencana makan harian." },
      { status: 500 }
    );
  }
}

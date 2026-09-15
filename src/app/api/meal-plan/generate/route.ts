import { NextResponse } from "next/server";
import { z } from "zod";
import { gemini } from "@/lib/gemini/client";
import { createServerClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

const mealSchema = z.object({
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

const daySchema = z.object({
  day_number: z.number(),
  day_name: z.string(),
  total_day_kcal: z.number(),
  meals: z.array(mealSchema),
});

const mealPlanResponseSchema = z.object({
  summary: z.string(),
  target_daily_kcal: z.number(),
  weekly_split: z.object({
    protein_pct: z.number(),
    carbs_pct: z.number(),
    fat_pct: z.number(),
  }),
  days: z.array(daySchema),
});

// Official GenAI structured responseSchema for 7-day meal plan
const mealPlanGeminiSchema = {
  type: "OBJECT",
  properties: {
    summary: { type: "STRING" },
    target_daily_kcal: { type: "NUMBER" },
    weekly_split: {
      type: "OBJECT",
      properties: {
        protein_pct: { type: "NUMBER" },
        carbs_pct: { type: "NUMBER" },
        fat_pct: { type: "NUMBER" },
      },
      required: ["protein_pct", "carbs_pct", "fat_pct"],
    },
    days: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          day_number: { type: "INTEGER" },
          day_name: { type: "STRING" },
          total_day_kcal: { type: "NUMBER" },
          meals: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                meal_name: { type: "STRING" },
                time_slot: { type: "STRING" },
                estimated_kcal: { type: "NUMBER" },
                macros: {
                  type: "OBJECT",
                  properties: {
                    carbs_g: { type: "NUMBER" },
                    protein_g: { type: "NUMBER" },
                    fat_g: { type: "NUMBER" },
                  },
                  required: ["carbs_g", "protein_g", "fat_g"],
                },
                suggested_menu: {
                  type: "ARRAY",
                  items: { type: "STRING" },
                },
                tips: { type: "STRING" },
              },
              required: ["meal_name", "time_slot", "estimated_kcal", "macros", "suggested_menu"],
            },
          },
        },
        required: ["day_number", "day_name", "total_day_kcal", "meals"],
      },
    },
  },
  required: ["summary", "target_daily_kcal", "weekly_split", "days"],
};

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "client-local";
    const rl = checkRateLimit(`meal-plan:${ip}`, { limit: 10, windowMs: 60 * 1000 });
    if (!rl.success) {
      return NextResponse.json(
        { error: "Batas permintaan meal plan terlampaui. Harap tunggu 1 menit sebelum regenerasi menu." },
        { status: 429 }
      );
    }

    let requestBody: any = {};
    try {
      requestBody = await req.json();
    } catch {}

    const supabase = createServerClient(req);
    const { data: { user } } = await supabase.auth.getUser();

    // Default context
    let profile = {
      height_cm: 175,
      weight_kg: 70,
      age: 25,
      gender: "male",
      activity_level: "moderate",
      preferred_gemini_model: "gemini-3.8-flash",
    };
    let program = {
      id: "demo-prog",
      program_type: "cutting",
      target_daily_kcal: 1950,
    };
    let activities: any[] = [];

    if (user) {
      const { data: userProfile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      const { data: userProgram } = await supabase.from("programs").select("*").eq("user_id", user.id).eq("status", "active").single();
      const { data: userActivities } = await supabase.from("weekly_activities").select("*").eq("user_id", user.id);
      
      if (userProfile) profile = { ...profile, ...userProfile };
      if (userProgram) program = userProgram;
      if (userActivities) activities = userActivities;
    }

    // Step 7: Resolve selected Gemini model (from body, profile, cookie, or default)
    const cookieHeader = req.headers.get("cookie") || "";
    const cookieModelMatch = cookieHeader.match(/(?:^|;\s*)chai_ai_model=([^;]+)/);
    const selectedModel = 
      requestBody?.preferred_model ||
      profile.preferred_gemini_model ||
      (cookieModelMatch ? decodeURIComponent(cookieModelMatch[1]) : "gemini-3.8-flash");

    const prompt = `
Anda adalah AI Ahli Gizi & Nutrisi Olahraga untuk sistem CALORIE HUNTER AI.
Buatkan rencana makan mingguan (7 hari lengkap: Senin s/d Minggu) dengan informasi berikut:
- Profil Hunter: ${profile.gender}, usia ${profile.age} tahun, tinggi ${profile.height_cm} cm, berat ${profile.weight_kg} kg.
- Program: ${program.program_type.toUpperCase()}
- Target Kalori Harian: ${program.target_daily_kcal} kcal/hari (total kalori per hari harus sangat mendekati target ini, toleransi ±50 kcal).
- Jadwal Aktivitas Mingguan: ${activities.length > 0 ? activities.map(a => `${a.activity_name} (${a.frequency_per_week}x/minggu, ${a.duration_minutes}m, intensitas ${a.intensity})`).join("; ") : "Latihan rutin moderat"}.

Instruksi menu:
- Gunakan bahan makanan lokal Indonesia yang mudah didapat, bergizi seimbang, dan tinggi protein untuk mendukung program.
- Tiap hari bagi menjadi 4 waktu makan: Sarapan (08:00), Makan Siang (13:00), Snack/Katalis Energi (16:30), dan Makan Malam (19:30).
- Berikan saran tips taktis hidrasi & pemulihan energi pada setiap waktu makan.
`;

    let generatedJson: any = null;
    let isFallback = false;
    let fallbackMessage: string | null = null;

    // Step 4: Reliable Gemini call with thinking_level HIGH, responseSchema, and 3x retry + backoff
    if (process.env.GEMINI_API_KEY) {
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const response = await gemini.models.generateContent({
            model: selectedModel,
            contents: prompt,
            config: {
              responseMimeType: "application/json",
              responseSchema: mealPlanGeminiSchema,
              thinkingConfig: {
                thinkingLevel: "HIGH" as any,
              },
            },
          });

          const text = response.text || "";
          const parsed = JSON.parse(text);
          const validated = mealPlanResponseSchema.parse(parsed);
          generatedJson = validated;
          break; // Success, exit retry loop
        } catch (err: any) {
          console.warn(`[Gemini MealPlan] Attempt ${attempt} with ${selectedModel} failed:`, err.message);
          if (attempt < 3) {
            // Exponential backoff: 1s, 2s
            await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
          }
        }
      }
    }

    // If all 3 retries failed, check for last cached meal plan in DB
    if (!generatedJson && user && program.id !== "demo-prog") {
      const { data: lastPlan } = await supabase
        .from("meal_plans")
        .select("plan_json")
        .eq("program_id", program.id)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastPlan?.plan_json) {
        generatedJson = lastPlan.plan_json;
        isFallback = true;
        fallbackMessage = "Panggilan AI mencapai batas retry. Menampilkan rencana makan terakhir yang tersimpan.";
      }
    }

    // High quality tactical deterministic fallback if no AI or DB plan available
    if (!generatedJson || !generatedJson.days) {
      isFallback = true;
      fallbackMessage = "Sistem AI sedang sibuk atau kuota tercapai. Menampilkan rencana makan deterministik cadangan.";
      const target = program.target_daily_kcal;
      const bBreakfast = Math.round(target * 0.25);
      const bLunch = Math.round(target * 0.35);
      const bSnack = Math.round(target * 0.15);
      const bDinner = target - bBreakfast - bLunch - bSnack;

      const dayNames = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
      generatedJson = {
        summary: `Protokol Nutrisi ${program.program_type.toUpperCase()} dioptimalkan untuk target ${target} kcal/hari dengan rasio protein tinggi untuk pertahanan metabolisme.`,
        target_daily_kcal: target,
        weekly_split: { protein_pct: 35, carbs_pct: 45, fat_pct: 20 },
        days: dayNames.map((name, i) => ({
          day_number: i + 1,
          day_name: name,
          total_day_kcal: target,
          meals: [
            {
              meal_name: "Sarapan Taktis",
              time_slot: "08:00",
              estimated_kcal: bBreakfast,
              macros: { carbs_g: Math.round(bBreakfast * 0.12), protein_g: Math.round(bBreakfast * 0.08), fat_g: Math.round(bBreakfast * 0.02) },
              suggested_menu: ["Oatmeal dengan pisang & chia seed", "2 butir telur rebus", "Kopi hitam tanpa gula"],
              tips: "Awali dengan hidrasi 500ml air mineral dingin.",
            },
            {
              meal_name: "Ransum Siang (Midday Raid)",
              time_slot: "13:00",
              estimated_kcal: bLunch,
              macros: { carbs_g: Math.round(bLunch * 0.11), protein_g: Math.round(bLunch * 0.09), fat_g: Math.round(bLunch * 0.03) },
              suggested_menu: ["Nasi merah 150g", "Dada ayam panggang 150g", "Tumis buncis & wortel"],
              tips: "Makan perlahan untuk memaksimalkan sinyal kenyang leptin.",
            },
            {
              meal_name: "Katalis Energi (Pre/Post Workout)",
              time_slot: "16:30",
              estimated_kcal: bSnack,
              macros: { carbs_g: Math.round(bSnack * 0.1), protein_g: Math.round(bSnack * 0.08), fat_g: Math.round(bSnack * 0.02) },
              suggested_menu: ["1 scoop Whey Protein isolate", "1 buah apel fuji", "10 butir almond panggang"],
              tips: "Mendukung sintesis asam amino sebelum latihan tempur.",
            },
            {
              meal_name: "Ransum Malam (Restorasi)",
              time_slot: "19:30",
              estimated_kcal: bDinner,
              macros: { carbs_g: Math.round(bDinner * 0.09), protein_g: Math.round(bDinner * 0.08), fat_g: Math.round(bDinner * 0.03) },
              suggested_menu: ["Ikan kembung bakar bumbu kunyit", "Sayur bening bayam jagung", "Ubi rebus 100g"],
              tips: "Beri jeda minimal 2 jam sebelum tidur malam.",
            },
          ],
        })),
      };
    }

    const validated = mealPlanResponseSchema.parse(generatedJson);

    // Save newly generated AI plan to Supabase if not a fallback
    if (user && program.id !== "demo-prog" && !isFallback) {
      const today = new Date().toISOString().split("T")[0];
      await supabase.from("meal_plans").insert({
        program_id: program.id,
        week_start_date: today,
        plan_json: validated,
        model_used: selectedModel,
      });
    }

    return NextResponse.json({
      success: true,
      meal_plan: validated,
      model_used: selectedModel,
      is_fallback: isFallback,
      fallback_message: fallbackMessage,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

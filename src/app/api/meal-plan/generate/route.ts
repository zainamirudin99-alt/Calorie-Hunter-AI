import { NextResponse } from "next/server";
import { z } from "zod";
import { gemini, PRIMARY_GEMINI_MODEL, FALLBACK_GEMINI_MODEL } from "@/lib/gemini/client";
import { createServerClient } from "@/lib/supabase/server";

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

import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "client-local";
    const rl = checkRateLimit(`meal-plan:${ip}`, { limit: 6, windowMs: 60 * 1000 });
    if (!rl.success) {
      return NextResponse.json(
        { error: "Batas permintaan meal plan terlampaui. Harap tunggu sebentar sebelum regenerasi menu." },
        { status: 429 }
      );
    }
    const supabase = createServerClient(req);
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    // Default mock context for preview if not yet fully authenticated in Supabase
    let profile = {
      height_cm: 175,
      weight_kg: 70,
      age: 25,
      gender: "male",
      activity_level: "moderate",
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
      
      if (userProfile) profile = userProfile;
      if (userProgram) program = userProgram;
      if (userActivities) activities = userActivities;
    }

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
- Output WAJIB berupa JSON murni sesuai skema:
{
  "summary": "Ringkasan strategi nutrisi mingguan",
  "target_daily_kcal": ${program.target_daily_kcal},
  "weekly_split": { "protein_pct": 35, "carbs_pct": 45, "fat_pct": 20 },
  "days": [
    {
      "day_number": 1,
      "day_name": "Senin",
      "total_day_kcal": 1950,
      "meals": [
        {
          "meal_name": "Sarapan",
          "time_slot": "08:00",
          "estimated_kcal": 450,
          "macros": { "carbs_g": 50, "protein_g": 30, "fat_g": 12 },
          "suggested_menu": ["Oatmeal dengan susu almond dan pisang", "2 butir telur rebus"],
          "tips": "Konsumsi air putih 500ml sebelum makan"
        }
      ]
    }
  ]
}
`;

    let generatedJson: any = null;
    let modelUsed = PRIMARY_GEMINI_MODEL;

    try {
      if (process.env.GEMINI_API_KEY) {
        // Call Gemini API with structured JSON response
        try {
          const response = await gemini.models.generateContent({
            model: PRIMARY_GEMINI_MODEL,
            contents: prompt,
            config: {
              responseMimeType: "application/json",
            },
          });
          const text = response.text || "";
          generatedJson = JSON.parse(text);
        } catch (err) {
          // Fallback model
          modelUsed = FALLBACK_GEMINI_MODEL;
          const response = await gemini.models.generateContent({
            model: FALLBACK_GEMINI_MODEL,
            contents: prompt,
            config: {
              responseMimeType: "application/json",
            },
          });
          const text = response.text || "";
          generatedJson = JSON.parse(text);
        }
      }
    } catch (aiErr) {
      console.warn("Gemini API call failed, generating deterministic fallback meal plan:", aiErr);
    }

    // High quality tactical deterministic fallback if API Key is not set or quota reached
    if (!generatedJson || !generatedJson.days) {
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
              suggested_menu: ["Nasi merah 150g", "Dada ayam panggang 150g", "Tumis buncis & wortel tanpa minyak berlebih"],
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

    // Validate with Zod
    const validated = mealPlanResponseSchema.parse(generatedJson);

    // Save to Supabase if valid program exists
    if (user && program.id !== "demo-prog") {
      const today = new Date().toISOString().split("T")[0];
      await supabase.from("meal_plans").insert({
        program_id: program.id,
        week_start_date: today,
        plan_json: validated,
        model_used: modelUsed,
      });
    }

    return NextResponse.json({
      success: true,
      meal_plan: validated,
      model_used: modelUsed,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { calculateTDEE, getProgramNutrientRules } from "@/lib/tdee/calculator";
import { ProgramType } from "@/types/database";
import { resolveUserAiAccess } from "@/lib/ai/user-keys";
import { callAI } from "@/lib/ai/adapter";
import { AiError } from "@/lib/ai/types";

export const runtime = "nodejs";

const analyzeSchema = z.object({
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
  ]),
});

const aiProgramAnalysisZodSchema = z.object({
  program_type: z.string().optional(),
  feasibility_status: z.string(),
  target_daily_kcal: z.number(),
  weekly_projection: z.string(),
  protein_strategy: z.string(),
  macro_micro_policy: z.string(),
  actionable_tactics: z.array(z.string()),
  ai_verdict: z.string(),
});

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

    const body = await req.json();
    const parseResult = analyzeSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: "Program type tidak valid" }, { status: 400 });
    }

    const { program_type } = parseResult.data;

    // Read selected model from query or cookie
    const url = new URL(req.url);
    const selectedModel = url.searchParams.get("model") || "gemini-3.8-flash";

    // 1. BYOK Gatekeeper: Enforce user key access
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

    // Fetch user profile and active program
    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profil belum lengkap" }, { status: 400 });
    }

    // Calculate TDEE
    const tdeeResult = calculateTDEE({
      weight_kg: Number(profile.weight_kg) || 70,
      height_cm: Number(profile.height_cm) || 170,
      age: profile.age || 25,
      gender: profile.gender || "male",
      activity_level: profile.activity_level || "moderate",
    });

    const targetKcal =
      tdeeResult.targets[program_type as "cutting" | "bulking" | "maintenance"] ||
      tdeeResult.tdee;

    const nutrientRules = getProgramNutrientRules(program_type as ProgramType);

    const prompt = `Anda adalah Lead Nutritionist AI militer dan biometrik untuk Calorie Hunter AI.
Analisis data atlet/pengguna berikut:
- Nama: ${profile.full_name || profile.username || "Hunter"}
- Gender: ${profile.gender}, Usia: ${profile.age} tahun
- Tinggi: ${profile.height_cm} cm, Berat: ${profile.weight_kg} kg
- Level Aktivitas: ${profile.activity_level}
- TDEE Baseline: ${tdeeResult.tdee} kcal
- Program yang Dipilih: ${program_type.toUpperCase()}
- Target Kalori Harian: ${targetKcal} kcal
- Aturan Gizi Program:
  * Aturan: ${nutrientRules.ruleTitle} - ${nutrientRules.ruleDescription}
  * Target Protein: ${nutrientRules.proteinTargetDesc}
  * Badge: ${nutrientRules.badge}

Berikan analisis mendalam dan objektif dalam Bahasa Indonesia taktis:
1. Feasibility status (misal: "SANGAT IDEAL", "SIAP DIJALANKAN", "MEMBUTUHKAN DISIPLIN TINGGI").
2. Estimasi proyeksi mingguan (misal: "Turun 0.4 - 0.7 kg lemak per minggu").
3. Strategi protein harian khusus.
4. Kebijakan makro/mikro.
5. Tepat 3 tips taktis yang actionable.
6. Kesimpulan vonis AI (AI verdict) singkat.`;

    let aiAnalysis = null;
    try {
      const aiRes = await callAI({
        provider: selectedKey.provider,
        model: selectedModel,
        apiKey: selectedKey.key,
        baseUrl: selectedKey.baseUrl,
        messages: [{ role: "user", content: prompt }],
        schema: aiProgramAnalysisZodSchema,
        availableKeys,
      });
      aiAnalysis = aiRes.data;
    } catch (aiErr: unknown) {
      if (aiErr instanceof AiError) {
        return NextResponse.json(aiErr.toJSON(), {
          status: aiErr.code === "AI_KEY_REQUIRED" ? 403 : 500,
        });
      }
      throw aiErr;
    }

    return NextResponse.json({
      success: true,
      analysis: aiAnalysis,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Gagal menganalisis program gizi" },
      { status: 500 }
    );
  }
}

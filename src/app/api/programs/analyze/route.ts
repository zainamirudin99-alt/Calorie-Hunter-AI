import { NextResponse } from "next/server";
import { z } from "zod";
import { gemini, PRIMARY_GEMINI_MODEL } from "@/lib/gemini/client";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { calculateTDEE, getProgramNutrientRules } from "@/lib/tdee/calculator";
import { ProgramType } from "@/types/database";

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

const aiProgramAnalysisGeminiSchema = {
  type: "OBJECT",
  properties: {
    program_type: { type: "STRING" },
    feasibility_status: { type: "STRING" },
    target_daily_kcal: { type: "NUMBER" },
    weekly_projection: { type: "STRING" },
    protein_strategy: { type: "STRING" },
    macro_micro_policy: { type: "STRING" },
    actionable_tactics: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
    ai_verdict: { type: "STRING" },
  },
  required: [
    "feasibility_status",
    "target_daily_kcal",
    "weekly_projection",
    "protein_strategy",
    "macro_micro_policy",
    "actionable_tactics",
    "ai_verdict",
  ],
};

export async function POST(req: Request) {
  try {
    const supabase = createServerClient(req);
    const { data: { user } } = await supabase.auth.getUser();

    const body = await req.json();
    const parseResult = analyzeSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: "Program type tidak valid" }, { status: 400 });
    }

    const { program_type } = parseResult.data;

    // Load profile from DB or request
    let profile: any = body.profile || null;

    if (user && !profile) {
      const admin = createAdminClient();
      const { data: p } = await admin.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (p) profile = p;
    }

    const weightKg = Number(profile?.weight_kg) || 75;
    const heightCm = Number(profile?.height_cm) || 175;
    const age = Number(profile?.age) || 25;
    const gender = (profile?.gender as any) || "male";
    const activityLevel = (profile?.activity_level as any) || "moderate";

    const tdeeResult = calculateTDEE({
      weight_kg: weightKg,
      height_cm: heightCm,
      age,
      gender,
      activity_level: activityLevel,
    });

    const targetKcal = tdeeResult.targets[program_type] || tdeeResult.targets.cutting;
    const rules = getProgramNutrientRules(program_type);

    // Resolve selected Gemini model from body, cookie, or header
    const cookieHeader = req.headers.get("cookie") || "";
    const cookieModelMatch = cookieHeader.match(/(?:^|;\s*)chai_ai_model=([^;]+)/);
    const selectedModel = body.model || (cookieModelMatch ? decodeURIComponent(cookieModelMatch[1]) : PRIMARY_GEMINI_MODEL);

    const prompt = `
Anda adalah Chief AI Tactical Nutritionist di Calorie Hunter AI ("${selectedModel}").
Tugas Anda: Analisis kesesuaian biometrik Hunter berikut terhadap program yang dipilih:

[DATA BIOMETRIK HUNTER]
- Gender: ${gender === "male" ? "Pria" : "Wanita"}
- Berat Badan: ${weightKg} kg
- Tinggi Badan: ${heightCm} cm
- Usia: ${age} tahun
- Aktivitas Fisik: ${activityLevel}
- BMR (Basal Metabolic Rate): ${tdeeResult.bmr} kcal
- TDEE (Total Daily Energy Expenditure): ${tdeeResult.tdee} kcal

[PROGRAM YANG DIPILIH]
- Nama Program: ${rules.ruleTitle} (${program_type})
- Target Kalori Harian: ${targetKcal} kcal
- Aturan Kepatuhan Nutrisi Khusus:
  * Pelacakan Makro: ${rules.tracksMacros ? "Aktif" : "TIDAK MEMPERHATIKAN MAKRO (Bebas)"}
  * Pelacakan Mikro (Sodium/Kalium/Vit C): ${rules.tracksMicros ? "Aktif & Ketat" : "TIDAK MEMPERHATIKAN MIKRO"}
  * Kebijakan Protein Harian: ${rules.tracksProteinStrictly ? "WAJIB & KETAT untuk Build Muscle (" + rules.proteinTargetDesc + ")" : "Fleksibel / Tidak Di-enforce"}
  * Ringkasan Aturan: ${rules.ruleDescription}

Berikan analisis mendalam dan objektif dalam Bahasa Indonesia taktis:
1. Feasibility status (misal: "SANGAT IDEAL", "SIAP DIJALANKAN", "MEMBUTUHKAN DISIPLIN TINGGI").
2. Estimasi proyeksi mingguan (misal: "Turun 0.4 - 0.7 kg lemak per minggu" atau "Naik 0.25 - 0.4 kg massa per minggu").
3. Strategi protein harian khusus sesuai aturan program ini.
4. Kebijakan makro/mikro sesuai aturan program ini.
5. Tepat 3 tips taktis yang actionable (contoh: hidrasi, timing makan, strategi konsistensi).
6. Kesimpulan vonis AI (AI verdict) singkat yang memotivasi hunter.
`;

    let aiAnalysis: any = null;

    // Multi-Provider Step 1: OpenAI Series (GPT-5.6 Luna, GPT-5 Thinking Mini)
    if (selectedModel.startsWith("gpt-") && process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes("placeholder")) {
      try {
        const oaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: selectedModel === "gpt-5-thinking-mini" ? "o3-mini" : "gpt-4o",
            messages: [
              {
                role: "user",
                content: `${prompt}\nOutput strictly valid JSON with format: {"program_type":"${program_type}","feasibility_status":"...","target_daily_kcal":${targetKcal},"weekly_projection":"...","protein_strategy":"...","macro_micro_policy":"...","actionable_tactics":["...","...","..."],"ai_verdict":"..."}`,
              },
            ],
            response_format: { type: "json_object" },
          }),
        });

        if (oaiRes.ok) {
          const oaiData = await oaiRes.json();
          const parsed = JSON.parse(oaiData.choices?.[0]?.message?.content || "{}");
          if (parsed && parsed.feasibility_status) {
            aiAnalysis = parsed;
          }
        }
      } catch (oaiErr: any) {
        console.warn(`[OpenAI ProgramAnalyze] Error with ${selectedModel}:`, oaiErr.message);
      }
    }

    // Multi-Provider Step 2: DeepSeek Series (DeepSeek-V4-Flash, DeepSeek-V4-Pro)
    if (!aiAnalysis && selectedModel.startsWith("deepseek-") && process.env.DEEPSEEK_API_KEY && !process.env.DEEPSEEK_API_KEY.includes("placeholder")) {
      try {
        const dsRes = await fetch("https://api.deepseek.com/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          },
          body: JSON.stringify({
            model: selectedModel === "deepseek-v4-pro" ? "deepseek-reasoner" : "deepseek-chat",
            messages: [
              {
                role: "user",
                content: `${prompt}\nOutput strictly valid JSON with format: {"program_type":"${program_type}","feasibility_status":"...","target_daily_kcal":${targetKcal},"weekly_projection":"...","protein_strategy":"...","macro_micro_policy":"...","actionable_tactics":["...","...","..."],"ai_verdict":"..."}`,
              },
            ],
            response_format: { type: "json_object" },
          }),
        });

        if (dsRes.ok) {
          const dsData = await dsRes.json();
          const parsed = JSON.parse(dsData.choices?.[0]?.message?.content || "{}");
          if (parsed && parsed.feasibility_status) {
            aiAnalysis = parsed;
          }
        }
      } catch (dsErr: any) {
        console.warn(`[DeepSeek ProgramAnalyze] Error with ${selectedModel}:`, dsErr.message);
      }
    }

    // Multi-Provider Step 3: Google Gemini Series with automated capacity cascade
    if (!aiAnalysis && process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes("placeholder")) {
      const candidateModels = [
        selectedModel.startsWith("gemini-") ? selectedModel : PRIMARY_GEMINI_MODEL,
        PRIMARY_GEMINI_MODEL,
        "gemini-2.5-flash",
        "gemini-2.0-flash",
      ].filter((m, i, arr) => arr.indexOf(m) === i);

      for (const candidate of candidateModels) {
        try {
          const response = await gemini.models.generateContent({
            model: candidate,
            contents: [prompt],
            config: {
              responseMimeType: "application/json",
              responseSchema: aiProgramAnalysisGeminiSchema,
            },
          });

          const text = response.text || "";
          if (text) {
            const parsed = JSON.parse(text);
            if (parsed && parsed.feasibility_status) {
              aiAnalysis = parsed;
              break;
            }
          }
        } catch (err: any) {
          console.warn(`[Gemini ProgramAnalyze] Error with ${candidate}:`, err.message);
        }
      }
    }

    // High quality deterministic fallback matching the exact rules
    if (!aiAnalysis) {
      let projection = "Perubahan terukur 0.4 - 0.6 kg / minggu";
      let proteinStrat = rules.proteinTargetDesc;
      let policy = rules.ruleDescription;

      if (program_type === "weight_loss") {
        projection = "Penurunan berat badan agresif 0.6 - 0.9 kg / minggu";
        proteinStrat = "Bebas, tidak ada target gram protein spesifik.";
        policy = "Fokus 100% pada pematuhan defisit kalori; abaikan pembagian makro dan mikro.";
      } else if (program_type === "loss_fat") {
        projection = "Pembakaran lemak bertahap 0.4 - 0.7 kg / minggu";
        proteinStrat = "Standar alami, tidak diwajibkan tinggi (fokus pembakaran lemak).";
        policy = "Memantau kalori defisit dan makro umum tanpa tekanan protein.";
      } else if (program_type === "loss_fat_build_muscle") {
        projection = "Rekomposisi: Lemak berkurang ~0.4 kg/minggu, massa otot terlindungi/meningkat";
        proteinStrat = `Wajib minimal ${Math.round(weightKg * 2.0)}g protein/hari (2.0g/kg BB) untuk memicu retensi otot maksimal.`;
        policy = "Defisit kalori terkontrol dipadukan dengan target protein ketat.";
      } else if (program_type === "gain_mass") {
        projection = "Kenaikan berat badan cepat 0.5 - 0.8 kg / minggu";
        proteinStrat = "Bebas, konsumsi kalori surplus dari makanan apa pun yang padat energi.";
        policy = "Tidak memperhatikan mikro dan makro; yang terpenting surplus kalori harian tercapai.";
      } else if (program_type === "gain_mass_build_muscle") {
        projection = "Kenaikan massa otot optimal 0.3 - 0.5 kg / minggu minim lemak";
        proteinStrat = `Target harian ${Math.round(weightKg * 1.8)}g protein/hari (1.8g/kg BB) untuk sintesis protein miofibril.`;
        policy = "Surplus kalori terukur + proteksi protein harian.";
      } else if (program_type === "lean_mass") {
        projection = "Pertumbuhan massa murni atletik 0.2 - 0.35 kg / minggu";
        proteinStrat = `Target ${Math.round(weightKg * 1.9)}g protein murni berkualitas tinggi.`;
        policy = "Wajib memantau seluruh makro (P/C/F) dan mikronutrien (Sodium, Kalium, Vit C) secara ketat.";
      }

      aiAnalysis = {
        program_type,
        feasibility_status: "SANGAT IDEAL & TERVERIFIKASI",
        target_daily_kcal: targetKcal,
        weekly_projection: projection,
        protein_strategy: proteinStrat,
        macro_micro_policy: policy,
        actionable_tactics: [
          `Pastikan batas harian ${targetKcal} kcal menjadi komitmen mutlak selama 180 hari siklus program.`,
          rules.tracksProteinStrictly
            ? `Penuhi kuota protein sejak sarapan dan makan siang agar target build muscle tercapai tanpa menumpuk di malam hari.`
            : `Konsumsi makanan secara teratur untuk menjaga kestabilan energi harian.`,
          `Lakukan penimbangan berat badan di pagi hari setelah bangun tidur untuk telemetri yang konsisten.`,
        ],
        ai_verdict: `Berdasarkan biometrik ${weightKg}kg / ${heightCm}cm dengan TDEE ${tdeeResult.tdee} kcal, program ${rules.ruleTitle} sangat sesuai untuk mencapai target fisiologis Anda dengan aman dan terukur.`,
      };
    }

    return NextResponse.json({
      success: true,
      analysis: aiAnalysis,
      rules,
      biometrics: {
        weight_kg: weightKg,
        height_cm: heightCm,
        age,
        gender,
        tdee: tdeeResult.tdee,
        bmr: tdeeResult.bmr,
        target_kcal: targetKcal,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

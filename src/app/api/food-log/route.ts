import { NextResponse } from "next/server";
import { z } from "zod";
import { gemini, PRIMARY_GEMINI_MODEL, FALLBACK_GEMINI_MODEL } from "@/lib/gemini/client";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

const nutritionItemSchema = z.object({
  food_name: z.string(),
  estimated_weight_g: z.number(),
  calories_kcal: z.number(),
  macros: z.object({
    carbs_g: z.number().default(0),
    protein_g: z.number().default(0),
    fat_g: z.number().default(0),
    fiber_g: z.number().default(0),
    sugar_g: z.number().default(0),
  }),
  micros: z.object({
    sodium_mg: z.number().optional().default(0),
    potassium_mg: z.number().optional().default(0),
    vitamin_c_mg: z.number().optional().default(0),
  }).default({}),
  confidence: z.number().default(0.85),
});

const geminiNutritionResponseSchema = z.object({
  items: z.array(nutritionItemSchema),
  total_calories_kcal: z.number(),
  notes: z.string().optional().default(""),
});

// Official GenAI structured responseSchema for Food Scan
const foodScanGeminiSchema = {
  type: "OBJECT",
  properties: {
    items: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          food_name: { type: "STRING" },
          estimated_weight_g: { type: "NUMBER" },
          calories_kcal: { type: "NUMBER" },
          macros: {
            type: "OBJECT",
            properties: {
              carbs_g: { type: "NUMBER" },
              protein_g: { type: "NUMBER" },
              fat_g: { type: "NUMBER" },
              fiber_g: { type: "NUMBER" },
              sugar_g: { type: "NUMBER" },
            },
            required: ["carbs_g", "protein_g", "fat_g"],
          },
          micros: {
            type: "OBJECT",
            properties: {
              sodium_mg: { type: "NUMBER" },
              potassium_mg: { type: "NUMBER" },
              vitamin_c_mg: { type: "NUMBER" },
            },
          },
          confidence: { type: "NUMBER" },
        },
        required: ["food_name", "estimated_weight_g", "calories_kcal", "macros"],
      },
    },
    total_calories_kcal: { type: "NUMBER" },
    notes: { type: "STRING" },
  },
  required: ["items", "total_calories_kcal"],
};

export async function GET(req: Request) {
  try {
    const supabase = createServerClient(req);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: true, items: [] });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    const admin = createAdminClient();
    let query = admin
      .from("food_logs")
      .select("id, created_at, ai_response_json, total_kcal, food_log_items(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (date) {
      const startOfDay = `${date}T00:00:00.000Z`;
      const endOfDay = `${date}T23:59:59.999Z`;
      query = query.gte("created_at", startOfDay).lte("created_at", endOfDay);
    }

    const { data: logs, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const items: any[] = [];
    if (logs && Array.isArray(logs)) {
      for (const log of logs) {
        const timeStr = log.created_at
          ? new Date(log.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB"
          : "12:00 WIB";

        if (Array.isArray(log.food_log_items) && log.food_log_items.length > 0) {
          for (const item of log.food_log_items) {
            items.push({
              id: item.id || `item-${Math.random()}`,
              food_name: item.food_name,
              estimated_weight_g: Number(item.weight_g) || 100,
              calories_kcal: Number(item.calories_kcal) || 0,
              time_logged: timeStr,
              meal_slot: "Ransum Tempur",
              macros: {
                carbs_g: Number(item.carbs_g) || 0,
                protein_g: Number(item.protein_g) || 0,
                fat_g: Number(item.fat_g) || 0,
                fiber_g: Number(item.fiber_g) || 0,
                sugar_g: Number(item.sugar_g) || 0,
              },
              micros: item.micros_json || {},
            });
          }
        } else if (log.ai_response_json?.items && Array.isArray(log.ai_response_json.items)) {
          for (const item of log.ai_response_json.items) {
            items.push({
              id: item.id || `item-${Math.random()}`,
              food_name: item.food_name,
              estimated_weight_g: Number(item.estimated_weight_g) || 100,
              calories_kcal: Number(item.calories_kcal) || 0,
              time_logged: timeStr,
              meal_slot: "Ransum Tempur",
              macros: {
                carbs_g: Number(item.macros?.carbs_g) || 0,
                protein_g: Number(item.macros?.protein_g) || 0,
                fat_g: Number(item.macros?.fat_g) || 0,
                fiber_g: Number(item.macros?.fiber_g) || 0,
                sugar_g: Number(item.macros?.sugar_g) || 0,
              },
              micros: item.micros || {},
            });
          }
        }
      }
    }

    return NextResponse.json({ success: true, items });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "client-local";
    const rl = checkRateLimit(`food-log:${ip}`, { limit: 20, windowMs: 60 * 1000 });
    if (!rl.success) {
      return NextResponse.json(
        { error: "Batas permintaan terlampaui. Silakan tunggu 1 menit sebelum menganalisis makanan lagi." },
        { status: 429 }
      );
    }

    const supabase = createServerClient(req);
    const { data: { user } } = await supabase.auth.getUser();

    // Resolve selected Gemini model from cookie or header
    const cookieHeader = req.headers.get("cookie") || "";
    const cookieModelMatch = cookieHeader.match(/(?:^|;\s*)chai_ai_model=([^;]+)/);
    const selectedModel = cookieModelMatch
      ? decodeURIComponent(cookieModelMatch[1])
      : PRIMARY_GEMINI_MODEL;

    const contentType = req.headers.get("content-type") || "";

    // -------------------------------------------------------------------------
    // ACTION: SAVE (JSON commit to food_logs and food_log_items)
    // -------------------------------------------------------------------------
    if (contentType.includes("application/json")) {
      const body = await req.json();
      const action = body.action || "save";

      if (action === "save") {
        const { items, photo_url, input_type, raw_text_input, log_date } = body;
        if (!Array.isArray(items) || items.length === 0) {
          return NextResponse.json({ error: "Daftar item makanan kosong" }, { status: 400 });
        }

        const totalKcal = items.reduce((sum: number, it: any) => sum + (Number(it.calories_kcal) || 0), 0);
        let foodLogId = "log-" + Date.now();

        if (user) {
          const admin = createAdminClient();
          const { data: activeProg } = await admin
            .from("programs")
            .select("id, target_daily_kcal")
            .eq("user_id", user.id)
            .eq("status", "active")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          const { data: insertedLog, error: logError } = await admin
            .from("food_logs")
            .insert({
              user_id: user.id,
              program_id: activeProg?.id || null,
              input_type: input_type || "manual_text",
              photo_url: photo_url || null,
              raw_text_input: raw_text_input || null,
              ai_response_json: { items, total_calories_kcal: totalKcal },
              total_kcal: totalKcal,
              created_at: log_date ? `${log_date}T12:00:00Z` : new Date().toISOString(),
            })
            .select("id")
            .single();

          if (!logError && insertedLog) {
            foodLogId = insertedLog.id;
            const dailyTarget = activeProg?.target_daily_kcal || 1950;
            const itemsToInsert = items.map((item: any) => ({
              food_log_id: insertedLog.id,
              food_name: item.food_name,
              weight_g: Number(item.estimated_weight_g) || 100,
              calories_kcal: Number(item.calories_kcal) || 0,
              carbs_g: Number(item.macros?.carbs_g) || 0,
              protein_g: Number(item.macros?.protein_g) || 0,
              fat_g: Number(item.macros?.fat_g) || 0,
              fiber_g: Number(item.macros?.fiber_g) || 0,
              sugar_g: Number(item.macros?.sugar_g) || 0,
              micros_json: item.micros || {},
              pct_of_daily_kcal: Number(((Number(item.calories_kcal || 0) / dailyTarget) * 100).toFixed(1)),
            }));

            await admin.from("food_log_items").insert(itemsToInsert);
          }
        }

        const targetDailyKcal = 1950;
        const remainingKcal = Math.max(0, targetDailyKcal - totalKcal);

        return NextResponse.json({
          success: true,
          action: "save",
          food_log_id: foodLogId,
          total_kcal: totalKcal,
          target_daily_kcal: targetDailyKcal,
          remaining_daily_kcal: remainingKcal,
          message: "Catatan makanan berhasil disimpan ke database.",
        });
      }
    }

    // -------------------------------------------------------------------------
    // ACTION: ANALYZE (Multimodal / Text AI analysis with preview)
    // -------------------------------------------------------------------------
    const formData = await req.formData();
    const manualText = (formData.get("raw_text_input") as string | null)?.trim() || null;
    const photoFile = formData.get("photo") as File | null;
    const action = (formData.get("action") as string | null) || "analyze";

    // XOR Invariant enforcement: exactly one must be non-null
    if ((!photoFile && !manualText) || (photoFile && manualText)) {
      return NextResponse.json(
        { error: "Pilih tepat salah satu: upload foto ATAU masukkan teks deskripsi makanan." },
        { status: 400 }
      );
    }

    let photoUrl: string | null = null;
    let base64Image: string | null = null;
    let imageMimeType: string = "image/jpeg";

    if (photoFile) {
      const bytes = await photoFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      base64Image = buffer.toString("base64");
      imageMimeType = photoFile.type || "image/jpeg";

      // Upload to Supabase Storage if user exists
      if (user) {
        const fileExt = photoFile.name.split(".").pop() || "jpg";
        const filePath = `${user.id}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("food-photos")
          .upload(filePath, buffer, {
            contentType: imageMimeType,
            upsert: false,
          });

        if (!uploadError) {
          photoUrl = filePath;
        }
      } else {
        photoUrl = `mock-storage/${Date.now()}.jpg`;
      }
    }

    const promptText = `
Identifikasi setiap jenis makanan pada ${photoFile ? "foto makanan" : "deskripsi teks"} ini: "${manualText || "Analisis foto makanan yang dilampirkan"}", 
estimasikan berat dalam gram, lalu hitung kalori dan kandungan makro (karbohidrat, protein, lemak, serat, gula dalam gram) serta mikro nutrisinya (natrium, kalium, vitamin C dalam mg). 
Jika ragu, berikan estimasi terbaik berdasarkan porsi makanan umum Indonesia dan confidence score (0.1 s/d 1.0) — jangan pernah mengosongkan field.
`;

    let aiResult: any = null;
    let modelUsed = selectedModel;
    let isFallback = false;

    // Step 5: Reliable Gemini call with thinking_level HIGH, responseSchema, and 3x retry + backoff
    if (process.env.GEMINI_API_KEY) {
      const contents: any[] = [];
      if (base64Image) {
        contents.push({
          inlineData: {
            data: base64Image,
            mimeType: imageMimeType,
          },
        });
      }
      contents.push(promptText);

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const response = await gemini.models.generateContent({
            model: selectedModel,
            contents,
            config: {
              responseMimeType: "application/json",
              responseSchema: foodScanGeminiSchema,
              thinkingConfig: {
                thinkingLevel: "HIGH" as any,
              },
            },
          });

          const text = response.text || "";
          aiResult = JSON.parse(text);
          break; // Success!
        } catch (err: any) {
          console.warn(`[Gemini FoodScan] Attempt ${attempt} failed:`, err.message);
          if (attempt < 3) {
            // Exponential backoff: 1s, 2s
            await new Promise((res) => setTimeout(res, 1000 * Math.pow(2, attempt - 1)));
          }
        }
      }
    }

    // Deterministic fallback if all AI attempts failed
    if (!aiResult || !aiResult.items || aiResult.items.length === 0) {
      isFallback = true;
      const query = manualText || "Porsi Ransum Taktis";
      aiResult = {
        items: [
          {
            food_name: query.toLowerCase().includes("ayam") ? "Dada Ayam Panggang Taktis" : query,
            estimated_weight_g: 160,
            calories_kcal: 290,
            macros: { carbs_g: 10, protein_g: 38, fat_g: 8, fiber_g: 2, sugar_g: 1 },
            micros: { sodium_mg: 320, potassium_mg: 390, vitamin_c_mg: 5 },
            confidence: 0.85,
          },
        ],
        total_calories_kcal: 290,
        notes: "Analisis estimasi porsi standar deterministik (Fallback)",
      };
    }

    const validated = geminiNutritionResponseSchema.parse(aiResult);
    const totalKcal = validated.items.reduce((sum, item) => sum + item.calories_kcal, 0);

    // If request explicitly requested save immediately (legacy compatibility)
    if (action === "save_immediate" && user) {
      const { data: activeProg } = await supabase
        .from("programs")
        .select("id, target_daily_kcal")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      const { data: insertedLog } = await supabase
        .from("food_logs")
        .insert({
          user_id: user.id,
          program_id: activeProg?.id || null,
          input_type: photoFile ? "photo" : "manual_text",
          photo_url: photoUrl,
          raw_text_input: manualText,
          ai_response_json: validated,
          total_kcal: totalKcal,
        })
        .select("id")
        .single();

      if (insertedLog) {
        const dailyTarget = activeProg?.target_daily_kcal || 1950;
        const itemsToInsert = validated.items.map((item) => ({
          food_log_id: insertedLog.id,
          food_name: item.food_name,
          weight_g: item.estimated_weight_g,
          calories_kcal: item.calories_kcal,
          carbs_g: item.macros.carbs_g,
          protein_g: item.macros.protein_g,
          fat_g: item.macros.fat_g,
          fiber_g: item.macros.fiber_g,
          sugar_g: item.macros.sugar_g,
          micros_json: item.micros,
          pct_of_daily_kcal: Number(((item.calories_kcal / dailyTarget) * 100).toFixed(1)),
        }));
        await supabase.from("food_log_items").insert(itemsToInsert);
      }
    }

    return NextResponse.json({
      success: true,
      action: "analyze",
      preview: validated,
      data: validated, // backward compatibility
      total_kcal: totalKcal,
      model_used: modelUsed,
      is_fallback: isFallback,
      photo_url: photoUrl,
      input_type: photoFile ? "photo" : "manual_text",
      raw_text_input: manualText,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

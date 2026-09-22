import { NextResponse } from "next/server";
import { z } from "zod";
import { createHash } from "crypto";
import { gemini, PRIMARY_GEMINI_MODEL, FALLBACK_GEMINI_MODEL, resolveOfficialGeminiModel } from "@/lib/gemini/client";
import { deconstructFromNutritionDb } from "@/lib/nutrition/search";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { getStandardWibDate } from "@/lib/utils";


export const dynamic = "force-dynamic";
export const revalidate = 0;

interface FoodScanCacheEntry {
  result: any;
  modelUsed: string;
  isFallback: boolean;
  timestamp: number;
}
const foodScanCache = new Map<string, FoodScanCacheEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache

function cleanAiJsonResponse(rawText: string): any {
  if (!rawText || typeof rawText !== "string") return null;
  let cleaned = rawText.trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/, "")
    .replace(/\s*```$/, "");

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

const nutritionItemSchema = z.object({
  food_name: z.string().default("Item Makanan"),
  estimated_weight_g: z.coerce.number().default(100),
  calories_kcal: z.coerce.number().default(150),
  macros: z.object({
    carbs_g: z.coerce.number().default(0),
    protein_g: z.coerce.number().default(0),
    fat_g: z.coerce.number().default(0),
    fiber_g: z.coerce.number().default(0),
    sugar_g: z.coerce.number().default(0),
  }).default({ carbs_g: 0, protein_g: 0, fat_g: 0, fiber_g: 0, sugar_g: 0 }),
  micros: z.object({
    sodium_mg: z.coerce.number().optional().default(0),
    potassium_mg: z.coerce.number().optional().default(0),
    vitamin_c_mg: z.coerce.number().optional().default(0),
  }).optional().default({}),
  confidence: z.coerce.number().default(0.85),
});

const geminiNutritionResponseSchema = z.object({
  items: z.array(nutritionItemSchema).min(1),
  total_calories_kcal: z.coerce.number().optional().default(0),
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
    let logs: any[] = [];

    // Attempt 1: Query food_logs with both timestamp columns and joined items
    let res: any = await admin
      .from("food_logs")
      .select("id, logged_at, created_at, ai_response_json, total_kcal, food_log_items(*)")
      .eq("user_id", user.id)
      .order("logged_at", { ascending: true });

    // Attempt 2: If joined query or logged_at order failed, query food_logs standalone
    if (res.error) {
      console.warn("[food-log GET] Join query failed, falling back to food_logs standalone:", res.error.message);
      res = await admin
        .from("food_logs")
        .select("id, logged_at, created_at, ai_response_json, total_kcal")
        .eq("user_id", user.id);
    }

    // Attempt 3: General fallback
    if (res.error) {
      console.warn("[food-log GET] Standalone query failed, trying simple select:", res.error.message);
      res = await admin
        .from("food_logs")
        .select("*")
        .eq("user_id", user.id);
    }

    if (res.data && Array.isArray(res.data)) {
      logs = res.data;
    }

    const items: any[] = [];
    if (logs.length > 0) {
      for (const log of logs) {
        const timestamp = log.logged_at || log.created_at;
        if (date && timestamp) {
          const dateStr = String(timestamp);
          const rawDatePart = dateStr.split(/[T\s]/)[0];

          let wibDatePart = "";
          try {
            const d = new Date(timestamp);
            if (!isNaN(d.getTime())) {
              wibDatePart = getStandardWibDate(d);
            }
          } catch {}

          // Filter by date across raw date, UTC, or WIB date boundaries
          if (rawDatePart !== date && wibDatePart !== date) {
            continue;
          }
        }

        const timeStr = timestamp
          ? new Date(timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB"
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

          // Prepare clean inputs that GUARANTEE constraint satisfaction:
          // CONSTRAINT chk_food_logs_photo_or_text CHECK ((photo_url IS NOT NULL) <> (raw_text_input IS NOT NULL))
          const isPhotoMode = input_type === "photo" || Boolean(photo_url);
          let safePhotoUrl: string | null = null;
          let safeRawText: string | null = null;

          if (isPhotoMode) {
            safePhotoUrl = photo_url || `photo-scan/${user.id}-${Date.now()}.jpg`;
            safeRawText = null; // Enforce XOR constraint in DB
          } else {
            safeRawText = raw_text_input ? String(raw_text_input).trim() : "Catatan Menu Manual";
            safePhotoUrl = null; // Enforce XOR constraint in DB
          }

          const logTimestamp = log_date ? `${log_date}T12:00:00Z` : new Date().toISOString();

          // Insert into food_logs with fallback between logged_at and created_at
          let insertedLog: any = null;
          let logError: any = null;

          const baseInsertData: any = {
            user_id: user.id,
            program_id: activeProg?.id || null,
            input_type: isPhotoMode ? "photo" : "manual_text",
            photo_url: safePhotoUrl,
            raw_text_input: safeRawText,
            ai_response_json: {
              items,
              notes: raw_text_input || null,
              total_calories_kcal: totalKcal,
            },
            total_kcal: totalKcal,
          };

          // Try with logged_at first (standard in 0001_initial_schema.sql)
          const res1 = await admin
            .from("food_logs")
            .insert({ ...baseInsertData, logged_at: logTimestamp })
            .select("id")
            .single();

          if (res1.error) {
            // Fallback to created_at
            const res2 = await admin
              .from("food_logs")
              .insert({ ...baseInsertData, created_at: logTimestamp })
              .select("id")
              .single();

            insertedLog = res2.data;
            logError = res2.error;
          } else {
            insertedLog = res1.data;
            logError = null;
          }

          if (logError) {
            console.error("[food-log] Error inserting into food_logs:", logError);
            return NextResponse.json({ error: "Gagal menyimpan ke database: " + logError.message }, { status: 500 });
          }

          if (insertedLog) {
            foodLogId = insertedLog.id;
            const dailyTarget = activeProg?.target_daily_kcal || 1950;
            const itemsToInsert = items.map((item: any) => ({
              food_log_id: insertedLog.id,
              food_name: item.food_name,
              weight_g: Number(item.weight_g || item.estimated_weight_g) || 100,
              calories_kcal: Number(item.calories_kcal) || 0,
              carbs_g: Number(item.carbs_g || item.macros?.carbs_g) || 0,
              protein_g: Number(item.protein_g || item.macros?.protein_g) || 0,
              fat_g: Number(item.fat_g || item.macros?.fat_g) || 0,
              fiber_g: Number(item.fiber_g || item.macros?.fiber_g) || 0,
              sugar_g: Number(item.sugar_g || item.macros?.sugar_g) || 0,
              micros_json: item.micros || {},
              pct_of_daily_kcal: Number(((Number(item.calories_kcal || 0) / dailyTarget) * 100).toFixed(1)),
            }));

            const { error: itemsError } = await admin.from("food_log_items").insert(itemsToInsert);
            if (itemsError) {
              console.warn("[food-log] Warning inserting food_log_items:", itemsError.message);
            }
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
    const formModel = (formData.get("model") as string | null)?.trim();
    const headerModel = req.headers.get("x-ai-model")?.trim();
    let effectiveModel = formModel || headerModel || selectedModel || PRIMARY_GEMINI_MODEL;

    effectiveModel = resolveOfficialGeminiModel(effectiveModel);

    // Per-client rate limit for AI inference (60 requests / minute)
    const rawIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "client-local";
    const clientIp = rawIp.split(",")[0].trim();
    const rl = checkRateLimit(`food-scan:${clientIp}`, { limit: 60, windowMs: 60 * 1000 });
    if (!rl.success) {
      return NextResponse.json(
        { error: "Batas permintaan analisis terlampaui. Silakan tunggu sebentar sebelum menganalisis makanan lagi." },
        { status: 429 }
      );
    }

    // Validate that at least one input is provided (photo or text or both)
    if (!photoFile && !manualText) {
      return NextResponse.json(
        { error: "Silakan upload foto ransum atau ketik deskripsi makanan terlebih dahulu." },
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
      // Sanitize mime type for Gemini (ensure standard image formats)
      if (!imageMimeType.startsWith("image/")) {
        imageMimeType = "image/jpeg";
      }

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

    // Hash-based caching: SHA-256 over image byte stream / manual text + model
    const hash = createHash("sha256");
    if (base64Image) {
      hash.update(base64Image);
    }
    if (manualText) {
      hash.update(manualText);
    }
    hash.update(effectiveModel);
    const cacheKey = hash.digest("hex");

    const cachedEntry = foodScanCache.get(cacheKey);
    if (cachedEntry && (Date.now() - cachedEntry.timestamp < CACHE_TTL_MS)) {
      const validated = geminiNutritionResponseSchema.parse(cachedEntry.result);
      const totalKcal = validated.items.reduce((sum, item) => sum + item.calories_kcal, 0);

      return NextResponse.json({
        success: true,
        action: "analyze",
        preview: validated,
        data: validated,
        total_kcal: totalKcal,
        model_used: cachedEntry.modelUsed,
        is_fallback: cachedEntry.isFallback,
        is_cached: true,
        photo_url: photoUrl,
        input_type: photoFile ? "photo" : "manual_text",
        raw_text_input: manualText,
      });
    }

    const promptText = `
Identifikasi dan dekonstruksi secara rinci SETIAP item makanan dan minuman pada ${photoFile ? "foto makanan yang dilampirkan" : "deskripsi teks"}.
${manualText ? `Keterangan/catatan porsi dari pengguna: "${manualText}".` : ""}

ATURAN DEKONSTRUKSI MULTI-ITEM (WAJIB DIIKUTI):
1. PISAHKAN SETIAP ITEM: Uraikan setiap komponen hidangan menjadi item individual terpisah di dalam array 'items'. JANGAN PERNAH menggabungkan beberapa hidangan berbeda menjadi satu item tunggal (misal: "Nasi Padang Komplit" HARUS dipecah menjadi Nasi Putih, Rendang Sapi, Sayur Daun Singkong, Sambal Ijo, dll).
2. PARSING MULTI-MENU TEKS: Jika teks pengguna berisi daftar menu (dipisahkan koma, baris baru, tanda tambah (+), nomor, kata 'dan', 'dengan', 'lauknya', atau porsi seperti '2 butir', '1 piring', '3 potong'), kenali dan parsing setiap makanan secara terpisah beserta perkalian porsi dan gramasinya.
3. ESTIMASI REALISTIS: Estimasikan berat gram sesuai porsi makanan umum Indonesia, lalu hitung kalori (kcal), makronutrisi (karbohidrat, protein, lemak, serat, gula dalam gram), serta mikronutrisi (natrium, kalium, vitamin C dalam mg).
4. OUTPUT: Kembalikan strictly JSON valid berformat:
{
  "items": [
    {
      "food_name": "Nama Makanan",
      "estimated_weight_g": 150,
      "calories_kcal": 200,
      "macros": { "carbs_g": 25, "protein_g": 10, "fat_g": 5, "fiber_g": 2, "sugar_g": 1 },
      "micros": { "sodium_mg": 120, "potassium_mg": 180, "vitamin_c_mg": 5 },
      "confidence": 0.9
    }
  ],
  "total_calories_kcal": 200,
  "notes": "Analisis terinci per item"
}
`;

    let aiResult: any = null;
    let modelUsed = effectiveModel;
    let isFallback = false;

    // -------------------------------------------------------------------------
    // MULTI-PROVIDER RESILIENT EXECUTION CASCADE
    // Ensures seamless failover between Gemini, OpenAI, and DeepSeek if any hit 429 quota/rate limit
    // -------------------------------------------------------------------------

    // Runner 1: OpenAI (supports vision + text)
    // Runner 1: OpenAI (supports vision + text)
    const runOpenAi = async (modelToUse?: string) => {
      if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.includes("placeholder")) return null;
      const oaiModels = [
        modelToUse,
        effectiveModel.startsWith("gpt-") ? effectiveModel : null,
        "gpt-5.6-luna",
        "gpt-5-thinking-mini",
        "gpt-4o",
        "gpt-4o-mini",
      ].filter(Boolean) as string[];

      const userContent: any[] = [
        {
          type: "text",
          text: `${promptText}\nOutput strictly valid JSON with format: {"items":[{"food_name":"...","estimated_weight_g":100,"calories_kcal":200,"macros":{"carbs_g":20,"protein_g":15,"fat_g":5,"fiber_g":2,"sugar_g":1},"micros":{"sodium_mg":150,"potassium_mg":150,"vitamin_c_mg":5},"confidence":0.9}],"total_calories_kcal":200}`,
        },
      ];
      if (base64Image) {
        userContent.push({
          type: "image_url",
          image_url: { url: `data:${imageMimeType};base64,${base64Image}` },
        });
      }

      for (const currentOaiModel of oaiModels) {
        try {
          const oaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
              model: currentOaiModel,
              messages: [{ role: "user", content: userContent }],
              response_format: { type: "json_object" },
              temperature: 0.2,
              max_tokens: 2048,
            }),
          });

          if (oaiRes.ok) {
            const oaiData = await oaiRes.json();
            const rawContent = oaiData.choices?.[0]?.message?.content || "";
            const parsed = cleanAiJsonResponse(rawContent) || JSON.parse(rawContent || "{}");
            if (parsed && Array.isArray(parsed.items) && parsed.items.length > 0) {
              return { result: parsed, candidate: currentOaiModel };
            }
          } else {
            const errData = await oaiRes.json().catch(() => ({}));
            console.warn(`[OpenAI FoodScan] Model ${currentOaiModel} response not ok:`, errData);
          }
        } catch (oaiErr: any) {
          console.warn(`[OpenAI FoodScan] Error on ${currentOaiModel}:`, oaiErr.message);
        }
      }
      return null;
    };

    // Runner 2: DeepSeek (supports text inference)
    const runDeepSeek = async (modelToUse?: string) => {
      if (!process.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY.includes("placeholder")) return null;
      const dsModels = [
        modelToUse,
        effectiveModel.startsWith("deepseek-") ? effectiveModel : null,
        "deepseek-v4-flash",
        "deepseek-v4-pro",
        "deepseek-chat",
      ].filter(Boolean) as string[];

      const dsPrompt = `${promptText}\nOutput strictly valid JSON with format: {"items":[{"food_name":"...","estimated_weight_g":100,"calories_kcal":200,"macros":{"carbs_g":20,"protein_g":15,"fat_g":5,"fiber_g":2,"sugar_g":1},"micros":{"sodium_mg":150,"potassium_mg":150,"vitamin_c_mg":5},"confidence":0.9}],"total_calories_kcal":200}`;

      for (const currentDsModel of dsModels) {
        try {
          const dsRes = await fetch("https://api.deepseek.com/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
            },
            body: JSON.stringify({
              model: currentDsModel,
              messages: [{ role: "user", content: dsPrompt }],
              response_format: { type: "json_object" },
              temperature: 0.2,
              max_tokens: 2048,
            }),
          });

          if (dsRes.ok) {
            const dsData = await dsRes.json();
            const rawContent = dsData.choices?.[0]?.message?.content || "";
            const parsed = cleanAiJsonResponse(rawContent) || JSON.parse(rawContent || "{}");
            if (parsed && Array.isArray(parsed.items) && parsed.items.length > 0) {
              return { result: parsed, candidate: currentDsModel };
            }
          }
        } catch (dsErr: any) {
          console.warn(`[DeepSeek FoodScan] Error on ${currentDsModel}:`, dsErr.message);
        }
      }
      return null;
    };

    // Runner 3: Google Gemini (supports vision + text with model cascade)
    let lastAiError: string | null = null;
    const runGemini = async () => {
      if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "placeholder-gemini-key") {
        lastAiError = "Kunci GEMINI_API_KEY belum dikonfigurasi di Environment Variable server.";
        return null;
      }
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

      const officialModel = resolveOfficialGeminiModel(effectiveModel);
      const candidateModels = [
        officialModel,
        "gemini-3.8-flash",
        "gemini-3.7-flash",
        "gemini-3.5-flash-lite",
        "gemini-2.5-flash",
        "gemini-2.5-flash-lite",
        "gemini-2.5-pro",
      ].filter((m, i, arr) => arr.indexOf(m) === i);

      for (const currentCandidate of candidateModels) {
        try {
          const response = await gemini.models.generateContent({
            model: currentCandidate,
            contents,
            config: {
              responseMimeType: "application/json",
              temperature: 0.2,
              maxOutputTokens: 2048,
            },
          });

          const text = response.text || "";
          if (text) {
            const parsed = cleanAiJsonResponse(text) || JSON.parse(text);
            if (parsed && Array.isArray(parsed.items) && parsed.items.length > 0) {
              return { result: parsed, candidate: currentCandidate };
            }
          }
        } catch (err: any) {
          lastAiError = err.message || `Error pada model ${currentCandidate}`;
          console.warn(`[Gemini FoodScan] Model ${currentCandidate} failed:`, err.message);
        }
      }
      return null;
    };

    // Execute based on active model preference with automatic cascade to all available keys in Vercel
    if (effectiveModel.startsWith("gpt-")) {
      const oaiRes = await runOpenAi(effectiveModel);
      if (oaiRes) {
        aiResult = oaiRes.result;
        modelUsed = oaiRes.candidate;
      } else {
        // Failover 1: Gemini
        const gemRes = await runGemini();
        if (gemRes) {
          aiResult = gemRes.result;
          modelUsed = gemRes.candidate;
        } else {
          // Failover 2: DeepSeek
          const dsRes = await runDeepSeek();
          if (dsRes) {
            aiResult = dsRes.result;
            modelUsed = dsRes.candidate;
          }
        }
      }
    } else if (effectiveModel.startsWith("deepseek-")) {
      const dsRes = await runDeepSeek(effectiveModel);
      if (dsRes) {
        aiResult = dsRes.result;
        modelUsed = dsRes.candidate;
      } else {
        // Failover 1: Gemini
        const gemRes = await runGemini();
        if (gemRes) {
          aiResult = gemRes.result;
          modelUsed = gemRes.candidate;
        } else {
          // Failover 2: OpenAI
          const oaiRes = await runOpenAi();
          if (oaiRes) {
            aiResult = oaiRes.result;
            modelUsed = oaiRes.candidate;
          }
        }
      }
    } else {
      // Default: Google Gemini
      const gemRes = await runGemini();
      if (gemRes) {
        aiResult = gemRes.result;
        modelUsed = gemRes.candidate;
      } else {
        // AUTOMATIC FAILOVER: If Gemini quota is exceeded (429) or overloaded, use OpenAI or DeepSeek from Vercel!
        if (process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes("placeholder")) {
          console.info("[FoodScan] Gemini unavailable. Automatically failing over to OpenAI...");
          const oaiRes = await runOpenAi();
          if (oaiRes) {
            aiResult = oaiRes.result;
            modelUsed = `${oaiRes.candidate} (Failover)`;
          }
        }
        if (!aiResult && process.env.DEEPSEEK_API_KEY && !process.env.DEEPSEEK_API_KEY.includes("placeholder")) {
          console.info("[FoodScan] Automatically failing over to DeepSeek...");
          const dsRes = await runDeepSeek();
          if (dsRes) {
            aiResult = dsRes.result;
            modelUsed = `${dsRes.candidate} (Failover)`;
          }
        }
      }
    }

    // STRICT AI POLICY FOR PHOTO SCANS:
    // If the user uploaded a photo, do NOT return a fake generic meal (e.g. Nasi Putih + Ayam).
    // The user expects actual AI vision analysis. If AI fails, return an honest error so they can retry or use manual search.
    if (photoFile && (!aiResult || !aiResult.items || aiResult.items.length === 0)) {
      return NextResponse.json(
        {
          error: `Gagal memproses analisis foto dengan AI: ${lastAiError || "Layanan AI sedang sibuk atau kuota terlampaui"}. Silakan coba bidik ulang foto, atau gunakan tab 'Kamus Gizi' untuk mencari makanan secara manual.`,
        },
        { status: 502 }
      );
    }

    // For manual text input only: if AI fails, deconstruct from 10,010-item verified nutrition database
    if (!aiResult || !aiResult.items || aiResult.items.length === 0) {
      isFallback = true;
      if (manualText && manualText.trim().length > 0) {
        aiResult = deconstructFromNutritionDb(manualText.trim());
      } else {
        return NextResponse.json(
          { error: "Deskripsi menu makanan tidak dapat dianalisis. Silakan masukkan nama makanan yang lebih jelas." },
          { status: 400 }
        );
      }
    }

    const validated = geminiNutritionResponseSchema.parse(aiResult);
    const totalKcal = validated.items.reduce((sum, item) => sum + (Number(item.calories_kcal) || 0), 0);
    validated.total_calories_kcal = totalKcal;

    // Save to short-lived in-memory cache
    if (validated && Array.isArray(validated.items) && validated.items.length > 0) {
      foodScanCache.set(cacheKey, {
        result: validated,
        modelUsed,
        isFallback,
        timestamp: Date.now(),
      });
      if (foodScanCache.size > 100) {
        const oldestKey = foodScanCache.keys().next().value;
        if (oldestKey) foodScanCache.delete(oldestKey);
      }
    }

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

export async function DELETE(req: Request) {
  try {
    const supabase = createServerClient(req);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: true, message: "Dihapus secara lokal" });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID item wajib disertakan" }, { status: 400 });
    }

    const admin = createAdminClient();
    // Attempt delete from food_log_items first
    await admin.from("food_log_items").delete().eq("id", id);
    // Or if id matches a parent food_logs row
    await admin.from("food_logs").delete().eq("id", id).eq("user_id", user.id);

    return NextResponse.json({ success: true, message: "Item berhasil dihapus dari database" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


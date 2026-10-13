import { NextResponse } from "next/server";
import { z } from "zod";
import { createHash } from "crypto";
import { PRIMARY_GEMINI_MODEL, resolveOfficialGeminiModel } from "@/lib/gemini/client";
import { deconstructFromNutritionDb } from "@/lib/nutrition/search";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { getStandardWibDate } from "@/lib/utils";
import { resolveUserAiAccess } from "@/lib/ai/user-keys";
import { callAI } from "@/lib/ai/adapter";
import { AiError } from "@/lib/ai/types";
import { isModelVisionSupported } from "@/lib/ai/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface FoodScanCacheEntry {
  result: any;
  modelUsed: string;
  isFallback: boolean;
  timestamp: number;
}
const foodScanCache = new Map<string, FoodScanCacheEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000;

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

export async function GET(req: Request) {
  try {
    const supabase = createServerClient(req);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: true, items: [] });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const targetDateStr = date || getStandardWibDate();

    const startOfDay = `${targetDateStr}T00:00:00.000Z`;
    const endOfDay = `${targetDateStr}T23:59:59.999Z`;

    const admin = createAdminClient();
    const { data: logs, error } = await admin
      .from("food_logs")
      .select("id, logged_at, created_at, photo_url, raw_text_input, total_kcal, ai_response_json")
      .eq("user_id", user.id)
      .or(`logged_at.gte.${startOfDay},created_at.gte.${startOfDay}`)
      .or(`logged_at.lte.${endOfDay},created_at.lte.${endOfDay}`)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const items: any[] = [];
    if (logs && logs.length > 0) {
      for (const log of logs) {
        const timeStr = new Date(log.logged_at || log.created_at).toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        });

        const { data: dbItems } = await admin
          .from("food_log_items")
          .select("*")
          .eq("food_log_id", log.id);

        if (dbItems && dbItems.length > 0) {
          for (const item of dbItems) {
            items.push({
              id: item.id,
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
  // 1. Guard payload size: Reject requests over 3 MB with clear explanation
  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > 3 * 1024 * 1024) {
    return NextResponse.json(
      {
        error: "AI_BODY_TOO_LARGE",
        message: "Ukuran unggahan melebihi batas maksimal 3 MB. Silakan gunakan foto dengan ukuran lebih kecil.",
        action: "retry",
        actionLabel: "Pilih foto dengan ukuran di bawah 3 MB",
      },
      { status: 413 }
    );
  }

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

          const isPhotoMode = input_type === "photo" || Boolean(photo_url);
          let safePhotoUrl: string | null = null;
          let safeRawText: string | null = null;

          if (isPhotoMode) {
            safePhotoUrl = photo_url || `photo-scan/${user.id}-${Date.now()}.jpg`;
            safeRawText = null;
          } else {
            safeRawText = raw_text_input ? String(raw_text_input).trim() : "Catatan Menu Manual";
            safePhotoUrl = null;
          }

          const logTimestamp = log_date ? `${log_date}T12:00:00Z` : new Date().toISOString();

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

          const attemptA = await admin.from("food_logs").insert({
            ...baseInsertData,
            logged_at: logTimestamp,
            created_at: logTimestamp,
          }).select("id").single();

          if (!attemptA.error && attemptA.data) {
            insertedLog = attemptA.data;
          } else {
            const attemptB = await admin.from("food_logs").insert({
              ...baseInsertData,
              logged_at: logTimestamp,
            }).select("id").single();

            if (!attemptB.error && attemptB.data) {
              insertedLog = attemptB.data;
            } else {
              logError = attemptB.error || attemptA.error;
            }
          }

          if (logError) {
            console.error("[food-log] Gagal menyimpan food_logs:", logError.message);
            return NextResponse.json({ error: "Gagal menyimpan log makanan: " + logError.message }, { status: 500 });
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
              console.warn("[food-log] Peringatan insert food_log_items:", itemsError.message);
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
    // ACTION: ANALYZE (Scanner Vision & Text via BYOK callAI)
    // -------------------------------------------------------------------------
    if (!user) {
      return NextResponse.json(
        { error: "Sesi tidak valid atau telah berakhir. Silakan login terlebih dahulu." },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const manualText = (formData.get("raw_text_input") as string | null)?.trim() || null;
    const photoFile = formData.get("photo") as File | null;
    const action = (formData.get("action") as string | null) || "analyze";
    const formModel = (formData.get("model") as string | null)?.trim();
    const headerModel = req.headers.get("x-ai-model")?.trim();
    let effectiveModel = formModel || headerModel || selectedModel || PRIMARY_GEMINI_MODEL;

    // Check individual photo file size <= 3 MB
    if (photoFile && photoFile.size > 3 * 1024 * 1024) {
      return NextResponse.json(
        {
          error: "AI_BODY_TOO_LARGE",
          message: "Ukuran file foto melebihi batas maksimal 3 MB. Silakan pilih foto dengan ukuran lebih kecil.",
          action: "retry",
          actionLabel: "Pilih foto di bawah 3 MB",
        },
        { status: 413 }
      );
    }

    // Rate limiting
    const rawIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "client-local";
    const clientIp = rawIp.split(",")[0].trim();
    const rl = checkRateLimit(`food-scan:${clientIp}`, { limit: 60, windowMs: 60 * 1000 });
    if (!rl.success) {
      return NextResponse.json(
        { error: "Batas permintaan analisis terlampaui. Silakan tunggu sebentar." },
        { status: 429 }
      );
    }

    // Validate input existence
    if (!photoFile && !manualText) {
      return NextResponse.json(
        { error: "Silakan upload foto ransum atau ketik deskripsi makanan terlebih dahulu." },
        { status: 400 }
      );
    }

    // 2. BYOK Key & Model Permission Gatekeeper
    let access;
    try {
      access = await resolveUserAiAccess(user.id, effectiveModel);
    } catch (err: unknown) {
      if (err instanceof AiError) {
        return NextResponse.json(err.toJSON(), {
          status: err.code === "AI_KEY_REQUIRED" ? 403 : 400,
        });
      }
      throw err;
    }

    const { selectedKey, availableKeys } = access;

    // 3. Vision check upfront: reject non-vision model before calling API
    if (photoFile && !isModelVisionSupported(effectiveModel)) {
      const visionErr = new AiError("AI_MODEL_NO_VISION", {
        provider: selectedKey.provider,
        last4: selectedKey.last4,
        message: `Model "${effectiveModel}" tidak mendukung analisis gambar atau foto makanan. Silakan ganti ke model yang mendukung Vision (seperti Gemini Flash).`,
      });
      return NextResponse.json(visionErr.toJSON(), { status: 400 });
    }

    let photoUrl: string | null = null;
    let base64Image: string | null = null;
    let imageMimeType: string = "image/jpeg";

    if (photoFile) {
      const bytes = await photoFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      base64Image = buffer.toString("base64");
      imageMimeType = photoFile.type || "image/jpeg";
      if (!imageMimeType.startsWith("image/")) {
        imageMimeType = "image/jpeg";
      }

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

    // 4. Single Unified AI Call via BYOK
    try {
      const aiResponse = await callAI({
        provider: selectedKey.provider,
        model: effectiveModel,
        apiKey: selectedKey.key,
        baseUrl: selectedKey.baseUrl,
        messages: [{ role: "user", content: promptText }],
        image: photoFile && base64Image ? { base64: base64Image, mimeType: imageMimeType } : undefined,
        schema: geminiNutritionResponseSchema,
        availableKeys,
      });

      aiResult = aiResponse.data;
      modelUsed = aiResponse.model;
    } catch (aiErr: unknown) {
      if (aiErr instanceof AiError) {
        // Photo scan fails explicitly with structured error
        if (photoFile) {
          return NextResponse.json(aiErr.toJSON(), {
            status: aiErr.code === "AI_KEY_REQUIRED" ? 403 : aiErr.code === "AI_MODEL_NO_VISION" ? 400 : 500,
          });
        }
        // Text fallback continues to local dictionary
        console.warn("[FoodScan] AI gagal pada manual text, beralih ke Kamus Gizi:", aiErr.message);
      } else {
        throw aiErr;
      }
    }

    // 5. Fallback for manual text input only
    if (!aiResult || !aiResult.items || aiResult.items.length === 0) {
      if (photoFile) {
        return NextResponse.json(
          {
            error: "AI_BAD_OUTPUT",
            message: "AI tidak dapat mengenali item makanan pada foto. Silakan bidik ulang dengan pencahayaan lebih jelas atau cari di Kamus Gizi.",
            action: "nutrition_dictionary",
            actionLabel: "Cari manual di Kamus Gizi",
          },
          { status: 502 }
        );
      }

      isFallback = true;
      if (manualText && manualText.trim().length > 0) {
        aiResult = deconstructFromNutritionDb(manualText.trim());
        modelUsed = "Kamus Gizi (Lokal)";
      } else {
        return NextResponse.json(
          { error: "Deskripsi makanan tidak dapat diproses." },
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

    // If request requested save immediately
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
      data: validated,
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
    await admin.from("food_log_items").delete().eq("id", id);
    await admin.from("food_logs").delete().eq("id", id).eq("user_id", user.id);

    return NextResponse.json({ success: true, message: "Item berhasil dihapus dari database" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

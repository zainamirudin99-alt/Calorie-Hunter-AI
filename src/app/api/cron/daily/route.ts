import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  return handleDailyCron(req);
}

export async function POST(req: Request) {
  return handleDailyCron(req);
}

async function handleDailyCron(req: Request) {
  const startTime = Date.now();
  const now = new Date().toISOString();

  // Strict Vercel Cron authorization header check
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: "Unauthorized: Header Authorization Bearer CRON_SECRET tidak valid." },
      { status: 401 }
    );
  }

  const admin = createAdminClient();

  // 1. Supabase Keep-Alive
  let keepAliveStatus = "table_log";
  const { error: insertError } = await admin
    .from("system_keep_alive_logs")
    .insert({
      service_name: "calorie-hunter-daily-cron",
      status: "alive",
      ping_timestamp: now,
      details: {
        trigger: "daily_cron",
        timestamp: Date.now(),
      },
    });

  if (insertError) {
    keepAliveStatus = "table_touch_fallback";
    await admin.from("profiles").select("id").limit(1);
  } else {
    // Delete logs older than 14 days
    try {
      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      await admin
        .from("system_keep_alive_logs")
        .delete()
        .lt("ping_timestamp", fourteenDaysAgo);
    } catch {}
  }

  // 2. Bersihkan program yang sudah expired
  let expiredCount = 0;
  const { data: expiredList, error: fetchErr } = await admin
    .from("programs")
    .select("id")
    .eq("status", "active")
    .lt("end_date", now);

  if (!fetchErr && expiredList && expiredList.length > 0) {
    const ids = expiredList.map((p) => p.id);
    const { error: updateErr } = await admin
      .from("programs")
      .update({ status: "expired" })
      .in("id", ids);

    if (!updateErr) {
      expiredCount = ids.length;
    }
  }

  const latencyMs = Date.now() - startTime;

  return NextResponse.json({
    success: true,
    cron: "daily",
    timestamp: now,
    latency_ms: latencyMs,
    keep_alive: {
      status: keepAliveStatus,
    },
    expired_programs_cleaned: expiredCount,
    message: `Cron harian selesai. Keep-alive tercatat, ${expiredCount} program expired dibersihkan.`,
  });
}

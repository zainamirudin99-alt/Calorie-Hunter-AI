import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  return handleKeepAlive(req);
}

export async function POST(req: Request) {
  return handleKeepAlive(req);
}

async function handleKeepAlive(req: Request) {
  const startTime = Date.now();
  const now = new Date().toISOString();

  try {
    const url = new URL(req.url);
    const triggerSource = url.searchParams.get("source") || "cron";

    const admin = createAdminClient();
    let activityMode = "table_log";

    // 1. Attempt writing a heartbeat row to system_keep_alive_logs
    const { error: insertError } = await admin
      .from("system_keep_alive_logs")
      .insert({
        service_name: "calorie-hunter-keepalive",
        status: "alive",
        ping_timestamp: now,
        details: {
          trigger: triggerSource,
          timestamp: Date.now(),
        },
      });

    // 2. Fallback: If table does not exist yet, touch profiles table to ensure active SQL activity
    if (insertError) {
      activityMode = "table_touch_fallback";
      await admin
        .from("profiles")
        .select("id")
        .limit(1);
    } else {
      // Periodic automatic cleanup: delete records older than 14 days to keep storage negligible (<50KB)
      try {
        const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
        await admin
          .from("system_keep_alive_logs")
          .delete()
          .lt("ping_timestamp", fourteenDaysAgo);
      } catch {}
    }

    const latencyMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      service: "calorie-hunter-ai",
      status: "supabase_activity_logged",
      mode: activityMode,
      timestamp: now,
      latency_ms: latencyMs,
      message: "Aktivitas database Supabase berhasil dicatat. Timer 7 hari inaktivitas ter-reset.",
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to log keep-alive",
      timestamp: now,
    }, { status: 500 });
  }
}

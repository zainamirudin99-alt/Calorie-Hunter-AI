import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET || "chai-cron-secret";

    // Verify Vercel Cron authorization header
    if (authHeader !== `Bearer ${cronSecret}`) {
      const url = new URL(req.url);
      const querySecret = url.searchParams.get("secret");
      if (querySecret !== cronSecret) {
        return NextResponse.json({ error: "Unauthorized cron request" }, { status: 401 });
      }
    }

    const supabase = createAdminClient();
    const now = new Date().toISOString();

    // ADR-5: Find all active programs whose 180-day end_date has passed
    const { data: expiredPrograms, error: fetchError } = await supabase
      .from("programs")
      .select("id, user_id")
      .eq("status", "active")
      .lt("end_date", now);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    let updatedCount = 0;

    if (expiredPrograms && expiredPrograms.length > 0) {
      const idsToExpire = expiredPrograms.map((p) => p.id);
      const { error: updateError } = await supabase
        .from("programs")
        .update({ status: "expired" })
        .in("id", idsToExpire);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      updatedCount = idsToExpire.length;
    }

    return NextResponse.json({
      success: true,
      message: `Pemeriksaan reassessment selesai. ${updatedCount} program ditandai expired.`,
      expired_count: updatedCount,
      timestamp: now,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

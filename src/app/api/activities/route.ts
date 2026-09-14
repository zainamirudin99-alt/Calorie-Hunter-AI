import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";

const activitySchema = z.object({
  activity_name: z.string().min(1, "Nama aktivitas tidak boleh kosong"),
  frequency_per_week: z.number().int().min(0).max(7, "Frekuensi harus antara 0 - 7 kali per minggu"),
  duration_minutes: z.number().int().positive("Durasi harus lebih dari 0 menit"),
  intensity: z.enum(["low", "moderate", "high"], {
    errorMap: () => ({ message: "Pilih intensitas low, moderate, atau high" }),
  }),
});

export async function GET(req: Request) {
  try {
    const supabase = createServerClient(req);
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: activities, error } = await supabase
      .from("weekly_activities")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ activities: activities || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = createServerClient(req);
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parseResult = activitySchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { activity_name, frequency_per_week, duration_minutes, intensity } = parseResult.data;

    const { data: newActivity, error } = await supabase
      .from("weekly_activities")
      .insert({
        user_id: user.id,
        activity_name,
        frequency_per_week,
        duration_minutes,
        intensity,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Aktivitas berhasil ditambahkan",
      activity: newActivity,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = createServerClient(req);
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Parameter id aktivitas wajib disertakan" }, { status: 400 });
    }

    const { error } = await supabase
      .from("weekly_activities")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Aktivitas berhasil dihapus" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

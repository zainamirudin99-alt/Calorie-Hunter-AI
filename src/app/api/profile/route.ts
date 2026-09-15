import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";

const profileSchema = z.object({
  full_name: z.string().optional(),
  gender: z.enum(["male", "female"], {
    errorMap: () => ({ message: "Pilih jenis kelamin pria atau wanita" }),
  }),
  age: z.number().int().min(10, "Usia minimal 10 tahun").max(100, "Usia maksimal 100 tahun"),
  height_cm: z.number().positive("Tinggi badan harus lebih dari 0"),
  weight_kg: z.number().positive("Berat badan harus lebih dari 0"),
  activity_level: z.enum(["sedentary", "light", "moderate", "active", "very_active"], {
    errorMap: () => ({ message: "Pilih level aktivitas fisik yang valid" }),
  }),
});

export async function GET(req: Request) {
  try {
    const supabase = createServerClient(req);
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: profile, error } = await admin
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ profile });
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
    const parseResult = profileSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const profileData = parseResult.data;

    // Upsert profile with admin client to prevent RLS or missing row errors
    const admin = createAdminClient();
    const { data: updatedProfile, error: updateError } = await admin
      .from("profiles")
      .upsert({
        id: user.id,
        full_name: profileData.full_name || null,
        gender: profileData.gender,
        age: profileData.age,
        height_cm: profileData.height_cm,
        weight_kg: profileData.weight_kg,
        activity_level: profileData.activity_level,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Automatically record an initial weight log if none exists or as latest log
    try {
      await admin.from("weight_logs").insert({
        user_id: user.id,
        weight_kg: profileData.weight_kg,
        note: "Catatan awal dari form data diri",
        logged_at: new Date().toISOString(),
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: "Profil berhasil diperbarui",
      profile: updatedProfile,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

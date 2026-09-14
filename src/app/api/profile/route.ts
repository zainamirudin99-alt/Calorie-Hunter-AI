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

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

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

    // Update profile
    const { data: updatedProfile, error: updateError } = await supabase
      .from("profiles")
      .update({
        full_name: profileData.full_name || null,
        gender: profileData.gender,
        age: profileData.age,
        height_cm: profileData.height_cm,
        weight_kg: profileData.weight_kg,
        activity_level: profileData.activity_level,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Automatically record an initial weight log if none exists or as latest log
    await supabase.from("weight_logs").insert({
      user_id: user.id,
      weight_kg: profileData.weight_kg,
      note: "Catatan awal dari form data diri",
      logged_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: "Profil berhasil diperbarui",
      profile: updatedProfile,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, getSyntheticEmail } from "@/lib/supabase/server";

const registerSchema = z.object({
  username: z
    .string()
    .min(3, "Username minimal 3 karakter")
    .max(30, "Username maksimal 30 karakter")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username hanya boleh huruf, angka, underscore, dan strip"),
  password: z.string().min(6, "Password minimal 6 karakter"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parseResult = registerSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { username, password } = parseResult.data;
    const cleanUsername = username.trim().toLowerCase();
    const syntheticEmail = getSyntheticEmail(cleanUsername);

    const supabaseAdmin = createAdminClient();

    // Check if username already exists in profiles
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("username", cleanUsername)
      .single();

    if (existingProfile) {
      return NextResponse.json(
        { error: "Username sudah digunakan. Silakan pilih username lain." },
        { status: 409 }
      );
    }

    // Create user in Supabase Auth via Admin client with auto-confirmed synthetic email
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: syntheticEmail,
      password,
      email_confirm: true,
      user_metadata: {
        username: cleanUsername,
      },
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || "Gagal membuat akun" },
        { status: 400 }
      );
    }

    // Insert into profiles table
    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      id: authData.user.id,
      username: cleanUsername,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (profileError) {
      // Rollback user if profile insertion failed
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: "Gagal menyimpan data profil: " + profileError.message },
        { status: 500 }
      );
    }

    // Automatically sign in the newly registered user so they don't need a separate login step
    const { data: sessionData } = await supabaseAdmin.auth.signInWithPassword({
      email: syntheticEmail,
      password,
    });

    return NextResponse.json({
      success: true,
      message: "Registrasi berhasil! Mengalihkan ke pengisian data diri...",
      session: sessionData?.session || null,
      user: {
        id: authData.user.id,
        username: cleanUsername,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

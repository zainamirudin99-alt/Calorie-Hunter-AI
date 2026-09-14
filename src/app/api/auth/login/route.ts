import { NextResponse } from "next/server";
import { z } from "zod";
import { getSyntheticEmail, createServerClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  username: z.string().min(1, "Username wajib diisi"),
  password: z.string().min(1, "Password wajib diisi"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parseResult = loginSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { username, password } = parseResult.data;
    const syntheticEmail = getSyntheticEmail(username);

    const supabase = createServerClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: syntheticEmail,
      password,
    });

    if (error || !data.session) {
      return NextResponse.json(
        { error: "Username atau password salah" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Login berhasil",
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        user: {
          id: data.user.id,
          username: username.trim().toLowerCase(),
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

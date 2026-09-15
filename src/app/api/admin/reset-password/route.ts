import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient, createAdminClient, getSyntheticEmail } from "@/lib/supabase/server";

const resetPasswordSchema = z.object({
  target_username: z.string().min(1, "Username target wajib diisi"),
  new_password: z.string().min(6, "Password baru minimal 6 karakter").default("hunter123"),
});

export async function POST(req: Request) {
  try {
    const supabase = createServerClient(req);
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin role (only zainamrdn99)
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .single();

    const username = (profile?.username || user.user_metadata?.username || "").trim().toLowerCase();
    if (username !== "zainamrdn99") {
      return NextResponse.json(
        { error: "Akses ditolak: Hanya administrator zainamrdn99 yang memiliki wewenang reset manual." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { target_username, new_password } = parsed.data;
    const cleanTargetUsername = target_username.trim().toLowerCase();
    const adminClient = createAdminClient();

    // Find target user in profiles
    const { data: targetProfile, error: targetError } = await adminClient
      .from("profiles")
      .select("id, username")
      .ilike("username", cleanTargetUsername)
      .maybeSingle();

    if (targetError || !targetProfile) {
      return NextResponse.json(
        { error: `User dengan username '${cleanTargetUsername}' tidak ditemukan.` },
        { status: 404 }
      );
    }

    // Update password in Supabase Auth
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      targetProfile.id,
      { password: new_password }
    );

    if (updateError) {
      return NextResponse.json(
        { error: "Gagal memperbarui password user: " + updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Password untuk user '${cleanTargetUsername}' berhasil direset menjadi '${new_password}'.`,
      target_username: cleanTargetUsername,
      temporary_password: new_password,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

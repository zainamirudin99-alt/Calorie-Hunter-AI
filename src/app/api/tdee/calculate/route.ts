import { NextResponse } from "next/server";
import { z } from "zod";
import { calculateTDEE } from "@/lib/tdee/calculator";

const tdeeSchema = z.object({
  weight_kg: z.number().positive(),
  height_cm: z.number().positive(),
  age: z.number().int().min(10).max(100),
  gender: z.enum(["male", "female"]),
  activity_level: z.enum(["sedentary", "light", "moderate", "active", "very_active"]),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parseResult = tdeeSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const result = calculateTDEE(parseResult.data);

    return NextResponse.json({
      success: true,
      data: result,
      disclaimer: "Kalkulasi deterministik berbasis Mifflin-St Jeor. Bukan pengganti konsultasi medis/gizi.",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

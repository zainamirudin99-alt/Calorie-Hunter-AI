import { NextResponse } from "next/server";
import { searchFoodItems } from "@/lib/nutrition/search";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 25));

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ success: true, items: [] });
    }

    const items = searchFoodItems(query.trim(), limit);
    return NextResponse.json({ success: true, count: items.length, items });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Gagal mencari data gizi" },
      { status: 500 }
    );
  }
}

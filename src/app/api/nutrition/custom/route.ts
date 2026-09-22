import { NextResponse } from "next/server";
import { getCustomFoodItems, saveCustomFoodItem, deleteCustomFoodItem } from "@/lib/nutrition/search";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const items = getCustomFoodItems();
    return NextResponse.json({ success: true, count: items.length, items });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Gagal memuat kamus makanan kustom" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      category,
      serving_g,
      calories,
      carbs,
      protein,
      fat,
      fiber,
      sugar,
      sodium,
      potassium,
      vitamin_c,
      source,
    } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "Nama makanan wajib diisi." },
        { status: 400 }
      );
    }

    const saved = saveCustomFoodItem({
      name: name.trim(),
      category: category ? String(category).trim() : "Kustom (Pilihan Pengguna)",
      serving_g: Math.max(1, Number(serving_g) || 100),
      calories: Math.max(0, Number(calories) || 0),
      carbs: Number((Number(carbs) || 0).toFixed(1)),
      protein: Number((Number(protein) || 0).toFixed(1)),
      fat: Number((Number(fat) || 0).toFixed(1)),
      fiber: Number((Number(fiber) || 0).toFixed(1)),
      sugar: Number((Number(sugar) || 0).toFixed(1)),
      sodium: Math.round(Number(sodium) || 0),
      potassium: Math.round(Number(potassium) || 0),
      vitamin_c: Math.round(Number(vitamin_c) || 0),
      source: source || "Kustom (Pengguna)",
    });

    return NextResponse.json({
      success: true,
      message: `Makanan "${saved.name}" berhasil ditambahkan ke Kamus Gizi!`,
      item: saved,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Gagal menyimpan makanan ke kamus" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID makanan kustom wajib disertakan." },
        { status: 400 }
      );
    }

    const ok = deleteCustomFoodItem(id);
    if (!ok) {
      return NextResponse.json(
        { success: false, error: "Item makanan kustom tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Makanan kustom berhasil dihapus dari Kamus Gizi.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Gagal menghapus makanan kustom" },
      { status: 500 }
    );
  }
}

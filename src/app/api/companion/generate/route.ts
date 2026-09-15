import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";

const generateCompanionSchema = z.object({
  character_name: z.string().min(1, "Nama karakter wajib diisi").max(50),
  character_description: z.string().min(1, "Deskripsi karakter wajib diisi").max(300),
  theme: z.enum(["godzilla", "ultraman"]).optional().default("godzilla"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parseResult = generateCompanionSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { character_name, character_description, theme } = parseResult.data;

    // Craft high-aesthetic thematic prompt for AI generation
    let tacticalPrompt = "";
    if (theme === "ultraman") {
      tacticalPrompt = `heroic sleek sci-fi ultra guardian combat unit mecha ${character_description}, futuristic silver and crimson armor plating, glowing crystalline chest core, sci-fi anime tactical portrait, cinematic volumetric lighting, 8k concept art, ultra detailed`;
    } else {
      // Godzilla theme
      tacticalPrompt = `fearsome cybernetic bio-mech kaiju wolf monster ${character_description}, dark tactical cyberpunk creature, glowing blue neon energy veins and razor fangs, titanium battle armor, epic digital concept art, dark atmospheric lighting, 8k masterpiece`;
    }

    // Generate seed for unique generation
    const seed = Math.floor(Math.random() * 1000000);
    const encodedPrompt = encodeURIComponent(tacticalPrompt);
    const generatedImageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&nologo=true&seed=${seed}`;

    // Verify generation response or fallback to themed high-res tactical artwork
    let finalImageUrl = generatedImageUrl;
    try {
      const ping = await fetch(generatedImageUrl, { method: "HEAD" });
      if (!ping.ok) {
        // Fallback to pre-curated sci-fi cyber familiar
        finalImageUrl = theme === "ultraman"
          ? "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80"
          : "https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?auto=format&fit=crop&w=800&q=80";
      }
    } catch {
      // Keep pollinations URL or fallback
    }

    return NextResponse.json({
      success: true,
      character_name,
      character_description,
      theme,
      image_url: finalImageUrl,
      generated_at: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { gemini, PRIMARY_GEMINI_MODEL } from "@/lib/gemini/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// In-memory cache for synthesized companion visuals (TTL: 10 minutes)
interface CompanionCacheEntry {
  image_url: string;
  prompt_used: string;
  generated_at: string;
  timestamp: number;
}
const companionAiCache = new Map<string, CompanionCacheEntry>();
const COMPANION_CACHE_TTL_MS = 10 * 60 * 1000;

const generateCompanionSchema = z.object({
  character_name: z.string().min(1, "Nama karakter wajib diisi").max(50),
  character_description: z.string().min(1, "Deskripsi karakter wajib diisi").max(300),
  theme: z.enum(["godzilla", "ultraman"]).optional().default("godzilla"),
});

function cleanIndonesianPrompt(desc: string): string {
  const dictionary: [RegExp, string][] = [
    [/\bdengan tangan\b/gi, "arms made of"],
    [/\btangan\b/gi, "arms"],
    [/\bkaki milik\b/gi, "legs of"],
    [/\bkaki\b/gi, "legs"],
    [/\bada sayap milik\b/gi, "wings of"],
    [/\bsayap milik\b/gi, "wings of"],
    [/\bsayap\b/gi, "wings"],
    [/\bekor\b/gi, "tail"],
    [/\bkepala\b/gi, "head"],
    [/\btanduk\b/gi, "horns"],
    [/\btaring\b/gi, "fangs"],
    [/\bcakar\b/gi, "claws"],
    [/\bmata\b/gi, "eyes"],
    [/\btubuh\b/gi, "body"],
    [/\bbadan\b/gi, "body"],
    [/\bdan\b/gi, "and"],
    [/\bmilik\b/gi, "of"],
    [/\bwarna\b/gi, "color"],
    [/\bmerah\b/gi, "crimson red"],
    [/\bbiru\b/gi, "neon blue"],
    [/\bhitam\b/gi, "matte black"],
    [/\bemas\b/gi, "gold"],
    [/\bperak\b/gi, "silver"],
    [/\bhijau\b/gi, "emerald green"],
    [/\bapi\b/gi, "fire flames"],
    [/\bpetir\b/gi, "lightning electricity"],
    [/\bbermata\b/gi, "with glowing eyes"],
    [/\bberkaki\b/gi, "with legs"],
    [/\bbercakar\b/gi, "with sharp claws"],
    [/\braksasa\b/gi, "giant colossus"],
    [/\brobot\b/gi, "mecha robot"],
    [/\bbaja\b/gi, "steel armor"],
    [/\bbesi\b/gi, "iron plating"],
  ];

  let result = desc;
  for (const [pattern, replacement] of dictionary) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

async function buildOptimalPrompt(
  characterName: string,
  characterDescription: string,
  theme: "godzilla" | "ultraman"
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && !apiKey.includes("placeholder") && apiKey.length > 20) {
    try {
      const themeStyle =
        theme === "ultraman"
          ? "heroic sleek sci-fi ultra guardian combat mecha, futuristic silver and crimson armor, glowing chest core"
          : "fearsome cybernetic bio-mech kaiju beast, dark tactical cyberpunk monster, glowing neon blue energy veins, titanium armor";

      const res = await gemini.models.generateContent({
        model: PRIMARY_GEMINI_MODEL,
        contents: `You are an AI creature concept artist. Convert this character idea into a concise 25-word English visual art prompt.
Character: "${characterName}".
User description: "${characterDescription}".
Required style: ${themeStyle}.
Output ONLY the English prompt string without quotes.`,
      });

      if (res.text && res.text.trim().length > 10) {
        return res.text.trim();
      }
    } catch {
      // Fall through to dictionary translation
    }
  }

  const cleanDesc = cleanIndonesianPrompt(characterDescription);
  if (theme === "ultraman") {
    return `heroic sleek sci-fi ultra guardian combat mecha ${cleanDesc}, ${characterName}, futuristic silver and crimson titanium armor plating, glowing crystalline chest core, sci-fi anime tactical portrait, cinematic volumetric lighting, 8k concept art`;
  } else {
    return `fearsome cybernetic bio-mech kaiju beast ${cleanDesc}, ${characterName}, dark tactical cyberpunk monster, glowing neon energy lines, razor titanium battle armor, epic digital concept art, dark atmospheric lighting, 8k masterpiece`;
  }
}

function createTacticalSvgFallback(name: string, theme: "godzilla" | "ultraman"): string {
  const isUltra = theme === "ultraman";
  const primaryColor = isUltra ? "#ef4444" : "#06b6d4";
  const glowColor = isUltra ? "#fbbf24" : "#3b82f6";
  const title = isUltra ? "ULTRA MECHA" : "CYBER KAIJU";
  const safeName = name.replace(/[<>&"]/g, "").toUpperCase().substring(0, 18);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
    <defs>
      <radialGradient id="bg" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#0f172a"/>
        <stop offset="100%" stop-color="#020617"/>
      </radialGradient>
      <linearGradient id="blade" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${primaryColor}"/>
        <stop offset="100%" stop-color="${glowColor}"/>
      </linearGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="6" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <rect width="400" height="400" fill="url(#bg)"/>
    <path d="M0,100 L400,100 M0,200 L400,200 M0,300 L400,300 M100,0 L100,400 M200,0 L200,400 M300,0 L300,400" stroke="#1e293b" stroke-width="1" opacity="0.6"/>
    <polygon points="200,40 340,120 340,280 200,360 60,280 60,120" fill="none" stroke="${primaryColor}" stroke-width="3" filter="url(#glow)"/>
    <polygon points="200,60 320,130 320,270 200,340 80,270 80,130" fill="#020617" stroke="#334155" stroke-width="1" opacity="0.8"/>
    <path d="M140,170 L200,110 L260,170 L200,240 Z" fill="url(#blade)" filter="url(#glow)"/>
    <circle cx="200" cy="180" r="18" fill="#ffffff" filter="url(#glow)"/>
    <path d="M110,210 L160,230 L200,280 L240,230 L290,210 L260,260 L200,310 L140,260 Z" fill="${primaryColor}" opacity="0.7"/>
    <line x1="200" y1="110" x2="200" y2="60" stroke="${glowColor}" stroke-width="3" stroke-dasharray="4,4"/>
    <line x1="140" y1="170" x2="80" y2="130" stroke="${glowColor}" stroke-width="2"/>
    <line x1="260" y1="170" x2="320" y2="130" stroke="${glowColor}" stroke-width="2"/>
    <rect x="90" y="325" width="220" height="28" rx="4" fill="#090d16" stroke="${primaryColor}" stroke-width="1.5"/>
    <text x="200" y="344" font-family="monospace" font-size="12" font-weight="bold" fill="#ffffff" text-anchor="middle" letter-spacing="2">${safeName}</text>
    <text x="200" y="88" font-family="monospace" font-size="10" font-weight="bold" fill="${primaryColor}" text-anchor="middle" letter-spacing="3">[${title}]</text>
  </svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

async function fetchImageAsBase64(
  prompt: string,
  theme: "godzilla" | "ultraman",
  characterName: string
): Promise<string> {
  const seed = Math.floor(Math.random() * 1000000);
  const encoded = encodeURIComponent(prompt);
  const pollinationsUrl = `https://image.pollinations.ai/prompt/${encoded}?width=384&height=384&nologo=true&model=turbo&seed=${seed}`;

  // Try Pollinations turbo generation
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);

    const res = await fetch(pollinationsUrl, {
      signal: controller.signal,
      headers: {
        Accept: "image/jpeg,image/png,image/*",
        "User-Agent": "CalorieHunterAI/1.0",
      },
    });
    clearTimeout(timeout);

    if (res.ok) {
      const buffer = await res.arrayBuffer();
      if (buffer && buffer.byteLength > 1000) {
        const base64 = Buffer.from(buffer).toString("base64");
        return `data:image/jpeg;base64,${base64}`;
      }
    }
  } catch (err) {
    console.warn("Pollinations turbo fetch failed/timeout, trying fallback:", err);
  }

  // Fallback 1: Curated tactical sci-fi image fetch
  try {
    const fallbackUrl =
      theme === "ultraman"
        ? "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80"
        : "https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?auto=format&fit=crop&w=400&q=80";

    const fbRes = await fetch(fallbackUrl);
    if (fbRes.ok) {
      const fbBuf = await fbRes.arrayBuffer();
      if (fbBuf && fbBuf.byteLength > 1000) {
        const fbBase64 = Buffer.from(fbBuf).toString("base64");
        return `data:image/jpeg;base64,${fbBase64}`;
      }
    }
  } catch {
    // Continue to SVG fallback
  }

  // Fallback 2: Procedural Tactical Cyberpunk SVG (guaranteed 100% success)
  return createTacticalSvgFallback(characterName, theme);
}

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

    // Check in-memory synthesizer cache
    const cacheKey = `${theme}_${character_name.trim().toLowerCase()}_${character_description.trim().toLowerCase()}`;
    const cached = companionAiCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < COMPANION_CACHE_TTL_MS)) {
      return NextResponse.json({
        success: true,
        character_name,
        character_description,
        theme,
        image_url: cached.image_url,
        prompt_used: cached.prompt_used,
        generated_at: cached.generated_at,
        cached: true,
      }, {
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      });
    }

    // 1. Synthesize optimized prompt
    const tacticalPrompt = await buildOptimalPrompt(
      character_name,
      character_description,
      theme
    );

    // 2. Fetch image on server and convert to Base64 Data URL
    const imageBase64Url = await fetchImageAsBase64(
      tacticalPrompt,
      theme,
      character_name
    );

    const generatedAt = new Date().toISOString();
    companionAiCache.set(cacheKey, {
      image_url: imageBase64Url,
      prompt_used: tacticalPrompt,
      generated_at: generatedAt,
      timestamp: Date.now(),
    });

    return NextResponse.json({
      success: true,
      character_name,
      character_description,
      theme,
      image_url: imageBase64Url,
      prompt_used: tacticalPrompt,
      generated_at: generatedAt,
    }, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Gagal mensintesis visual AI." },
      { status: 500, headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import { resolveUserAiAccess } from "@/lib/ai/user-keys";
import { callAI } from "@/lib/ai/adapter";
import { AiError, UserApiKeyInfo } from "@/lib/ai/types";

export const runtime = "nodejs";

const generateCompanionSchema = z.object({
  character_name: z.string().min(1).max(50),
  character_description: z.string().min(1).max(250),
  theme: z.enum(["godzilla", "ultraman"]),
  model_id: z.string().default("gemini-3.8-flash"),
});

// In-memory cache for prompt & visual synthesizer (1 hour TTL)
interface CacheEntry {
  image_url: string;
  prompt_used: string;
  model_used: string;
  generated_at: string;
  timestamp: number;
}
const companionAiCache = new Map<string, CacheEntry>();
const COMPANION_CACHE_TTL_MS = 60 * 60 * 1000;

function cleanIndonesianPrompt(text: string): string {
  const dictionary: Record<string, string> = {
    "naga": "dragon beast",
    "robot": "cyborg mecha",
    "kucing": "panther",
    "singa": "cyber lion",
    "besi": "armored titanium",
    "api": "inferno flames",
    "listrik": "electric neon",
    "sayap": "cybernetic wings",
    "mata merah": "glowing crimson eyes",
    "biru": "azure neon",
    "hitam": "obsidian stealth",
    "emas": "golden armor",
    "monster": "kaiju beast",
    "petir": "lightning surge",
    "kuat": "powerful muscular build",
    "cepat": "agile streamlined aerodynamic",
  };

  let result = text.toLowerCase();
  for (const [pattern, replacement] of Object.entries(dictionary)) {
    result = result.replace(new RegExp(pattern, "gi"), replacement);
  }
  return result;
}

async function buildOptimalPrompt(
  characterName: string,
  characterDescription: string,
  theme: "godzilla" | "ultraman",
  modelId: string,
  keyInfo: UserApiKeyInfo,
  availableKeys: UserApiKeyInfo[]
): Promise<string> {
  const themeStyle =
    theme === "ultraman"
      ? "heroic sleek sci-fi ultra guardian combat mecha, futuristic silver and crimson armor, glowing chest core"
      : "fearsome cybernetic bio-mech kaiju beast, dark tactical cyberpunk monster, glowing neon blue energy veins, titanium armor";

  const systemInstruction = `You are an AI creature concept artist. Convert this character idea into a concise 25-word English visual art prompt.
Character: "${characterName}".
User description: "${characterDescription}".
Required style: ${themeStyle}.
Output ONLY the English prompt string without quotes.`;

  try {
    const res = await callAI({
      provider: keyInfo.provider,
      model: modelId,
      apiKey: keyInfo.key,
      baseUrl: keyInfo.baseUrl,
      messages: [{ role: "user", content: systemInstruction }],
      availableKeys,
    });
    if (res.rawText && res.rawText.trim().length > 10) {
      return res.rawText.trim();
    }
  } catch {
    // Continue to deterministic fallback
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
      <radialGradient id="bgGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${primaryColor}" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="#050811" stop-opacity="0.95"/>
      </radialGradient>
      <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="8" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <rect width="400" height="400" fill="#050811"/>
    <circle cx="200" cy="200" r="160" fill="url(#bgGlow)"/>
    <circle cx="200" cy="200" r="130" fill="none" stroke="${primaryColor}" stroke-width="1.5" stroke-dasharray="8,6" opacity="0.6"/>
    <polygon points="200,90 280,240 120,240" fill="none" stroke="${glowColor}" stroke-width="2.5" filter="url(#neonGlow)"/>
    <circle cx="200" cy="180" r="45" fill="#0f172a" stroke="${primaryColor}" stroke-width="2"/>
    <circle cx="200" cy="180" r="16" fill="${glowColor}" filter="url(#neonGlow)"/>
    <path d="M110,210 L160,230 L200,280 L240,230 L290,210 L260,260 L200,310 L140,260 Z" fill="${primaryColor}" opacity="0.7"/>
    <rect x="90" y="325" width="220" height="28" rx="4" fill="#090d16" stroke="${primaryColor}" stroke-width="1.5"/>
    <text x="200" y="344" font-family="monospace" font-size="12" font-weight="bold" fill="#ffffff" text-anchor="middle" letter-spacing="2">${safeName}</text>
    <text x="200" y="88" font-family="monospace" font-size="10" font-weight="bold" fill="${primaryColor}" text-anchor="middle" letter-spacing="3">[${title}]</text>
  </svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

async function fetchImageAsBase64(
  prompt: string,
  theme: "godzilla" | "ultraman",
  characterName: string,
  keyInfo?: UserApiKeyInfo
): Promise<string> {
  // If OpenAI key available, try DALL-E
  if (keyInfo?.provider === "openai" && keyInfo.key) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      const endpoint = keyInfo.baseUrl
        ? `${keyInfo.baseUrl.replace(/\/+$/, "")}/images/generations`
        : "https://api.openai.com/v1/images/generations";

      const openAiRes = await fetch(endpoint, {
        signal: controller.signal,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${keyInfo.key}`,
        },
        body: JSON.stringify({
          model: "dall-e-3",
          prompt: prompt.substring(0, 950),
          n: 1,
          size: "1024x1024",
          response_format: "b64_json",
        }),
      });
      clearTimeout(timeout);

      if (openAiRes.ok) {
        const aiData = await openAiRes.json();
        const b64 = aiData?.data?.[0]?.b64_json;
        if (b64 && b64.length > 1000) {
          return `data:image/png;base64,${b64}`;
        }
      }
    } catch {
      // Fallback to procedural
    }
  }

  // Fast Neural Diffusion
  const seed = Math.floor(Math.random() * 1000000);
  const encoded = encodeURIComponent(prompt);
  const pollinationsUrl = `https://image.pollinations.ai/prompt/${encoded}?width=512&height=512&nologo=true&model=turbo&seed=${seed}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);

    const res = await fetch(pollinationsUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const arrayBuffer = await res.arrayBuffer();
      if (arrayBuffer && arrayBuffer.byteLength > 2000) {
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        return `data:image/jpeg;base64,${base64}`;
      }
    }
  } catch {
    // Continue to SVG fallback
  }

  return createTacticalSvgFallback(characterName, theme);
}

export async function POST(req: Request) {
  try {
    const supabase = createServerClient(req);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Sesi tidak valid atau telah berakhir." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parseResult = generateCompanionSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { character_name, character_description, theme, model_id } = parseResult.data;

    // Check user BYOK access
    let access;
    try {
      access = await resolveUserAiAccess(user.id, model_id);
    } catch (err: unknown) {
      if (err instanceof AiError) {
        return NextResponse.json(err.toJSON(), {
          status: err.code === "AI_KEY_REQUIRED" ? 403 : 400,
        });
      }
      throw err;
    }

    const { selectedKey, availableKeys } = access;

    // Check cache
    const cacheKey = `${theme}_${model_id}_${character_name.trim().toLowerCase()}_${character_description.trim().toLowerCase()}`;
    const cached = companionAiCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < COMPANION_CACHE_TTL_MS) {
      return NextResponse.json({
        success: true,
        character_name,
        character_description,
        theme,
        model_id,
        image_url: cached.image_url,
        prompt_used: cached.prompt_used,
        model_used: cached.model_used,
        generated_at: cached.generated_at,
        cached: true,
      });
    }

    const tacticalPrompt = await buildOptimalPrompt(
      character_name,
      character_description,
      theme,
      model_id,
      selectedKey,
      availableKeys
    );

    const imageBase64Url = await fetchImageAsBase64(
      tacticalPrompt,
      theme,
      character_name,
      selectedKey
    );

    const generatedAt = new Date().toISOString();
    companionAiCache.set(cacheKey, {
      image_url: imageBase64Url,
      prompt_used: tacticalPrompt,
      model_used: model_id,
      generated_at: generatedAt,
      timestamp: Date.now(),
    });

    return NextResponse.json({
      success: true,
      character_name,
      character_description,
      theme,
      model_id,
      image_url: imageBase64Url,
      prompt_used: tacticalPrompt,
      model_used: model_id,
      generated_at: generatedAt,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Gagal mensintesis visual AI." },
      { status: 500 }
    );
  }
}

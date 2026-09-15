import { NextResponse } from "next/server";
import { gemini } from "@/lib/gemini/client";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const model = url.searchParams.get("model") || "gemini-3.8-flash";

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({
      status: "no_key",
      available: false,
      model,
      message: "GEMINI_API_KEY belum disetel pada server Vercel / Environment.",
    });
  }

  const startTime = Date.now();
  try {
    const response = await gemini.models.generateContent({
      model,
      contents: "Ping. Balas persis satu kata: OK.",
      config: {
        thinkingConfig: {
          thinkingLevel: "HIGH" as any,
        },
      },
    });

    const latencyMs = Date.now() - startTime;
    const text = response.text || "";

    return NextResponse.json({
      status: "online",
      available: true,
      model,
      latency_ms: latencyMs,
      response_preview: text.trim(),
      message: `Model ${model} aktif dan siap merespons (latensi ${latencyMs}ms).`,
    });
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;
    const errorStr = (error.message || "").toLowerCase();
    const isRateLimit = errorStr.includes("429") || errorStr.includes("quota") || errorStr.includes("resource exhausted");

    return NextResponse.json({
      status: isRateLimit ? "rate_limited" : "error",
      available: false,
      model,
      latency_ms: latencyMs,
      message: isRateLimit
        ? `Batas kuota panggilan AI tercapai (${model}). Sistem mengaktifkan fallback otomatis.`
        : `AI tidak merespons: ${error.message}`,
    });
  }
}

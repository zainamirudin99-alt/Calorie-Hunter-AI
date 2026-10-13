"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { TacticalHeader } from "@/components/hud/header";
import { TacticalFooter } from "@/components/hud/footer";
import { TelemetryTicker } from "@/components/hud/telemetry-ticker";
import { useTacticalTheme } from "@/components/theme-provider";
import { MealPlanJson, MealPlanDay } from "@/types/database";
import { 
  UtensilsCrossed, 
  Sparkles, 
  Clock, 
  Layers, 
  ChevronRight, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Calendar,
  Flame,
  ArrowRight
} from "lucide-react";
import { ModelSelector } from "@/components/ai/model-selector";
import { useSelectedAiModel } from "@/lib/gemini/models";

const DAY_NAMES = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

export default function MealPlanPage() {
  const { isUltraman } = useTacticalTheme();
  const { modelId } = useSelectedAiModel();

  const [mealPlan, setMealPlan] = useState<MealPlanJson | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(false);
  const [fallbackMessage, setFallbackMessage] = useState<string | null>(null);
  const [modelUsed, setModelUsed] = useState<string>("gemini-3.8-flash");

  // Sequential generation tracking state
  const [generationProgress, setGenerationProgress] = useState<{
    isGenerating: boolean;
    currentDay: number;
    totalDays: number;
    statusText: string;
    errorDay: number | null;
    errorCode: string | null;
    errorMessage: string | null;
  }>({
    isGenerating: false,
    currentDay: 1,
    totalDays: 7,
    statusText: "",
    errorDay: null,
    errorCode: null,
    errorMessage: null,
  });

  // Sync saved meal plan from Cloud
  const syncCloudMealPlan = async () => {
    setLoading(true);
    setFeedback(null);
    setIsFallback(false);
    setFallbackMessage(null);
    try {
      const res = await fetch("/api/meal-plan/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-ai-model": modelId,
        },
        body: JSON.stringify({ force: false, model: modelId }),
      });

      const data = await res.json();
      if (data.meal_plan) {
        setMealPlan(data.meal_plan);
        setIsFallback(Boolean(data.is_fallback));
        setFallbackMessage(data.fallback_message || null);
        if (data.model_used) setModelUsed(data.model_used);

        localStorage.setItem("chai_cached_meal_plan", JSON.stringify(data.meal_plan));
        if (!data.is_fallback) {
          setFeedback(data.is_cached ? "Rencana makan aktif disinkronkan dari database Cloud!" : `Rencana makan berhasil dimuat (${data.model_used || "AI"}).`);
        }
      }
    } catch {
      setIsFallback(true);
      setFallbackMessage("Tidak dapat menghubungi server AI. Menampilkan rencana cadangan.");
    } finally {
      setLoading(false);
    }
  };

  // Sequential AI Generation: day 1 to 7 (or resume from startDay)
  const startSequentialGeneration = async (startDay = 1) => {
    setGenerationProgress({
      isGenerating: true,
      currentDay: startDay,
      totalDays: 7,
      statusText: `Menyusun Hari ${startDay}/7 (${DAY_NAMES[startDay - 1]})...`,
      errorDay: null,
      errorCode: null,
      errorMessage: null,
    });
    setLoading(true);
    setFeedback(null);
    setIsFallback(false);
    setFallbackMessage(null);

    let latestPlan = mealPlan;

    for (let day = startDay; day <= 7; day++) {
      setGenerationProgress(prev => ({
        ...prev,
        currentDay: day,
        statusText: `Menyusun Hari ${day}/7 (${DAY_NAMES[day - 1]})...`,
      }));

      try {
        const res = await fetch("/api/meal-plan/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-ai-model": modelId,
          },
          body: JSON.stringify({
            dayIndex: day,
            force: true,
            model: modelId,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          const errCode = data.code || (res.status === 429 ? "AI_RATE_LIMITED" : res.status === 504 ? "AI_TIMEOUT" : "AI_PROVIDER_ERROR");
          const errMsg = data.error || data.message || `Gagal menyusun Hari ${day}`;
          setGenerationProgress(prev => ({
            ...prev,
            isGenerating: false,
            errorDay: day,
            errorCode: errCode,
            errorMessage: errMsg,
            statusText: `Terhenti pada Hari ${day}/7: ${errMsg}`,
          }));
          setLoading(false);
          return;
        }

        if (data.meal_plan) {
          latestPlan = data.meal_plan;
          setMealPlan(data.meal_plan);
          if (data.model_used) setModelUsed(data.model_used);
          localStorage.setItem("chai_cached_meal_plan", JSON.stringify(data.meal_plan));
        }
      } catch (err: any) {
        setGenerationProgress(prev => ({
          ...prev,
          isGenerating: false,
          errorDay: day,
          errorCode: "AI_TIMEOUT",
          errorMessage: err.message || `Koneksi timeout pada Hari ${day}`,
          statusText: `Terhenti pada Hari ${day}/7: Koneksi timeout`,
        }));
        setLoading(false);
        return;
      }
    }

    // Complete all 7 days successfully
    setGenerationProgress({
      isGenerating: false,
      currentDay: 7,
      totalDays: 7,
      statusText: "Selesai! Seluruh 7 hari berhasil disintesis.",
      errorDay: null,
      errorCode: null,
      errorMessage: null,
    });
    setLoading(false);
    setFeedback(`Rencana makan 7 hari lengkap berhasil disintesis oleh ${modelUsed || "AI"}!`);
  };

  useEffect(() => {
    const cached = localStorage.getItem("chai_cached_meal_plan");
    if (cached) {
      try {
        setMealPlan(JSON.parse(cached));
      } catch {
        syncCloudMealPlan();
      }
    } else {
      syncCloudMealPlan();
    }

    const handleGlobalSync = () => {
      syncCloudMealPlan();
    };

    window.addEventListener("chai_trigger_cloud_sync", handleGlobalSync);
    return () => {
      window.removeEventListener("chai_trigger_cloud_sync", handleGlobalSync);
    };
  }, []);

  const activeDay: MealPlanDay | null = mealPlan?.days[selectedDayIndex] || null;

  return (
    <div className="min-h-screen flex flex-col justify-between">
      <TacticalHeader activeTab="meal-plan" />
      <TelemetryTicker />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 min-w-0">
        {/* Header Strip */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 mb-6 border-b hud-border min-w-0">
          <div className="flex items-center gap-3 min-w-0 w-full max-w-full">
            <div className="w-10 h-10 rounded hud-card-high border hud-border flex items-center justify-center hud-hero-text shrink-0">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-base sm:text-lg font-bold hud-text uppercase truncate">
                RENCANA MAKAN TAKTIS AI (MEAL PLAN)
              </h1>
              <span className="font-mono text-[10px] text-outline uppercase block truncate">
                {isUltraman ? "SCIENCE PATROL NUTRITION STRATEGY" : "TITAN PROTOCOL RATIONS"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <ModelSelector compact />
            <button
              type="button"
              onClick={() => syncCloudMealPlan()}
              disabled={loading}
              className="flex-1 sm:flex-none min-h-[44px] py-2 px-3 rounded hud-card-inner border hud-border hover:border-primary font-mono text-xs font-bold uppercase transition-all flex items-center justify-center gap-1.5 text-slate-300 hover:text-white disabled:opacity-50 cursor-pointer shadow-sm"
              title="Sinkronkan rencana makan tersimpan dari database Cloud"
            >
              <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${loading ? "animate-spin text-primary" : "text-cyan-400"}`} />
              <span>SINKRON CLOUD</span>
            </button>
            <button
              type="button"
              onClick={() => startSequentialGeneration(1)}
              disabled={loading}
              className="flex-1 sm:flex-none min-h-[44px] hud-clip-chamfer hud-hero-bg py-2 px-4 font-mono text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 shadow-md hover:opacity-90 disabled:opacity-50 cursor-pointer text-black"
            >
              <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${loading ? "animate-spin" : ""}`} />
              <span>{loading ? "MENYINTESIS..." : "REGENERASI 7 HARI AI"}</span>
            </button>
          </div>
        </div>

        {/* Honest Sequential Progress Bar */}
        {generationProgress.isGenerating && (
          <div className="mb-6 p-4 rounded hud-card-high border border-primary/50 space-y-3 shadow-xl animate-pulse">
            <div className="flex items-center justify-between font-mono text-xs">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 hud-hero-text animate-spin" />
                <span className="font-bold hud-text">{generationProgress.statusText}</span>
              </div>
              <span className="hud-beam-text font-bold">
                {Math.round((generationProgress.currentDay / 7) * 100)}%
              </span>
            </div>

            {/* Progress Bar Track */}
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full hud-hero-bg transition-all duration-300"
                style={{ width: `${(generationProgress.currentDay / 7) * 100}%` }}
              />
            </div>

            {/* 7 Days Step Indicator */}
            <div className="grid grid-cols-7 gap-1 pt-1 font-mono text-[10px] text-center">
              {[1, 2, 3, 4, 5, 6, 7].map((d) => {
                const isDone = d < generationProgress.currentDay;
                const isCurrent = d === generationProgress.currentDay;
                return (
                  <div
                    key={d}
                    className={`p-1 rounded border transition-all ${
                      isDone
                        ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                        : isCurrent
                        ? "hud-card-high border-primary text-primary font-bold animate-pulse"
                        : "hud-card-inner hud-border text-outline"
                    }`}
                  >
                    <span>H-0{d}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* AI Error with Retry Day X button */}
        {generationProgress.errorDay && (
          <div className="mb-6 p-4 rounded bg-rose-500/15 border-2 border-rose-500/50 text-rose-300 font-mono text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg min-w-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <div className="min-w-0">
                <span className="font-bold block uppercase tracking-wider text-[11px] text-rose-400">
                  {generationProgress.errorCode === "AI_RATE_LIMITED" 
                    ? "BATAS FREKUENSI / KUOTA AI TERCAPAI (RATE LIMITED)"
                    : generationProgress.errorCode === "AI_TIMEOUT"
                    ? "KONEKSI AI MELEBIHI BATAS WAKTU (TIMEOUT)"
                    : "GAGAL MENYINTESIS HARI KE-" + generationProgress.errorDay}
                </span>
                <span className="text-[11px] text-slate-200 block mt-0.5 break-words">
                  Hari 1 s/d {generationProgress.errorDay - 1} telah tersimpan dengan aman. Klik tombol di kanan untuk melanjutkan sintesis dari Hari {generationProgress.errorDay} tanpa mengulang hari sebelumnya.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => startSequentialGeneration(generationProgress.errorDay!)}
              disabled={loading}
              className="w-full sm:w-auto min-h-[44px] px-4 py-2 rounded hud-card-high border border-rose-400 hover:border-rose-300 text-rose-200 font-bold uppercase text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>COBA LAGI HARI {generationProgress.errorDay}</span>
            </button>
          </div>
        )}

        {/* AI Fallback Notice with prominent 'Coba Lagi' button */}
        {isFallback && (
          <div className="mb-6 p-4 rounded bg-amber-500/10 border-2 border-amber-500/40 text-amber-300 font-mono text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg min-w-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
              <div className="min-w-0">
                <span className="font-bold block uppercase tracking-wider text-[11px] text-amber-400 truncate">
                  MODE CADANGAN DETERMINISTIK AKTIF
                </span>
                <span className="text-[11px] text-slate-200 block mt-0.5 break-words">
                  {fallbackMessage || "Menu di bawah ini adalah rekomendasi berbasis aturan nutrisi baku (deterministik), bukan hasil sintesis AI kustom."}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => startSequentialGeneration(1)}
              disabled={loading}
              className="w-full sm:w-auto min-h-[44px] px-4 py-2 rounded hud-card-high border border-amber-400/60 hover:border-amber-400 text-amber-300 font-bold uppercase text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>COBA LAGI DENGAN AI</span>
            </button>
          </div>
        )}

        {feedback && !isFallback && !generationProgress.isGenerating && (
          <div className="mb-6 p-3 rounded bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 font-mono text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="break-words">{feedback}</span>
          </div>
        )}

        {/* AI Strategy Summary Card */}
        {mealPlan && (
          <div className="hud-card border rounded p-4 sm:p-5 mb-6 relative shadow-lg min-w-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b hud-border pb-3 mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 hud-beam-text shrink-0" />
                <span className="font-display text-sm font-bold hud-hero-text uppercase truncate">
                  STRATEGI NUTRISI AI GEMINI 3.8 FLASH
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
                <span>TARGET: <strong className="hud-hero-text">{mealPlan.target_daily_kcal} kcal</strong></span>
                <span>SPLIT: <strong className="hud-beam-text">{mealPlan.weekly_split.protein_pct}P / {mealPlan.weekly_split.carbs_pct}C / {mealPlan.weekly_split.fat_pct}F</strong></span>
              </div>
            </div>
            <p className="font-mono text-xs hud-text-muted leading-relaxed break-words">
              {mealPlan.summary}
            </p>
          </div>
        )}

        {/* Day Selector Navigation Strip */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-6">
          {[
            { full: "Senin", short: "SEN" },
            { full: "Selasa", short: "SEL" },
            { full: "Rabu", short: "RAB" },
            { full: "Kamis", short: "KAM" },
            { full: "Jumat", short: "JUM" },
            { full: "Sabtu", short: "SAB" },
            { full: "Minggu", short: "MIN" },
          ].map((item, idx) => {
            const hasMeals = Boolean(mealPlan?.days && mealPlan.days[idx] && mealPlan.days[idx].meals?.length > 0);
            return (
              <button
                key={item.full}
                type="button"
                onClick={() => setSelectedDayIndex(idx)}
                className={`min-h-[44px] p-1 sm:p-2.5 rounded border text-center font-mono transition-all cursor-pointer flex flex-col items-center justify-center relative ${
                  selectedDayIndex === idx
                    ? "hud-card-high border-primary ring-1 ring-primary shadow"
                    : "hud-card-inner hud-border hud-text-muted hover:border-primary/40 hover:hud-text"
                }`}
              >
                <div className="flex items-center gap-1">
                  <span className="text-[9px] sm:text-[10px] text-outline block uppercase leading-none">H-0{idx + 1}</span>
                  {hasMeals && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" title="Ransum Siap" />}
                </div>
                <span className={`text-[10px] sm:text-xs font-bold uppercase block mt-0.5 sm:mt-1 ${selectedDayIndex === idx ? "hud-hero-text" : ""}`}>
                  <span className="sm:hidden">{item.short}</span>
                  <span className="hidden sm:inline">{item.full}</span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Loading Skeleton State */}
        {loading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-6 w-48 bg-slate-800/60 rounded" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="hud-card border rounded p-5 space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b hud-border">
                    <div className="h-4 w-28 bg-slate-800 rounded" />
                    <div className="h-5 w-16 bg-slate-800 rounded" />
                  </div>
                  <div className="h-8 bg-slate-800/40 rounded" />
                  <div className="space-y-2">
                    <div className="h-3 w-3/4 bg-slate-800/50 rounded" />
                    <div className="h-3 w-1/2 bg-slate-800/50 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : activeDay ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between font-mono text-xs hud-text-muted px-1">
              <span className="font-bold hud-text">MENU HARI {activeDay.day_name.toUpperCase()}</span>
              <span>TOTAL ESTIMASI: <strong className="hud-hero-text">{activeDay.total_day_kcal} kcal</strong></span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeDay.meals.map((meal, mIdx) => (
                <div
                  key={mIdx}
                  className="hud-card border rounded p-4 sm:p-5 relative shadow-md hover:border-primary/50 transition-all flex flex-col justify-between min-w-0"
                >
                  <div className="min-w-0">
                    <div className="flex items-center justify-between pb-2 mb-3 border-b hud-border min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-8 h-8 rounded hud-card-inner border hud-border flex items-center justify-center font-mono text-xs hud-hero-text font-bold shrink-0">
                          {meal.time_slot}
                        </span>
                        <div className="min-w-0">
                          <h3 className="font-display text-sm font-bold hud-text break-words">{meal.meal_name}</h3>
                          <span className="font-mono text-[10px] text-outline uppercase block">RANSUM #{mIdx + 1}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0 pl-2">
                        <span className="font-display text-base font-bold hud-hero-text font-mono">
                          {meal.estimated_kcal} kcal
                        </span>
                      </div>
                    </div>

                    {/* Macros Bar */}
                    <div className="grid grid-cols-3 gap-2 p-2 rounded hud-card-inner border hud-border font-mono text-[10px] text-center mb-3">
                      <div>
                        <span className="text-outline block">Protein</span>
                        <span className="hud-beam-text font-bold">{meal.macros.protein_g}g</span>
                      </div>
                      <div>
                        <span className="text-outline block">Karbo</span>
                        <span className="hud-sub-text font-bold">{meal.macros.carbs_g}g</span>
                      </div>
                      <div>
                        <span className="text-outline block">Lemak</span>
                        <span className="hud-hero-text font-bold">{meal.macros.fat_g}g</span>
                      </div>
                    </div>

                    {/* Suggested Food Items */}
                    <div className="space-y-1.5 font-mono text-xs">
                      <span className="text-[10px] text-outline uppercase block font-bold">KOMPOSISI MENU:</span>
                      <ul className="space-y-1 pl-1">
                        {meal.suggested_menu.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 hud-text-muted">
                            <span className="hud-hero-text text-[10px] mt-0.5 shrink-0">►</span>
                            <span className="break-words">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {meal.tips && (
                    <div className="mt-4 pt-2.5 border-t hud-border font-mono text-[11px] hud-text-muted italic break-words">
                      💡 Tip Hunter: {meal.tips}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-12 text-center hud-card border rounded font-mono text-xs hud-text-muted">
            Tekan &apos;REGENERASI AI MENU&apos; untuk menyintesis rencana makan.
          </div>
        )}

        {/* Navigation to Tracking */}
        <div className="mt-8 p-4 hud-card border rounded flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 font-mono text-xs shadow-lg min-w-0">
          <div className="min-w-0">
            <span className="hud-text font-bold block truncate">Siap Mencatat Konsumsi Nyata?</span>
            <span className="text-[10px] text-outline block break-words">Gunakan kamera AI Monster Scanner untuk foto makanan atau input teks manual</span>
          </div>
          <Link
            href="/scanner"
            className="w-full sm:w-auto min-h-[44px] hud-clip-chamfer hud-hero-bg px-5 py-2.5 text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 shrink-0 hover:opacity-90 text-black"
          >
            <span>LANJUT KE STEP 6: AI TRACKING SCANNER</span>
            <ArrowRight className="w-4 h-4 shrink-0" />
          </Link>
        </div>
      </main>

      <TacticalFooter />
    </div>
  );
}

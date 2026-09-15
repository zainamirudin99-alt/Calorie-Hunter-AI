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

export default function MealPlanPage() {
  const { isUltraman } = useTacticalTheme();

  const [mealPlan, setMealPlan] = useState<MealPlanJson | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(false);
  const [fallbackMessage, setFallbackMessage] = useState<string | null>(null);
  const [modelUsed, setModelUsed] = useState<string>("gemini-3.8-flash");

  const fetchMealPlan = async () => {
    setLoading(true);
    setFeedback(null);
    setIsFallback(false);
    setFallbackMessage(null);
    try {
      const res = await fetch("/api/meal-plan/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();
      if (data.meal_plan) {
        setMealPlan(data.meal_plan);
        setIsFallback(Boolean(data.is_fallback));
        setFallbackMessage(data.fallback_message || null);
        if (data.model_used) setModelUsed(data.model_used);

        localStorage.setItem("chai_cached_meal_plan", JSON.stringify(data.meal_plan));
        if (!data.is_fallback) {
          setFeedback(`Rencana makan 7 hari berhasil disintesis oleh ${data.model_used || "AI"}!`);
        }
      }
    } catch {
      setIsFallback(true);
      setFallbackMessage("Tidak dapat menghubungi server AI. Menampilkan rencana makan cadangan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const cached = localStorage.getItem("chai_cached_meal_plan");
    if (cached) {
      try {
        setMealPlan(JSON.parse(cached));
      } catch {
        fetchMealPlan();
      }
    } else {
      fetchMealPlan();
    }
  }, []);

  const activeDay: MealPlanDay | null = mealPlan?.days[selectedDayIndex] || null;

  return (
    <div className="min-h-screen flex flex-col justify-between">
      <TacticalHeader activeTab="meal-plan" />
      <TelemetryTicker />

      <main className="flex-1 w-full max-w-6xl mx-auto p-3 sm:p-4 md:p-6 pb-24 md:pb-8">
        {/* Header Strip */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 mb-6 border-b hud-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded hud-card-high border hud-border flex items-center justify-center hud-hero-text">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display text-base font-bold hud-text uppercase">
                RENCANA MAKAN TAKTIS AI (MEAL PLAN)
              </h1>
              <span className="font-mono text-[10px] text-outline uppercase block">
                {isUltraman ? "SCIENCE PATROL NUTRITION STRATEGY" : "TITAN PROTOCOL RATIONS"}
              </span>
            </div>
          </div>

          <button
            onClick={fetchMealPlan}
            disabled={loading}
            className="hud-clip-chamfer hud-hero-bg py-2 px-4 font-mono text-xs font-bold uppercase transition-all flex items-center gap-2 shadow-md hover:opacity-90 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>{loading ? "MENYINTESIS..." : "REGENERASI AI MENU"}</span>
          </button>
        </div>

        {/* AI Fallback Notice with prominent 'Coba Lagi' button */}
        {isFallback && (
          <div className="mb-6 p-4 rounded bg-amber-500/10 border-2 border-amber-500/40 text-amber-300 font-mono text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <span className="font-bold block uppercase tracking-wider text-[11px] text-amber-400">
                  MODE CADANGAN DETERMINISTIK AKTIF
                </span>
                <span className="text-[11px] text-slate-200 block mt-0.5">
                  {fallbackMessage || "Panggilan AI mencapai batas retry / kuota. Menu di bawah menggunakan formula nutrisi cadangan standar."}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={fetchMealPlan}
              disabled={loading}
              className="px-4 py-2 rounded hud-card-high border border-amber-400/60 hover:border-amber-400 text-amber-300 font-bold uppercase text-xs flex items-center gap-2 transition-all cursor-pointer shrink-0 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>COBA LAGI SINTESIS AI</span>
            </button>
          </div>
        )}

        {feedback && !isFallback && (
          <div className="mb-6 p-3 rounded bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 font-mono text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{feedback}</span>
          </div>
        )}

        {/* AI Strategy Summary Card */}
        {mealPlan && (
          <div className="hud-card border rounded p-4 sm:p-5 mb-6 relative shadow-lg">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b hud-border pb-3 mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 hud-beam-text" />
                <span className="font-display text-sm font-bold hud-hero-text uppercase">
                  STRATEGI NUTRISI AI GEMINI 3.8 FLASH
                </span>
              </div>
              <div className="flex items-center gap-4 font-mono text-xs">
                <span>TARGET: <strong className="hud-hero-text">{mealPlan.target_daily_kcal} kcal</strong></span>
                <span>SPLIT: <strong className="hud-beam-text">{mealPlan.weekly_split.protein_pct}P / {mealPlan.weekly_split.carbs_pct}C / {mealPlan.weekly_split.fat_pct}F</strong></span>
              </div>
            </div>
            <p className="font-mono text-xs hud-text-muted leading-relaxed">
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
          ].map((item, idx) => (
            <button
              key={item.full}
              onClick={() => setSelectedDayIndex(idx)}
              className={`p-1.5 sm:p-3 rounded border text-center font-mono transition-all cursor-pointer ${
                selectedDayIndex === idx
                  ? "hud-card-high border-primary ring-1 ring-primary shadow"
                  : "hud-card-inner hud-border hud-text-muted hover:border-primary/40 hover:hud-text"
              }`}
            >
              <span className="text-[8px] sm:text-[10px] text-outline block uppercase leading-none">H-0{idx + 1}</span>
              <span className={`text-[10px] sm:text-xs font-bold uppercase block mt-0.5 sm:mt-1 ${selectedDayIndex === idx ? "hud-hero-text" : ""}`}>
                <span className="sm:hidden">{item.short}</span>
                <span className="hidden sm:inline">{item.full}</span>
              </span>
            </button>
          ))}
        </div>

        {/* Selected Day Meals Grid */}
        {activeDay ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between font-mono text-xs hud-text-muted px-1">
              <span className="font-bold hud-text">MENU HARI {activeDay.day_name.toUpperCase()}</span>
              <span>TOTAL ESTIMASI: <strong className="hud-hero-text">{activeDay.total_day_kcal} kcal</strong></span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeDay.meals.map((meal, mIdx) => (
                <div
                  key={mIdx}
                  className="hud-card border rounded p-5 relative shadow-md hover:border-primary/50 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between pb-2 mb-3 border-b hud-border">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded hud-card-inner border hud-border flex items-center justify-center font-mono text-xs hud-hero-text font-bold">
                          {meal.time_slot}
                        </span>
                        <div>
                          <h3 className="font-display text-sm font-bold hud-text">{meal.meal_name}</h3>
                          <span className="font-mono text-[10px] text-outline uppercase block">RANSUM #{mIdx + 1}</span>
                        </div>
                      </div>
                      <div className="text-right">
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
                            <span className="hud-hero-text text-[10px] mt-0.5">►</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {meal.tips && (
                    <div className="mt-4 pt-2.5 border-t hud-border font-mono text-[11px] hud-text-muted italic">
                      💡 Tip Hunter: {meal.tips}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-12 text-center hud-card border rounded font-mono text-xs hud-text-muted">
            {loading ? "AI Gemini sedang menyusun kalkulasi nutrisi 7 hari..." : "Tekan 'REGENERASI AI MENU' untuk menyintesis rencana makan."}
          </div>
        )}

        {/* Navigation to Tracking */}
        <div className="mt-8 p-4 hud-card border rounded flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs shadow-lg">
          <div>
            <span className="hud-text font-bold block">Siap Mencatat Konsumsi Nyata?</span>
            <span className="text-[10px] text-outline block">Gunakan kamera AI Monster Scanner untuk foto makanan atau input teks manual</span>
          </div>
          <Link
            href="/scanner"
            className="hud-clip-chamfer hud-hero-bg px-5 py-2.5 text-xs font-bold uppercase transition-all flex items-center gap-2 shrink-0 hover:opacity-90"
          >
            <span>LANJUT KE STEP 6: AI TRACKING SCANNER</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>

      <TacticalFooter />
    </div>
  );
}

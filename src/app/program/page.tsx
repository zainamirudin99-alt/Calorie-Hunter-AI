"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TacticalHeader } from "@/components/hud/header";
import { TacticalFooter } from "@/components/hud/footer";
import { TelemetryTicker } from "@/components/hud/telemetry-ticker";
import { useTacticalTheme } from "@/components/theme-provider";
import { ProgramType } from "@/types/database";
import { getProgramNutrientRules, calculateTDEE } from "@/lib/tdee/calculator";
import { useSelectedAiModel } from "@/lib/gemini/models";
import { 
  Target, 
  Flame, 
  TrendingDown, 
  TrendingUp, 
  Activity, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  Shield,
  Zap,
  Calendar,
  Sparkles,
  Dumbbell,
  Scale,
  RefreshCw,
  Info
} from "lucide-react";

export default function ProgramSelectionPage() {
  const router = useRouter();
  const { isUltraman } = useTacticalTheme();
  const { activeModel, modelId } = useSelectedAiModel();

  const [selectedType, setSelectedType] = useState<ProgramType>("loss_fat_build_muscle");
  const [userTdee, setUserTdee] = useState<number>(2450);
  const [userBmr, setUserBmr] = useState<number>(1650);
  const [userWeightKg, setUserWeightKg] = useState<number>(75);
  const [userProfile, setUserProfile] = useState<any | null>(null);

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // AI Analysis State
  const [isAnalyzingAi, setIsAnalyzingAi] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<any | null>(null);

  useEffect(() => {
    const loadProfileData = async () => {
      // 1. Try local profile first
      const saved = localStorage.getItem("chai_user_profile");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.tdee) {
            setUserTdee(Number(parsed.tdee));
            setUserBmr(parsed.bmr ? Number(parsed.bmr) : Math.round(Number(parsed.tdee) / 1.55));
          }
          if (parsed.weight_kg) {
            setUserWeightKg(Number(parsed.weight_kg));
          }
          setUserProfile(parsed);
        } catch {}
      }

      // 2. Fetch server status to ensure exact synced biometrics
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("chai_auth_token") : null;
        const res = await fetch("/api/auth/status", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const statusData = await res.json();
          const p = statusData.profile;
          if (p && p.weight_kg && p.height_cm && p.age && p.gender) {
            setUserProfile(p);
            setUserWeightKg(Number(p.weight_kg));
            const tdeeResult = calculateTDEE({
              weight_kg: Number(p.weight_kg),
              height_cm: Number(p.height_cm),
              age: Number(p.age),
              gender: p.gender,
              activity_level: p.activity_level || "moderate",
            });
            setUserTdee(tdeeResult.tdee);
            setUserBmr(tdeeResult.bmr);
          }

          if (statusData.program?.program_type) {
            setSelectedType(statusData.program.program_type);
          }
        }
      } catch {}
    };

    loadProfileData();
  }, []);

  // Centralized deterministic calculation for all 6 specialized programs
  const activeTdeeResult = calculateTDEE({
    weight_kg: userWeightKg || 70,
    height_cm: userProfile?.height_cm ? Number(userProfile.height_cm) : 175,
    age: userProfile?.age ? Number(userProfile.age) : 25,
    gender: userProfile?.gender || "male",
    activity_level: userProfile?.activity_level || "moderate",
  });

  // 6 Specialized Programs requested by the user
  const programs = [
    {
      id: "weight_loss" as ProgramType,
      title: "WEIGHT LOSS",
      category: "Defisit Murni (-25%)",
      targetKcal: activeTdeeResult.targets.weight_loss,
      icon: TrendingDown,
      color: "var(--hero-accent)",
      ruleBadge: "BEBAS MAKRO & MIKRO",
      ruleDesc: "Tidak memperhatikan mikro dan makro nutrisinya. Target 100% difokuskan pada pematuhan defisit kalori harian.",
      features: [
        "Defisit agresif -25% TDEE (Clamped di BMR)",
        "Bebas & fleksibel tanpa hitung gram makro",
        "Mikronutrisi tidak di-enforce ketat",
      ],
      proteinPolicy: "Bebas / Tidak Wajib Pantau",
      isStrictProtein: false,
    },
    {
      id: "loss_fat" as ProgramType,
      title: "LOSS FAT",
      category: "Defisit Bakar Lemak (-20%)",
      targetKcal: activeTdeeResult.targets.loss_fat,
      icon: Flame,
      color: "var(--hero-accent)",
      ruleBadge: "FLEKSIBEL PROTEIN",
      ruleDesc: "Fokus pembakaran lemak, tidak memperhatikan protein hariannya secara ketat.",
      features: [
        "Defisit terukur -20% TDEE",
        "Tanpa target protein harian yang kaku",
        "Optimal untuk fat loss alami",
      ],
      proteinPolicy: "Fleksibel / Tanpa Enforce",
      isStrictProtein: false,
    },
    {
      id: "loss_fat_build_muscle" as ProgramType,
      title: "LOSS FAT & BUILD MUSCLE",
      category: "Body Recomposition (-18%)",
      targetKcal: activeTdeeResult.targets.loss_fat_build_muscle,
      icon: Dumbbell,
      color: "var(--beam-accent)",
      ruleBadge: "WAJIB PROTEIN TINGGI",
      ruleDesc: "Memperhatikan protein harian yang seharusnya untuk build muscle sambil menjaga defisit kalori.",
      features: [
        "Defisit -18% TDEE untuk fat loss",
        `Target protein ketat ${Math.round(userWeightKg * 2.0)}g/hari (2.0g/kg BB)`,
        "Retensi & stimulasi massa otot maksimal",
      ],
      proteinPolicy: `Wajib Tinggi (~${Math.round(userWeightKg * 2.0)}g/hari)`,
      isStrictProtein: true,
      highlight: true,
    },
    {
      id: "gain_mass" as ProgramType,
      title: "GAIN MASS",
      category: "Surplus Kalori Masif (+18%)",
      targetKcal: activeTdeeResult.targets.gain_mass,
      icon: TrendingUp,
      color: "var(--sub-accent)",
      ruleBadge: "BEBAS MAKRO & MIKRO",
      ruleDesc: "Tidak memperhatikan mikro dan makro. Fokus utama adalah mencapai surplus kalori harian untuk kenaikan bobot.",
      features: [
        "Surplus kalori +18% TDEE",
        "Bebas memilih sumber makanan berkalori",
        "Tanpa kewajiban hitung mikro atau makro",
      ],
      proteinPolicy: "Bebas / Fleksibel",
      isStrictProtein: false,
    },
    {
      id: "gain_mass_build_muscle" as ProgramType,
      title: "GAIN MASS & BUILD MUSCLE",
      category: "Surplus Hipertrofi (+12%)",
      targetKcal: activeTdeeResult.targets.gain_mass_build_muscle,
      icon: Zap,
      color: "var(--beam-accent)",
      ruleBadge: "WAJIB PROTEIN TINGGI",
      ruleDesc: "Surplus kalori terukur dan memperhatikan protein harian untuk memaksimalkan hipertrofi otot.",
      features: [
        "Surplus terarah +12% TDEE",
        `Target protein harian ${Math.round(userWeightKg * 1.8)}g/hari (1.8g/kg BB)`,
        "Hipertrofi miofibrilar dengan minim lemak",
      ],
      proteinPolicy: `Wajib Tinggi (~${Math.round(userWeightKg * 1.8)}g/hari)`,
      isStrictProtein: true,
    },
    {
      id: "lean_mass" as ProgramType,
      title: "LEAN MASS",
      category: "Clean Bulk & Atletik (+6%)",
      targetKcal: activeTdeeResult.targets.lean_mass,
      icon: Activity,
      color: "var(--sub-accent)",
      ruleBadge: "KONTROL MAKRO & MIKRO KETAT",
      ruleDesc: "Memperhatikan mikro dan makronya secara ketat untuk pertumbuhan massa murni dan kebugaran metabolik.",
      features: [
        "Surplus bersih +6% TDEE (Clean Bulk)",
        "Pelacakan ketat Karbo, Protein, & Lemak Seimbang",
        "Monitoring mikronutrisi: Sodium, Kalium, Vitamin C",
      ],
      proteinPolicy: `Optimal Seimbang (~${Math.round(userWeightKg * 1.9)}g/hari)`,
      isStrictProtein: true,
    },
  ];

  // Trigger Gemini AI analysis for selected program
  const triggerAiAnalysis = async (progType: ProgramType) => {
    setIsAnalyzingAi(true);
    setAiAnalysisResult(null);

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("chai_auth_token") : null;
      const res = await fetch("/api/programs/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          program_type: progType,
          profile: userProfile,
          model: modelId,
        }),
      });

      const data = await res.json();
      if (res.ok && data.analysis) {
        setAiAnalysisResult(data.analysis);
      }
    } catch (err) {
      console.warn("AI Analysis error:", err);
    } finally {
      setIsAnalyzingAi(false);
    }
  };

  // Run AI analysis on mount, program change, or model change
  useEffect(() => {
    triggerAiAnalysis(selectedType);
  }, [selectedType, modelId]);

  const handleActivateProgram = async () => {
    setLoading(true);
    setFeedback(null);

    const chosenProg = programs.find((p) => p.id === selectedType);
    const targetKcal = chosenProg?.targetKcal || 1950;

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("chai_auth_token") : null;
      const res = await fetch("/api/programs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ program_type: selectedType }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mengaktifkan program");
      }

      const activeProg = {
        program_type: selectedType,
        target_daily_kcal: targetKcal,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
        status: "active",
        nutrient_rules: getProgramNutrientRules(selectedType),
      };

      // Always persist active program to localStorage
      localStorage.setItem("chai_active_program", JSON.stringify(activeProg));

      setFeedback({
        type: "success",
        msg: `Program ${chosenProg?.title} (${targetKcal} kcal) berhasil diaktifkan! Menuju Tracking Makanan...`,
      });

      setTimeout(() => {
        window.location.href = "/scanner";
      }, 700);
    } catch {
      // Resilient local fallback
      const fallbackProg = {
        program_type: selectedType,
        target_daily_kcal: targetKcal,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
        status: "active",
        nutrient_rules: getProgramNutrientRules(selectedType),
      };
      localStorage.setItem("chai_active_program", JSON.stringify(fallbackProg));

      setFeedback({
        type: "success",
        msg: `Program ${chosenProg?.title} (${targetKcal} kcal) aktif secara lokal! Menuju Tracking Makanan...`,
      });

      setTimeout(() => {
        window.location.href = "/scanner";
      }, 700);
    } finally {
      setLoading(false);
    }
  };

  const selectedProgObj = programs.find((p) => p.id === selectedType) || programs[0];

  return (
    <div className="min-h-screen flex flex-col justify-between">
      <TacticalHeader activeTab="program" />
      <TelemetryTicker />

      <main className="flex-1 w-full max-w-6xl mx-auto p-3 sm:p-4 md:p-6 pb-24 md:pb-8 space-y-6">
        {/* Header Title */}
        <div className="hud-card border rounded p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg border-primary/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded hud-card-high border hud-border flex items-center justify-center hud-hero-text">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display text-base sm:text-lg font-bold hud-text uppercase">
                PILIH PROGRAM TIKET TEMPUR & ANALISIS AI
              </h1>
              <span className="font-mono text-[11px] text-outline uppercase block mt-0.5">
                Pilih dari 6 protokol nutrisi terukur • Dianalisis langsung oleh {activeModel.shortName}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs hud-text-muted shrink-0">
            <Calendar className="w-4 h-4 hud-beam-text" />
            <span>KAMPANYE: <strong className="hud-hero-text font-bold">180 HARI (6 BULAN)</strong></span>
          </div>
        </div>

        {feedback && (
          <div className={`p-4 rounded font-mono text-xs flex items-center gap-2 ${
            feedback.type === "success" 
              ? "bg-emerald-500/10 border border-emerald-500/40 text-emerald-400"
              : "bg-red-500/10 border border-red-500/40 text-red-400"
          }`}>
            {feedback.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="font-bold">{feedback.msg}</span>
          </div>
        )}

        {/* 6 Interactive Program Cards */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="font-mono text-xs hud-text-muted uppercase tracking-wider font-bold">
              6 PILIHAN PROGRAM TACTICAL HUNTER
            </span>
            <span className="font-mono text-[11px] hud-beam-text">
              BMR: {userBmr} kcal • TDEE: {userTdee} kcal ({userWeightKg} kg)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {programs.map((prog) => {
              const isSelected = selectedType === prog.id;
              const Icon = prog.icon;
              return (
                <div
                  key={prog.id}
                  onClick={() => setSelectedType(prog.id)}
                  className={`hud-card border rounded-lg p-5 relative flex flex-col justify-between transition-all cursor-pointer shadow-lg group hover:scale-[1.01] ${
                    isSelected 
                      ? "border-primary ring-2 ring-primary/40 shadow-primary/20 bg-primary/5" 
                      : "hover:border-primary/50"
                  }`}
                >
                  {/* Reticle corner markers */}
                  <div className="absolute top-2 left-2 text-outline font-mono text-[9px]">[+]</div>
                  <div className="absolute top-2 right-2 text-outline font-mono text-[9px]">[+]</div>

                  <div>
                    {/* Header: Rule badge & selector */}
                    <div className="flex items-center justify-between mb-3">
                      <span className={`font-mono text-[10px] px-2 py-0.5 rounded border font-bold ${
                        prog.isStrictProtein
                          ? "border-sky-500/40 bg-sky-950/40 text-sky-300"
                          : "hud-border hud-card-inner text-slate-300"
                      }`}>
                        {prog.ruleBadge}
                      </span>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        isSelected ? "border-primary hud-hero-bg" : "hud-border"
                      }`}>
                        {isSelected && <div className="w-2 h-2 rounded-full bg-black" />}
                      </div>
                    </div>

                    {/* Title & Icon */}
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded hud-card-inner border hud-border flex items-center justify-center shrink-0" style={{ color: prog.color }}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="font-display text-sm font-bold hud-text leading-tight">{prog.title}</h2>
                        <span className="font-mono text-[10px] text-outline block">{prog.category}</span>
                      </div>
                    </div>

                    {/* Target Calories Display */}
                    <div className="my-3 p-3 rounded hud-card-inner border hud-border text-center">
                      <span className="font-mono text-[9px] hud-text-muted uppercase block">
                        Target Kalori Harian
                      </span>
                      <span className="font-display text-2xl font-bold" style={{ color: prog.color }}>
                        {prog.targetKcal.toLocaleString()}
                      </span>
                      <span className="font-mono text-[10px] text-outline block">KCAL / HARI</span>
                    </div>

                    {/* Rule Description */}
                    <div className="p-2.5 rounded bg-black/40 border hud-border mb-3">
                      <span className="font-mono text-[10px] hud-hero-text font-bold block mb-0.5">
                        ATURAN NUTRISI KHUSUS:
                      </span>
                      <p className="font-mono text-[11px] hud-text-muted leading-relaxed">
                        {prog.ruleDesc}
                      </p>
                    </div>

                    {/* Features checklist */}
                    <ul className="space-y-1 font-mono text-[11px] hud-text-muted mb-3">
                      {prog.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: prog.color }} />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-2.5 border-t hud-border font-mono text-[10px] flex items-center justify-between">
                    <span className="text-outline uppercase">
                      PROTEIN: <strong className="hud-text">{prog.proteinPolicy}</strong>
                    </span>
                    <span className={isSelected ? "hud-hero-text font-bold" : "text-slate-500"}>
                      {isSelected ? "► AKTIF TERPILIH" : "PILIH"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI CONSULTATION & FEASIBILITY ANALYSIS SECTION */}
        <div className="hud-card border rounded-lg p-5 shadow-xl relative theme-transition space-y-4 border-primary/40">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b hud-border pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded hud-card-high border hud-border flex items-center justify-center hud-hero-text animate-pulse">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="font-display text-sm font-bold hud-hero-text uppercase tracking-wide">
                  HASIL ANALISIS KELAYAKAN AI ({activeModel.shortName})
                </span>
                <span className="font-mono text-[11px] hud-text-muted block">
                  Analisis biometrik untuk program: <strong className="hud-text font-bold">{selectedProgObj.title}</strong> ({selectedProgObj.targetKcal} kcal)
                </span>
              </div>
            </div>

            <button
              onClick={() => triggerAiAnalysis(selectedType)}
              disabled={isAnalyzingAi}
              className="px-3 py-1.5 rounded hud-card-high border hud-border hover:border-primary font-mono text-xs flex items-center gap-1.5 transition-all hud-text-muted hover:hud-text"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzingAi ? "animate-spin" : ""}`} />
              <span>{isAnalyzingAi ? "MENGANALISIS..." : "ANALISIS ULANG AI"}</span>
            </button>
          </div>

          {isAnalyzingAi ? (
            <div className="py-8 flex flex-col items-center justify-center gap-3 text-center">
              <RefreshCw className="w-8 h-8 hud-hero-text animate-spin" />
              <span className="font-mono text-xs hud-text-muted">
                {activeModel.shortName} sedang menganalisis data biometrik ({userWeightKg}kg, TDEE {userTdee} kcal) terhadap aturan {selectedProgObj.title}...
              </span>
            </div>
          ) : aiAnalysisResult ? (
            <div className="space-y-4 font-mono text-xs">
              {/* Verdict Banner */}
              <div className="p-3.5 rounded bg-black/60 border hud-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="px-2.5 py-1 rounded hud-hero-bg text-black font-bold text-[11px]">
                    STATUS: {aiAnalysisResult.feasibility_status || "DISETUJUI & OPTIMAL"}
                  </span>
                  <span className="hud-beam-text font-bold">
                    PROYEKSI: {aiAnalysisResult.weekly_projection}
                  </span>
                </div>
                <span className="text-[11px] text-outline">
                  Batas Harian: {aiAnalysisResult.target_daily_kcal || selectedProgObj.targetKcal} kcal
                </span>
              </div>

              {/* 2-Column Nutrition Strategy */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3.5 rounded hud-card-inner border hud-border space-y-1.5">
                  <span className="font-mono text-[11px] hud-beam-text font-bold block uppercase flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5" />
                    STRATEGI PROTEIN HARIAN
                  </span>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    {aiAnalysisResult.protein_strategy}
                  </p>
                </div>

                <div className="p-3.5 rounded hud-card-inner border hud-border space-y-1.5">
                  <span className="font-mono text-[11px] hud-hero-text font-bold block uppercase flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    KEBIJAKAN MAKRO & MIKRONUTRISI
                  </span>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    {aiAnalysisResult.macro_micro_policy}
                  </p>
                </div>
              </div>

              {/* Actionable Tactics */}
              {Array.isArray(aiAnalysisResult.actionable_tactics) && (
                <div className="p-3.5 rounded hud-card-inner border hud-border space-y-2">
                  <span className="font-mono text-[11px] hud-text font-bold block uppercase">
                    3 REKOMENDASI TAKTIS HUNTER (AI RECOMMENDATION):
                  </span>
                  <ul className="space-y-1.5">
                    {aiAnalysisResult.actionable_tactics.map((tip: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-[11px] text-slate-300">
                        <span className="hud-hero-text font-bold shrink-0">[{idx + 1}]</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* AI Motivation Verdict */}
              {aiAnalysisResult.ai_verdict && (
                <div className="p-3 rounded bg-primary/5 border border-primary/30 italic text-slate-300 text-[11px]">
                  &ldquo;{aiAnalysisResult.ai_verdict}&rdquo;
                </div>
              )}
            </div>
          ) : (
            <div className="py-4 text-center font-mono text-xs text-outline">
              Klik &quot;Analisis Ulang AI&quot; untuk memuat konsultasi {activeModel.shortName}.
            </div>
          )}
        </div>

        {/* Action Button & Invariant Confirmation */}
        <div className="hud-card border rounded-lg p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl border-primary/50">
          <div className="font-mono text-xs">
            <span className="hud-hero-text font-bold block flex items-center gap-2">
              <Shield className="w-4 h-4" />
              KOMITMEN KAMPANYE HUNTER 180 HARI
            </span>
            <span className="hud-text-muted text-[11px] block mt-0.5">
              Program <strong>{selectedProgObj.title}</strong> akan aktif dengan batas <strong>{selectedProgObj.targetKcal} kcal/hari</strong> dan terintegrasi langsung ke pemindai ransum Anda.
            </span>
          </div>

          <button
            onClick={handleActivateProgram}
            disabled={loading}
            className="hud-clip-chamfer hud-hero-bg py-3 px-6 font-mono text-xs font-bold uppercase transition-all flex items-center gap-2 shadow-xl hover:opacity-90 disabled:opacity-50 shrink-0 cursor-pointer text-black"
          >
            {loading ? (
              <span>MENGAKTIFKAN PROTOKOL...</span>
            ) : (
              <>
                <span>AKTIFKAN PROGRAM & MULAI TRACKING</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </main>

      <TacticalFooter />
    </div>
  );
}

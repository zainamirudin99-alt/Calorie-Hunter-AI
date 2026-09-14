"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TacticalHeader } from "@/components/hud/header";
import { TacticalFooter } from "@/components/hud/footer";
import { TelemetryTicker } from "@/components/hud/telemetry-ticker";
import { CampaignStepper } from "@/components/hud/campaign-stepper";
import { useTacticalTheme } from "@/components/theme-provider";
import { ProgramType } from "@/types/database";
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
  Calendar
} from "lucide-react";

export default function ProgramSelectionPage() {
  const router = useRouter();
  const { isUltraman } = useTacticalTheme();

  const [selectedType, setSelectedType] = useState<ProgramType>("cutting");
  const [userTdee, setUserTdee] = useState<number>(2450);
  const [userBmr, setUserBmr] = useState<number>(1650);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  useEffect(() => {
    // Load local profile if available
    const saved = localStorage.getItem("chai_user_profile");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.tdee) {
          setUserTdee(parsed.tdee);
          setUserBmr(Math.round(parsed.tdee / 1.55));
        }
      } catch {}
    }
  }, []);

  const programs = [
    {
      id: "cutting" as ProgramType,
      title: "CUTTING PROTOCOL",
      subtitle: "DEFISIT METABOLISME (-20%)",
      targetKcal: Math.max(userBmr, Math.round(userTdee * 0.8)),
      icon: TrendingDown,
      color: "var(--hero-accent)",
      desc: "Membakar timbunan lemak secara agresif dan aman dengan menjaga massa otot melalui retensi protein tinggi.",
      features: [
        "Defisit terukur -20% TDEE",
        "Clamping aman: tidak pernah di bawah BMR",
        "Rasio protein dinaikkan ke 35-40%",
      ],
      badge: "REKOMENDASI HUNTER",
    },
    {
      id: "maintenance" as ProgramType,
      title: "MAINTENANCE DEFENSE",
      subtitle: "KESEIMBANGAN ENERGI (0%)",
      targetKcal: userTdee,
      icon: Activity,
      color: "var(--beam-accent)",
      desc: "Menjaga berat badan ideal, stabilisasi hormonal, dan pemulihan performa energi tanpa perubahan berat.",
      features: [
        "Target kalori pas dengan TDEE",
        "Keseimbangan makro 30P / 45C / 25F",
        "Stabilitas jangka panjang 180 hari",
      ],
      badge: "STABILISASI METABOLIK",
    },
    {
      id: "bulking" as ProgramType,
      title: "BULKING POWER SURGE",
      subtitle: "SURPLUS ENERGI (+15%)",
      targetKcal: Math.round(userTdee * 1.15),
      icon: TrendingUp,
      color: "var(--sub-accent)",
      desc: "Meningkatkan massa otot dan kapasitas tenaga inti dengan surplus kalori terkontrol dan latihan terarah.",
      features: [
        "Surplus terarah +15% TDEE",
        "Mendukung sintesis protein hipertrofi",
        "Kapasitas glikogen optimal",
      ],
      badge: "POWER & HYPERTROPHY",
    },
  ];

  const handleActivateProgram = async () => {
    setLoading(true);
    setFeedback(null);

    try {
      const token = localStorage.getItem("chai_auth_token");
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

      setFeedback({
        type: "success",
        msg: `Program ${selectedType.toUpperCase()} aktif! Menyiapkan AI Rencana Makan...`,
      });

      setTimeout(() => {
        router.push("/meal-plan");
      }, 1500);
    } catch {
      // Local fallback
      localStorage.setItem("chai_active_program", JSON.stringify({
        program_type: selectedType,
        target_daily_kcal: programs.find(p => p.id === selectedType)?.targetKcal || 1950,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
        status: "active",
      }));

      setFeedback({
        type: "success",
        msg: `Program ${selectedType.toUpperCase()} aktif secara lokal! Melanjutkan ke Rencana Makan...`,
      });

      setTimeout(() => {
        router.push("/meal-plan");
      }, 1500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between">
      <TacticalHeader activeTab="profile" />
      <CampaignStepper />
      <TelemetryTicker />

      <main className="flex-1 w-full max-w-6xl mx-auto p-4 md:p-6">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 mb-6 border-b hud-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded hud-card-high border hud-border flex items-center justify-center hud-hero-text">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display text-base font-bold hud-text uppercase">
                PEMILIHAN PROGRAM TARGET HUNTER
              </h1>
              <span className="font-mono text-[10px] text-outline uppercase block">
                {isUltraman ? "SCIENCE PATROL STRATEGIC OBJECTIVE" : "TITAN PROTOCOL CAMPAIGN"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs hud-text-muted">
            <Calendar className="w-4 h-4 hud-beam-text" />
            <span>KAMPANYE BERLAKU: <strong className="hud-hero-text">180 HARI (6 BULAN)</strong></span>
          </div>
        </div>

        {feedback && (
          <div className={`mb-6 p-4 rounded font-mono text-xs flex items-center gap-2 ${
            feedback.type === "success" 
              ? "bg-emerald-500/10 border border-emerald-500/40 text-emerald-400"
              : "bg-red-500/10 border border-red-500/40 text-red-400"
          }`}>
            {feedback.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="font-bold">{feedback.msg}</span>
          </div>
        )}

        {/* 3 Interactive Program Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {programs.map((prog) => {
            const isSelected = selectedType === prog.id;
            const Icon = prog.icon;
            return (
              <div
                key={prog.id}
                onClick={() => setSelectedType(prog.id)}
                className={`hud-card border rounded p-6 relative flex flex-col justify-between transition-all cursor-pointer shadow-lg group hover:scale-[1.01] ${
                  isSelected 
                    ? "border-primary ring-1 ring-primary shadow-primary/20" 
                    : "hover:border-primary/50"
                }`}
              >
                {/* Reticle corner markers */}
                <div className="absolute top-2 left-2 text-outline font-mono text-[9px]">[+]</div>
                <div className="absolute top-2 right-2 text-outline font-mono text-[9px]">[+]</div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded border hud-border hud-card-inner font-bold" style={{ color: prog.color }}>
                      {prog.badge}
                    </span>
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                      isSelected ? "border-primary hud-hero-bg" : "hud-border"
                    }`}>
                      {isSelected && <div className="w-2 h-2 rounded-full bg-black" />}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded hud-card-inner border hud-border flex items-center justify-center" style={{ color: prog.color }}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="font-display text-sm font-bold hud-text">{prog.title}</h2>
                      <span className="font-mono text-[10px] text-outline block">{prog.subtitle}</span>
                    </div>
                  </div>

                  {/* Target Calories Display */}
                  <div className="my-4 p-3 rounded hud-card-inner border hud-border text-center">
                    <span className="font-mono text-[10px] hud-text-muted uppercase block">
                      Target Harian
                    </span>
                    <span className="font-display text-2xl font-bold" style={{ color: prog.color }}>
                      {prog.targetKcal}
                    </span>
                    <span className="font-mono text-xs text-outline block">KCAL / HARI</span>
                  </div>

                  <p className="font-mono text-xs hud-text-muted mb-4 leading-relaxed">
                    {prog.desc}
                  </p>

                  {/* Features */}
                  <ul className="space-y-1.5 font-mono text-[11px] hud-text-muted mb-4">
                    {prog.features.map((feat, idx) => (
                      <li key={idx} className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: prog.color }} />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-3 border-t hud-border font-mono text-[10px] text-outline text-center uppercase">
                  {isSelected ? "► PROTOKOL TERPILIH" : "KLIK UNTUK MEMILIH"}
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Button & Invariant Reminder */}
        <div className="hud-card border rounded p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="font-mono text-xs">
            <span className="hud-hero-text font-bold block flex items-center gap-2">
              <Shield className="w-4 h-4" />
              INVARIANT ATURAN 6 BULAN (ADR-5)
            </span>
            <span className="hud-text-muted text-[11px] block mt-0.5">
              Program akan aktif selama 180 hari. Setelah berakhir, sistem akan mengunci tracking hingga update berat badan baru dimasukkan.
            </span>
          </div>

          <button
            onClick={handleActivateProgram}
            disabled={loading}
            className="hud-clip-chamfer hud-hero-bg py-3 px-6 font-mono text-xs font-bold uppercase transition-all flex items-center gap-2 shadow-xl hover:opacity-90 disabled:opacity-50 shrink-0 cursor-pointer"
          >
            {loading ? (
              <span>MENGAKTIFKAN SISTEM...</span>
            ) : (
              <>
                <span>AKTIFKAN PROGRAM & LANJUT KE STEP 5: MEAL PLAN AI</span>
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

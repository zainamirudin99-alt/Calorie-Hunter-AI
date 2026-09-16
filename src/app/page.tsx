"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TacticalHeader } from "@/components/hud/header";
import { TacticalSidebar } from "@/components/hud/sidebar";
import { TelemetryTicker } from "@/components/hud/telemetry-ticker";
import { TacticalFooter } from "@/components/hud/footer";
import { LockoutGate } from "@/components/hud/lockout-gate";
import { useTacticalTheme } from "@/components/theme-provider";
import { DailyCalorieChart, WeightTrendChart, MacroDistributionChart } from "@/components/hud/charts";
import { 
  Swords, 
  Shield, 
  Bolt, 
  Utensils, 
  Gauge, 
  Layers, 
  LineChart, 
  TrendingDown, 
  PieChart, 
  Award, 
  Camera, 
  Droplets, 
  Dumbbell,
  CheckCircle2,
  Clock,
  Sparkles, 
  RefreshCw, 
  ArrowRight,
  Edit3,
  Upload,
  Wand2,
  X,
  UtensilsCrossed
} from "lucide-react";
import { calculateRemainingCalories } from "@/lib/tdee/calculator";

export default function DashboardPage() {
  const router = useRouter();
  const { isUltraman } = useTacticalTheme();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [telemetry, setTelemetry] = useState<any | null>(null);
  const [todayFoodList, setTodayFoodList] = useState<any[]>([]);

  // Companion character customization state
  const defaultCompanionName = isUltraman ? "ULTRA-GUARDIAN" : "VOLT-FANG";
  const defaultCompanionAvatar = "https://lh3.googleusercontent.com/aida-public/AB6AXuAVO6miNoH-FgRBDaHTjNKtiRwfWLhiRklLi_OhT69Y7kJb1fyWTwgI_BrOe41ffmqCbspeXEaiRB00FttDC5urU0NEqHhNZV2Dx8ajWDz8CzofWlC1YeBesV8kmo3pmHN0Im473PLW5iWp-JcvfqbTqVxjgxhN7dor9LSL1eoTJaUo18SGAs6wCIUsN6_YEOEpYgUqGiE8B0DYLV6sZg3cncPAfffv6D2O52TcM8Q7eKICzXKMoWqo";

  const [companionName, setCompanionName] = useState<string>(defaultCompanionName);
  const [companionAvatar, setCompanionAvatar] = useState<string>(defaultCompanionAvatar);
  const [isCompanionModalOpen, setIsCompanionModalOpen] = useState(false);
  const [companionEditMode, setCompanionEditMode] = useState<"upload" | "ai">("upload");
  const [customNameInput, setCustomNameInput] = useState("");
  const [characterDescInput, setCharacterDescInput] = useState("");
  const [previewUploadUrl, setPreviewUploadUrl] = useState<string | null>(null);
  const [aiGeneratedUrl, setAiGeneratedUrl] = useState<string | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [companionStatusMsg, setCompanionStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load customized companion from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("chai_companion_data");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.character_name) setCompanionName(parsed.character_name);
        if (parsed.avatar_url) setCompanionAvatar(parsed.avatar_url);
      } catch {}
    } else {
      setCompanionName(defaultCompanionName);
    }
  }, [isUltraman, defaultCompanionName]);

  // Verify session, onboarding completeness, and telemetry in a single round-trip
  useEffect(() => {
    const verifyStatus = async () => {
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("chai_auth_token") : null;
        const headers: Record<string, string> = {
          "Cache-Control": "no-cache",
        };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        // Single round-trip post-login aggregation endpoint
        const res = await fetch("/api/dashboard/summary", { headers });
        if (res.status === 401) {
          window.location.href = "/auth";
          return;
        }
        if (!res.ok) {
          window.location.href = "/auth";
          return;
        }

        const data = await res.json();
        if (!data.authenticated) {
          window.location.href = "/auth";
          return;
        }
        // Incomplete profile -> redirect to /profile
        if (!data.has_profile) {
          window.location.href = "/profile";
          return;
        }
        // Incomplete or no active program -> redirect to /program
        if (!data.has_program) {
          window.location.href = "/program";
          return;
        }

        // Synchronize cloud companion so Desktop and Mobile are 100% in sync
        if (data.companion && (data.companion.avatar_url || data.companion.character_name)) {
          if (data.companion.character_name) setCompanionName(data.companion.character_name);
          if (data.companion.avatar_url) setCompanionAvatar(data.companion.avatar_url);
          localStorage.setItem("chai_companion_data", JSON.stringify(data.companion));
        }

        setTelemetry(data);

        if (Array.isArray(data.today_food_items) && data.today_food_items.length > 0) {
          setTodayFoodList(data.today_food_items);
          // Mirror server food items to local device storage for offline and fast render
          const d = new Date();
          const localTodayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          try {
            const currentLocal = JSON.parse(localStorage.getItem("chai_food_logs_by_date") || "{}");
            currentLocal[localTodayStr] = data.today_food_items;
            localStorage.setItem("chai_food_logs_by_date", JSON.stringify(currentLocal));
          } catch {}
        } else {
          // Check localStorage with local date (matching scanner format YYYY-MM-DD)
          const d = new Date();
          const localTodayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          const utcTodayStr = d.toISOString().split("T")[0];
          const localLogs = localStorage.getItem("chai_food_logs_by_date");
          if (localLogs) {
            try {
              const parsed = JSON.parse(localLogs);
              const itemsForToday = parsed[localTodayStr] || parsed[utcTodayStr];
              if (Array.isArray(itemsForToday)) {
                setTodayFoodList(itemsForToday);
              }
            } catch {}
          }
        }

        // All onboarding steps completed and telemetry populated
        setIsCheckingAuth(false);
      } catch {
        setIsCheckingAuth(false);
      }
    };

    verifyStatus();

    const handleFocusSync = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        verifyStatus();
      }
    };

    window.addEventListener("visibilitychange", handleFocusSync);
    window.addEventListener("focus", handleFocusSync);

    return () => {
      window.removeEventListener("visibilitychange", handleFocusSync);
      window.removeEventListener("focus", handleFocusSync);
    };
  }, [router, defaultCompanionName]);

  // Cloud sync helper so companion updates sync between desktop and mobile
  const syncCompanionToCloud = async (data: { character_name: string; avatar_url: string; character_description?: string }) => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("chai_auth_token") : null;
      if (token) {
        const res = await fetch("/api/companion/sync", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          const resData = await res.json();
          return resData;
        }
      }
    } catch {}
    return null;
  };

  const handleSaveUploadedCompanion = async () => {
    if (!previewUploadUrl) {
      setCompanionStatusMsg({ type: "error", text: "Pilih file gambar terlebih dahulu." });
      return;
    }
    const finalName = customNameInput.trim() || companionName;
    const data = {
      character_name: finalName,
      avatar_url: previewUploadUrl,
    };
    setCompanionName(finalName);
    setCompanionAvatar(previewUploadUrl);
    localStorage.setItem("chai_companion_data", JSON.stringify(data));
    setCompanionStatusMsg({ type: "success", text: "Companion berhasil diperbarui dan disinkronkan ke cloud!" });

    const synced = await syncCompanionToCloud(data);
    if (synced?.companion?.avatar_url) {
      setCompanionAvatar(synced.companion.avatar_url);
      localStorage.setItem("chai_companion_data", JSON.stringify(synced.companion));
    }

    setTimeout(() => {
      setIsCompanionModalOpen(false);
      setCompanionStatusMsg(null);
    }, 900);
  };

  const handleGenerateAiCompanion = async () => {
    if (!customNameInput.trim()) {
      setCompanionStatusMsg({ type: "error", text: "Tuliskan nama karakter terlebih dahulu." });
      return;
    }
    if (!characterDescInput.trim()) {
      setCompanionStatusMsg({ type: "error", text: "Tuliskan deskripsi/tipe karakter terlebih dahulu." });
      return;
    }

    setIsGeneratingAi(true);
    setCompanionStatusMsg(null);

    try {
      const res = await fetch("/api/companion/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character_name: customNameInput.trim(),
          character_description: characterDescInput.trim(),
          theme: isUltraman ? "ultraman" : "godzilla",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menghasilkan visual AI");
      }

      setAiGeneratedUrl(data.image_url);
      setCompanionStatusMsg({ type: "success", text: "Visual AI berhasil dibuat! Tekan 'Terapkan' untuk menyimpan." });
    } catch (err: any) {
      setCompanionStatusMsg({ type: "error", text: err.message || "Gagal generate gambar AI." });
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleApplyAiCompanion = async () => {
    if (!aiGeneratedUrl) return;
    const finalName = customNameInput.trim() || companionName;
    const data = {
      character_name: finalName,
      avatar_url: aiGeneratedUrl,
      character_description: characterDescInput.trim(),
    };
    setCompanionName(finalName);
    setCompanionAvatar(aiGeneratedUrl);
    localStorage.setItem("chai_companion_data", JSON.stringify(data));
    setCompanionStatusMsg({ type: "success", text: "Companion AI berhasil diterapkan dan disinkronkan!" });

    const synced = await syncCompanionToCloud(data);
    if (synced?.companion?.avatar_url) {
      setCompanionAvatar(synced.companion.avatar_url);
      localStorage.setItem("chai_companion_data", JSON.stringify(synced.companion));
    }

    setTimeout(() => {
      setIsCompanionModalOpen(false);
      setCompanionStatusMsg(null);
    }, 900);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const resultStr = event.target?.result as string;
        if (!resultStr) return;

        // Optimize image with canvas to max 512x512 so it syncs fast and takes minimal storage
        const img = new window.Image();
        img.onload = () => {
          const maxDim = 512;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            setPreviewUploadUrl(canvas.toDataURL("image/jpeg", 0.85));
          } else {
            setPreviewUploadUrl(resultStr);
          }
        };
        img.onerror = () => {
          setPreviewUploadUrl(resultStr);
        };
        img.src = resultStr;
      };
      reader.readAsDataURL(file);
    }
  };

  const targetKcal = telemetry?.daily_target_kcal || 1950;
  const consumedKcal = telemetry?.today_consumed_kcal ?? 0;
  const remainingKcal = telemetry?.today_remaining_kcal ?? calculateRemainingCalories(targetKcal, consumedKcal);
  const isExpired = telemetry?.program_status?.isExpired || false;

  const dailyHistory = telemetry?.daily_history || [
    { day: "SEN", calories: 0, target: targetKcal },
    { day: "SEL", calories: 0, target: targetKcal },
    { day: "RAB", calories: 0, target: targetKcal },
    { day: "KAM", calories: 0, target: targetKcal },
    { day: "JUM", calories: 0, target: targetKcal },
    { day: "SAB", calories: 0, target: targetKcal },
    { day: "HARI INI", calories: consumedKcal, target: targetKcal },
  ];

  const weightTrend = telemetry?.weight_trend || [];
  const weeklyMacros = telemetry?.weekly_macros || {
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    protein_pct: 0,
    carbs_pct: 0,
    fat_pct: 0,
  };

  const feedPct = targetKcal > 0 ? Math.min(100, Math.round((consumedKcal / targetKcal) * 100)) : 0;
  const energyPct = consumedKcal > 0 ? Math.min(100, Math.round(35 + (feedPct * 0.65))) : 15;

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center hud-surface-bg font-mono text-xs p-4">
        <div className="hud-card border rounded-xl p-8 flex flex-col items-center gap-4 text-center max-w-sm shadow-2xl">
          <div className="w-12 h-12 rounded-full hud-card-high border hud-border flex items-center justify-center animate-spin">
            <span className="text-xl">⚡</span>
          </div>
          <div>
            <span className="hud-hero-text font-bold block uppercase tracking-wider text-sm">
              MEMVERIFIKASI PROTOKOL HUNTER...
            </span>
            <span className="text-[10px] text-outline block mt-1">
              Mengecek izin akses biometrik & sesi aktif
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* 6-Month Lockout Gate Interlock */}
      <LockoutGate isExpired={isExpired} />

      {/* HUD Header with custom logo.png & sidebar trigger */}
      <TacticalHeader activeTab="dashboard" />

      {/* Live Telemetry Ticker */}
      <TelemetryTicker />

      {/* Main HUD Viewport: Responsive 3-Column Command Center */}
      <main className="flex-1 w-full max-w-[1920px] mx-auto p-3 sm:p-4 md:p-6 pb-24 md:pb-8 space-y-5 sm:space-y-6">
        
        {/* Dashboard Progress Title Header */}
        <div className="hud-card border rounded p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg border-primary/30">
          <div>
            <span className="font-display text-base sm:text-lg font-bold hud-hero-text uppercase tracking-wide flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              MENU DASHBOARD & GRAFIK PROGRESS HARIAN
            </span>
            <p className="font-mono text-xs hud-text-muted mt-0.5">
              Pantau kepatuhan defisit/surplus kalori, persebaran makronutrisi, tren berat badan, dan status bio-resonansi familiar Anda.
            </p>
          </div>

          <Link
            href="/scanner"
            className="hud-clip-chamfer hud-hero-bg py-2.5 px-4 font-mono text-xs font-bold uppercase transition-all flex items-center gap-2 shadow hover:opacity-90 shrink-0 text-black dark:text-black"
          >
            <span>BUKA TRACKING MAKANAN</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 items-start">
        
        {/* ========================================================================= */}
        {/* COLUMN 1: HUNTER VITALITY & COMPANION (Cols 1-4)                          */}
        {/* ========================================================================= */}
        <section className="col-span-1 md:col-span-2 lg:col-span-4 flex flex-col gap-6">
          
          {/* CYBER MONSTER COMPANION CARD */}
          <div className="relative hud-card border rounded p-5 overflow-hidden group shadow-lg theme-transition">
            <div className="absolute top-2 left-2 text-outline font-mono text-[9px]">[+]</div>
            <div className="absolute top-2 right-2 text-outline font-mono text-[9px]">[+]</div>
            <div className="absolute bottom-2 left-2 text-outline font-mono text-[9px]">[+]</div>
            <div className="absolute bottom-2 right-2 text-outline font-mono text-[9px]">[+]</div>

            <div className="flex items-center justify-between mb-3 border-b hud-border pb-2">
              <div className="flex items-center gap-2">
                {isUltraman ? (
                  <Shield className="w-5 h-5 hud-beam-text" />
                ) : (
                  <Swords className="w-5 h-5 hud-beam-text" />
                )}
                <span className="font-display text-base hud-text tracking-wide font-bold">
                  {companionName}
                </span>
                <span className="text-xs px-2 py-0.5 rounded border hud-border hud-hero-text hud-card-inner font-mono font-bold">
                  LVL 24
                </span>
              </div>
              <button
                onClick={() => {
                  setCustomNameInput(companionName);
                  setCharacterDescInput("");
                  setPreviewUploadUrl(null);
                  setAiGeneratedUrl(null);
                  setCompanionStatusMsg(null);
                  setIsCompanionModalOpen(true);
                }}
                className="text-xs px-2.5 py-1 rounded border hud-border hud-card-high hover:border-primary flex items-center gap-1.5 transition-all text-white font-mono"
                title="Kustomisasi Karakter Familiar"
              >
                <Edit3 className="w-3.5 h-3.5 hud-hero-text" />
                <span>KUSTOMISASI</span>
              </button>
            </div>

            {/* Visual Companion Frame */}
            <div className="relative h-56 rounded hud-card-inner border hud-border overflow-hidden flex items-center justify-center crt-scanlines">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={companionAvatar}
                alt={companionName}
                className="w-full h-full object-cover opacity-85 glow-companion transition-all duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>

              {/* Dynamic bio-mood badges */}
              <div className="absolute top-3 left-3 bg-black/80 backdrop-blur border hud-border px-2 py-1 rounded flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full hud-hero-bg animate-pulse"></span>
                <span className="font-mono text-xs hud-hero-text">
                  STATUS: SIAP TEMPUR
                </span>
              </div>

              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between font-mono text-xs bg-black/85 backdrop-blur p-2 border hud-border rounded text-white">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Bonus Pertarungan</span>
                  <span className="hud-beam-text font-bold">+12% PENYERAPAN PROTEIN</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px] uppercase">Rasio Sinkronisasi</span>
                  <span className="hud-hero-text font-bold">94.8% RESONANSI</span>
                </div>
              </div>
            </div>

            {/* Hunger & Energy Gauges */}
            <div className="mt-4 space-y-3">
              <div>
                <div className="flex justify-between items-center font-mono text-xs mb-1">
                  <span className="hud-text-muted flex items-center gap-1">
                    <Bolt className="w-3.5 h-3.5 hud-hero-text" />
                    ENERGI FAMILIAR
                  </span>
                  <span className="hud-hero-text font-bold">
                    {consumedKcal > 0 ? `${energyPct}% (AKTIF)` : "STANDBY (RESTING)"}
                  </span>
                </div>
                <div className="w-full h-2 hud-card-high rounded overflow-hidden flex gap-0.5">
                  <div className="hud-hero-bg h-full transition-all duration-500" style={{ width: `${energyPct}%` }}></div>
                  <div className="hud-card-inner h-full flex-1"></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center font-mono text-xs mb-1">
                  <span className="hud-text-muted flex items-center gap-1">
                    <Utensils className="w-3.5 h-3.5 hud-beam-text" />
                    BUFFER KEKENYANGAN MAKAN
                  </span>
                  <span className="hud-beam-text font-bold">{consumedKcal.toLocaleString()} / {targetKcal.toLocaleString()} FEED UNITS</span>
                </div>
                <div className="w-full h-2 hud-card-high rounded overflow-hidden flex gap-0.5">
                  <div className="h-full transition-all duration-500" style={{ width: `${feedPct}%`, backgroundColor: "var(--beam-accent)" }}></div>
                  <div className="hud-card-inner h-full flex-1"></div>
                </div>
              </div>
            </div>
          </div>

          {/* TODAY'S CALORIE HP GAUGE CARD */}
          <div className="hud-card border rounded p-5 relative shadow-lg theme-transition">
            <div className="flex justify-between items-center mb-4 border-b hud-border pb-2">
              <div className="flex items-center gap-2">
                <Gauge className="w-5 h-5 hud-hero-text" />
                <h2 className="font-display text-base hud-text font-bold">MESIN KALORI HP</h2>
              </div>
              <span className="font-mono text-xs hud-text-muted">BATAS: {targetKcal} KCAL</span>
            </div>

            {/* Circular Arc Gauge */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
              <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <circle
                    className="text-slate-300 dark:text-slate-800"
                    cx="50"
                    cy="50"
                    fill="none"
                    r="42"
                    stroke="currentColor"
                    strokeDasharray="264"
                    strokeDashoffset="0"
                    strokeWidth="8"
                  />
                  <circle
                    className="radial-hud-track"
                    cx="50"
                    cy="50"
                    fill="none"
                    r="42"
                    stroke="var(--hero-accent)"
                    strokeLinecap="round"
                    strokeWidth="8"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="font-mono text-[11px] hud-text-muted uppercase">Terkonsumsi</span>
                  <span className="font-display text-2xl hud-hero-text font-bold leading-none">{consumedKcal}</span>
                  <span className="font-mono text-xs text-outline">KCAL</span>
                </div>
              </div>

              <div className="flex-1 w-full space-y-3">
                <div className="p-3 hud-card-inner rounded border hud-border">
                  <div className="flex justify-between font-mono text-xs mb-1">
                    <span className="hud-text-muted uppercase">Target Tersisa</span>
                    <span className="hud-beam-text font-bold">{remainingKcal} KCAL</span>
                  </div>
                  <div className="text-xs text-muted-foreground hud-text-muted">
                    Cadangan ransum malam untuk menjamin defisit metabolisme yang aman dan terkontrol.
                  </div>
                </div>
                <div className="flex items-center justify-between font-mono text-xs px-1">
                  <span className="hud-text-muted">TARGET PEMBAKARAN:</span>
                  <span className="hud-text font-bold font-mono">2,450 KCAL TDEE</span>
                </div>
              </div>
            </div>

            {/* Segmented Micro Status Track */}
            <div className="mt-4 pt-3 border-t hud-border flex items-center gap-1.5">
              <div className="h-1.5 flex-1 rounded-sm hud-hero-bg"></div>
              <div className="h-1.5 flex-1 rounded-sm hud-hero-bg"></div>
              <div className="h-1.5 flex-1 rounded-sm hud-hero-bg"></div>
              <div className="h-1.5 flex-1 rounded-sm hud-hero-bg"></div>
              <div className="h-1.5 flex-1 rounded-sm hud-hero-bg"></div>
              <div className="h-1.5 flex-1 rounded-sm opacity-50 hud-hero-bg"></div>
              <div className="h-1.5 flex-1 rounded-sm hud-card-high"></div>
              <div className="h-1.5 flex-1 rounded-sm hud-card-high"></div>
            </div>
          </div>

          {/* MACRO BREAKDOWN METER CARD */}
          <div className="hud-card border rounded p-5 shadow-lg theme-transition">
            <div className="flex justify-between items-center mb-4 border-b hud-border pb-2">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 hud-beam-text" />
                <h2 className="font-display text-base hud-text font-bold">TELEMETRI MAKRO</h2>
              </div>
              <span className="font-mono text-xs hud-hero-text">RASIO OPTIMAL</span>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center font-mono text-xs mb-1.5">
                  <span className="hud-beam-text flex items-center gap-1 font-bold">
                    <span className="w-1.5 h-1.5 rounded-sm" style={{ backgroundColor: "var(--beam-accent)" }}></span>
                    PROTEIN [PERISAI INTEGRITAS]
                  </span>
                  <span className="hud-text">145g / 160g <span className="hud-beam-text font-bold">(90%)</span></span>
                </div>
                <div className="w-full h-3 hud-card-inner rounded-sm p-0.5 border hud-border">
                  <div className="h-full rounded-sm w-[90%]" style={{ backgroundColor: "var(--beam-accent)", boxShadow: "0 0 8px rgba(77,216,247,0.4)" }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center font-mono text-xs mb-1.5">
                  <span className="hud-sub-text flex items-center gap-1 font-bold">
                    <span className="w-1.5 h-1.5 rounded-sm" style={{ backgroundColor: "var(--sub-accent)" }}></span>
                    KARBOHIDRAT [MANA CADANGAN]
                  </span>
                  <span className="hud-text">130g / 180g <span className="hud-sub-text font-bold">(72%)</span></span>
                </div>
                <div className="w-full h-3 hud-card-inner rounded-sm p-0.5 border hud-border">
                  <div className="h-full rounded-sm w-[72%]" style={{ backgroundColor: "var(--sub-accent)", boxShadow: "0 0 8px rgba(221,183,255,0.3)" }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center font-mono text-xs mb-1.5">
                  <span className="hud-hero-text flex items-center gap-1 font-bold">
                    <span className="w-1.5 h-1.5 rounded-sm hud-hero-bg"></span>
                    LEMAK [STAMINA INTI]
                  </span>
                  <span className="hud-text">38g / 55g <span className="hud-hero-text font-bold">(69%)</span></span>
                </div>
                <div className="w-full h-3 hud-card-inner rounded-sm p-0.5 border hud-border">
                  <div className="hud-hero-bg h-full rounded-sm w-[69%]" style={{ boxShadow: "0 0 8px var(--hud-glow)" }}></div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t hud-border flex justify-between font-mono text-xs hud-text-muted">
              <span>TARGET SPLIT: 35P / 45C / 20F</span>
              <span className="hud-hero-text font-bold">STATUS: SEIMBANG</span>
            </div>
          </div>

        </section>

        {/* ========================================================================= */}
        {/* COLUMN 2: DAILY VS TARGET ANALYTICS & WEIGHT TREND (Cols 5-8)             */}
        {/* ========================================================================= */}
        <section className="col-span-1 md:col-span-2 lg:col-span-4 flex flex-col gap-6">
          
          {/* RECHARTS: KALORI HARIAN VS TARGET */}
          <div className="hud-card border rounded p-5 relative shadow-lg theme-transition">
            <div className="flex justify-between items-center mb-3 border-b hud-border pb-2">
              <div>
                <div className="flex items-center gap-2">
                  <LineChart className="w-5 h-5 hud-hero-text" />
                  <h2 className="font-display text-base hud-text font-bold">KALORI HARIAN VS TARGET</h2>
                </div>
                <p className="font-mono text-[11px] hud-text-muted mt-0.5 uppercase">RADAR DEFISIT HISTORIS 7 HARI</p>
              </div>
              <span className="font-mono text-xs hud-beam-text px-2 py-0.5 rounded hud-card-inner border hud-border">
                BATAS: {targetKcal} kcal
              </span>
            </div>

            {/* Recharts Bar Chart Visualizer */}
            <DailyCalorieChart data={dailyHistory} targetKcal={targetKcal} />

            <div className="mt-3 pt-3 border-t hud-border flex items-center justify-between font-mono text-xs">
              <span className="hud-text-muted uppercase">Kepatuhan Mingguan:</span>
              <span className="hud-hero-text font-bold">85.7% TARGET TERCAPAI</span>
            </div>
          </div>

          {/* RECHARTS: TREND BERAT BADAN */}
          <div className="hud-card border rounded p-5 relative shadow-lg theme-transition">
            <div className="flex justify-between items-center mb-3 border-b hud-border pb-2">
              <div>
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 hud-beam-text" />
                  <h2 className="font-display text-base hud-text font-bold">TREND BERAT BADAN</h2>
                </div>
                <p className="font-mono text-[11px] hud-text-muted mt-0.5 uppercase">PROGRESS KAMPANYE AKTIF</p>
              </div>
              <div className="text-right">
                <span className="font-display text-lg hud-hero-text font-bold">78.4 kg</span>
                <span className="font-mono text-xs hud-text-muted block">-3.6 kg TOTAL</span>
              </div>
            </div>

            {/* Recharts Area Chart Visualizer */}
            <WeightTrendChart data={weightTrend} />

            <div className="mt-3 pt-3 border-t hud-border flex justify-between items-center font-mono text-xs">
              <span className="hud-text-muted">SASARAN: 75.0 kg</span>
              <span className="hud-beam-text font-bold">RITME: 0.6 kg / MG (OPTIMAL)</span>
            </div>
          </div>

          {/* RECHARTS: BREAKDOWN MAKRO MINGGUAN */}
          <div className="hud-card border rounded p-5 shadow-lg theme-transition">
            <div className="flex justify-between items-center mb-3 border-b hud-border pb-2">
              <div className="flex items-center gap-2">
                <PieChart className="w-5 h-5 hud-sub-text" />
                <h2 className="font-display text-base hud-text font-bold">BREAKDOWN MAKRO MINGGUAN</h2>
              </div>
              <span className="font-mono text-xs hud-text-muted uppercase">AGREGAT 7 HARI</span>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3 my-2">
              <div className="hud-card-inner p-2.5 rounded border hud-border text-center">
                <span className="font-mono text-[10px] hud-beam-text block mb-0.5 font-bold">PROTEIN</span>
                <span className="font-display text-base font-bold hud-text">{weeklyMacros.protein_g}g</span>
                <span className="font-mono text-[9px] hud-text-muted block mt-0.5">{weeklyMacros.protein_pct}% total</span>
              </div>
              <div className="hud-card-inner p-2.5 rounded border hud-border text-center">
                <span className="font-mono text-[10px] hud-sub-text block mb-0.5 font-bold">KARBO</span>
                <span className="font-display text-base font-bold hud-text">{weeklyMacros.carbs_g}g</span>
                <span className="font-mono text-[9px] hud-text-muted block mt-0.5">{weeklyMacros.carbs_pct}% total</span>
              </div>
              <div className="hud-card-inner p-2.5 rounded border hud-border text-center">
                <span className="font-mono text-[10px] hud-hero-text block mb-0.5 font-bold">LEMAK</span>
                <span className="font-display text-base font-bold hud-text">{weeklyMacros.fat_g}g</span>
                <span className="font-mono text-[9px] hud-text-muted block mt-0.5">{weeklyMacros.fat_pct}% total</span>
              </div>
            </div>

            {/* Recharts Pie Chart Visualizer */}
            <MacroDistributionChart 
              proteinPct={weeklyMacros.protein_pct || 33} 
              carbsPct={weeklyMacros.carbs_pct || 34} 
              fatPct={weeklyMacros.fat_pct || 33} 
            />

            <div className="flex justify-between items-center font-mono text-xs hud-text-muted mt-2 pt-2 border-t hud-border">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--beam-accent)" }}></span> {weeklyMacros.protein_pct}% P</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--sub-accent)" }}></span> {weeklyMacros.carbs_pct}% K</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full hud-hero-bg"></span> {weeklyMacros.fat_pct}% L</span>
            </div>
          </div>

        </section>

        {/* ========================================================================= */}
        {/* COLUMN 3: DAILY HUNTING LOG & ACTIVE QUESTS (Cols 9-12)                   */}
        {/* ========================================================================= */}
        <section className="col-span-1 md:col-span-2 lg:col-span-4 flex flex-col gap-6">
          
          {/* LOG RANSUM TEMPUR */}
          <div className="hud-card border rounded p-5 shadow-lg theme-transition">
            <div className="flex justify-between items-center mb-4 border-b hud-border pb-2">
              <div className="flex items-center gap-2">
                <Utensils className="w-5 h-5 hud-hero-text" />
                <h2 className="font-display text-base hud-text font-bold">LOG RANSUM TEMPUR</h2>
              </div>
              <span className="font-mono text-xs hud-beam-text font-bold">
                {todayFoodList.length} TERCATAT
              </span>
            </div>

            {todayFoodList.length > 0 ? (
              <div className="space-y-3">
                {todayFoodList.map((item, idx) => (
                  <div key={item.id || idx} className="hud-card-inner border hud-border rounded p-3 flex items-center justify-between hover:border-primary transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded hud-card-high border hud-border flex items-center justify-center hud-hero-text font-mono text-xs">
                        {item.time_logged || "LOG"}
                      </div>
                      <div>
                        <span className="font-mono text-[11px] hud-text-muted block uppercase">{item.meal_slot || "Ransum"}</span>
                        <span className="font-display text-sm hud-text font-semibold">{item.food_name}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-xs hud-hero-text font-bold block">{item.calories_kcal} kcal</span>
                      <span className="font-mono text-[11px] hud-beam-text">
                        {item.macros?.protein_g || 0}g P • {item.macros?.carbs_g || 0}g K • {item.macros?.fat_g || 0}g L
                      </span>
                    </div>
                  </div>
                ))}

                {/* Sisa Alokasi Slot Berikutnya */}
                <div className="hud-card-inner border border-dashed rounded p-3 flex items-center justify-between" style={{ borderColor: "var(--hero-accent)" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded hud-card border border-dashed flex items-center justify-center hud-hero-text font-mono text-xs animate-pulse" style={{ borderColor: "var(--hero-accent)" }}>
                      [+]
                    </div>
                    <div>
                      <span className="font-mono text-[11px] hud-hero-text block uppercase font-bold">SLOT RANSUM BERIKUTNYA</span>
                      <span className="font-display text-sm hud-text font-medium italic">Alokasi Kalori Tersedia</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-xs hud-beam-text font-bold block">{remainingKcal} kcal</span>
                    <span className="font-mono text-[11px] hud-text-muted">Batas Sisa</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="hud-card-inner border hud-border border-dashed rounded-lg p-6 flex flex-col items-center text-center gap-2.5">
                  <div className="w-11 h-11 rounded-full hud-card-high border hud-border flex items-center justify-center text-slate-500">
                    <UtensilsCrossed className="w-5 h-5 hud-hero-text" />
                  </div>
                  <div>
                    <span className="font-display text-sm hud-text font-bold block">
                      BELUM ADA RANSUM TERCATAT HARI INI
                    </span>
                    <span className="font-mono text-xs text-outline block mt-1">
                      0 kcal terkonsumsi • Mulai telemetri makanan Anda untuk mengisi buffer energi familiar
                    </span>
                  </div>
                  <Link
                    href="/scanner"
                    className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded hud-card-high border hud-border hover:border-primary text-xs font-mono hud-hero-text transition-all shadow"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>MULAI SCAN / TRACKING MAKANAN</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>

                {/* Alokasi Penuh Hari Ini */}
                <div className="hud-card-inner border border-dashed rounded p-3 flex items-center justify-between" style={{ borderColor: "var(--hero-accent)" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded hud-card border border-dashed flex items-center justify-center hud-hero-text font-mono text-xs">
                      [100%]
                    </div>
                    <div>
                      <span className="font-mono text-[11px] hud-hero-text block uppercase font-bold">TOTAL KUOTA KALORI HARIAN</span>
                      <span className="font-display text-sm hud-text font-medium">Cadangan Ransum Penuh</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-sm hud-beam-text font-bold block">{targetKcal} kcal</span>
                    <span className="font-mono text-[10px] hud-text-muted">Target Harian</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ACTIVE QUESTS */}
          <div className="hud-card border rounded p-5 shadow-lg theme-transition">
            <div className="flex justify-between items-center mb-4 border-b hud-border pb-2">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 hud-beam-text" />
                <h2 className="font-display text-base hud-text font-bold">QUEST HUNTER AKTIF</h2>
              </div>
              <span className="font-mono text-xs hud-hero-text">REFRESH: 05:42:19</span>
            </div>

            <div className="space-y-3">
              <div className="hud-card-inner p-3.5 rounded border hud-border">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <div className="w-4 h-4 mt-0.5 border hud-border flex items-center justify-center" style={{ borderColor: "var(--hero-accent)" }}>
                      <div className="w-2 h-2 hud-hero-bg"></div>
                    </div>
                    <div>
                      <h3 className="font-display text-xs hud-text font-semibold">Capai Target 150g Protein</h3>
                      <p className="text-xs text-muted-foreground hud-text-muted mt-0.5">Target: 145g tercatat / sisa 5g lagi.</p>
                    </div>
                  </div>
                  <span className="font-mono text-[11px] hud-hero-text px-2 py-0.5 rounded border hud-border whitespace-nowrap" style={{ backgroundColor: "var(--tag-bg)" }}>
                    +250 EXP
                  </span>
                </div>
                <div className="w-full h-1.5 hud-card-high rounded mt-2.5 overflow-hidden">
                  <div className="hud-hero-bg h-full w-[96%]"></div>
                </div>
              </div>

              <div className="hud-card-inner p-3.5 rounded border hud-border">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 hud-hero-text" />
                    <div>
                      <h3 className="font-display text-xs hud-text font-semibold">Reservoir Hidrasi (2,500ml)</h3>
                      <p className="text-xs text-muted-foreground hud-text-muted mt-0.5">2,600ml tercatat. Protokol hidrasi selesai!</p>
                    </div>
                  </div>
                  <span className="font-mono text-[11px] hud-beam-text px-2 py-0.5 rounded border hud-border font-bold whitespace-nowrap">
                    SELESAI
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* TACTICAL QUICK-ACTION BUTTONS */}
          <div className="hud-card border rounded p-5 shadow-lg theme-transition">
            <span className="font-mono text-xs hud-text-muted block uppercase tracking-wider mb-3">
              DISPATCH CEPAT TAKTIS
            </span>
            <div className="grid grid-cols-1 gap-2.5">
              <Link
                href="/scanner"
                className="hud-clip-chamfer hud-hero-bg py-3 px-4 font-mono text-xs font-bold transition-all flex items-center justify-between shadow-lg hover:opacity-90"
              >
                <span className="flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  PINDAI CEPAT RANSUM
                </span>
                <span className="text-[10px] font-mono">[AI-KAMERA]</span>
              </Link>

              <button className="hud-card-inner border hud-border hud-beam-text py-3 px-4 font-mono text-xs font-bold hover:bg-sky-500/10 transition-colors flex items-center justify-between" style={{ borderColor: "var(--beam-accent)" }}>
                <span className="flex items-center gap-2">
                  <Droplets className="w-4 h-4" />
                  CATAT AIR MINUM (+250ML)
                </span>
                <span className="text-[10px] font-mono">[HIDRASI]</span>
              </button>

              <Link
                href="/activities"
                className="hud-card-inner border hud-border hud-sub-text py-3 px-4 font-mono text-xs font-bold hover:opacity-80 transition-colors flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <Dumbbell className="w-4 h-4" />
                  LOG DUNGEON (LATIHAN)
                </span>
                <span className="text-[10px] font-mono">[BAKAR EXP]</span>
              </Link>
            </div>
          </div>
        </section>
        </div>
      </main>

      {/* HUD Footer */}
      <TacticalFooter />

      {/* COMPANION CHARACTER CUSTOMIZATION MODAL */}
      {isCompanionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="hud-card border rounded-lg p-5 sm:p-6 max-w-lg w-full shadow-2xl relative border-primary/50">
            <button
              onClick={() => {
                setIsCompanionModalOpen(false);
                setCompanionStatusMsg(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded hud-card-high border hud-border"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-4 border-b hud-border pb-3">
              <Sparkles className="w-5 h-5 hud-hero-text" />
              <div>
                <h3 className="font-display text-base font-bold hud-text">KUSTOMISASI FAMILIAR COMPANION</h3>
                <p className="font-mono text-[10px] text-outline">
                  Kustomisasi visual monster bio-mech / ultra guardian pendamping Anda
                </p>
              </div>
            </div>

            {/* Mode Switcher */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                type="button"
                onClick={() => {
                  setCompanionEditMode("upload");
                  setCompanionStatusMsg(null);
                }}
                className={`py-2 px-3 rounded font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition-all border ${
                  companionEditMode === "upload"
                    ? "hud-hero-bg text-black border-primary"
                    : "hud-card-high hud-text-muted border-slate-700 hover:border-slate-500"
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>UPLOAD GAMBAR</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCompanionEditMode("ai");
                  setCompanionStatusMsg(null);
                }}
                className={`py-2 px-3 rounded font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition-all border ${
                  companionEditMode === "ai"
                    ? "hud-hero-bg text-black border-primary"
                    : "hud-card-high hud-text-muted border-slate-700 hover:border-slate-500"
                }`}
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>GENERATE DENGAN AI</span>
              </button>
            </div>

            {/* Character Name Input */}
            <div className="mb-4">
              <label className="block font-mono text-xs hud-text-muted mb-1 uppercase font-bold">
                Nama Karakter Familiar
              </label>
              <input
                type="text"
                value={customNameInput}
                onChange={(e) => setCustomNameInput(e.target.value)}
                placeholder="misal: VOLT-FANG, CYBER-REX, ULTRA-MECHA"
                className="w-full hud-card-inner border hud-border rounded p-2.5 font-mono text-xs text-white focus:outline-none focus:border-primary"
                maxLength={40}
              />
            </div>

            {/* TAB 1: UPLOAD GAMBAR */}
            {companionEditMode === "upload" && (
              <div className="space-y-4">
                <div className="border-2 border-dashed hud-border rounded-lg p-4 text-center hud-card-inner">
                  {previewUploadUrl ? (
                    <div className="relative w-40 h-40 mx-auto rounded overflow-hidden border hud-border mb-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={previewUploadUrl}
                        alt="Preview Upload"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="py-6">
                      <Upload className="w-8 h-8 mx-auto hud-hero-text mb-2 opacity-80" />
                      <p className="font-mono text-xs text-slate-300">Pilih file gambar (JPG, PNG, WebP)</p>
                      <p className="font-mono text-[10px] text-outline mt-1">Maksimal 5MB</p>
                    </div>
                  )}

                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="block w-full text-xs font-mono text-slate-400 file:mr-4 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:hud-hero-bg file:text-black hover:file:opacity-90 cursor-pointer"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSaveUploadedCompanion}
                  className="w-full hud-clip-chamfer hud-hero-bg py-2.5 px-4 font-mono text-xs font-bold uppercase text-black hover:opacity-90 transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>SIMPAN & TERAPKAN GAMBAR</span>
                </button>
              </div>
            )}

            {/* TAB 2: GENERATE AI */}
            {companionEditMode === "ai" && (
              <div className="space-y-4">
                <div className="hud-card-inner border hud-border rounded p-3">
                  <div className="flex items-center justify-between text-[11px] font-mono mb-1.5">
                    <span className="text-slate-400">TEMA SISTEM AKTIF:</span>
                    <span className="hud-hero-text font-bold">
                      {isUltraman ? "ULTRAMAN LIGHT MECHA" : "GODZILLA DARK KAIJU"}
                    </span>
                  </div>
                  <label className="block font-mono text-xs hud-text-muted mb-1 uppercase font-bold">
                    Deskripsi / Tipe Karakter
                  </label>
                  <textarea
                    value={characterDescInput}
                    onChange={(e) => setCharacterDescInput(e.target.value)}
                    placeholder="misal: Serigala cyborg bermata laser biru bertaring plasma dengan armor titanium hitam..."
                    rows={3}
                    className="w-full hud-card border hud-border rounded p-2 font-mono text-xs text-white focus:outline-none focus:border-primary resize-none"
                  />
                  <p className="font-mono text-[10px] text-outline mt-1">
                    AI Gemini & generator akan mensintesis seni digital resolusi tinggi sesuai deskripsi dan tema aktif.
                  </p>
                </div>

                {/* AI Image Generation Active Loading Box */}
                {isGeneratingAi && (
                  <div className="text-center my-2">
                    <div className="relative w-44 h-44 mx-auto rounded-lg overflow-hidden border-2 border-primary/60 shadow-lg mb-2 hud-card-inner flex flex-col items-center justify-center p-3 animate-pulse">
                      <RefreshCw className="w-8 h-8 hud-hero-text animate-spin mb-2" />
                      <span className="font-mono text-xs hud-hero-text font-bold uppercase tracking-wider">
                        MENSINTESIS VISUAL...
                      </span>
                      <span className="font-mono text-[10px] text-outline mt-1 text-center">
                        Memproses bio-mech neural render
                      </span>
                    </div>
                  </div>
                )}

                {/* AI Image Preview Result */}
                {!isGeneratingAi && aiGeneratedUrl && (
                  <div className="text-center my-2">
                    <div className="relative w-44 h-44 mx-auto rounded-lg overflow-hidden border-2 border-primary shadow-lg mb-2 bg-black/60 flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={aiGeneratedUrl}
                        alt="Hasil AI"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="font-mono text-[11px] hud-beam-text block">Preview Visual AI Berhasil</span>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleGenerateAiCompanion}
                    disabled={isGeneratingAi}
                    className="flex-1 hud-card-high border hud-border hover:border-primary py-2.5 px-3 font-mono text-xs font-bold uppercase hud-hero-text transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isGeneratingAi ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>MENSINTESIS VISUAL AI...</span>
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4" />
                        <span>{aiGeneratedUrl ? "GENERATE ULANG" : "GENERATE AI KARAKTER"}</span>
                      </>
                    )}
                  </button>

                  {aiGeneratedUrl && (
                    <button
                      type="button"
                      onClick={handleApplyAiCompanion}
                      className="hud-clip-chamfer hud-hero-bg py-2.5 px-4 font-mono text-xs font-bold uppercase text-black hover:opacity-90 transition-all flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>TERAPKAN</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Feedback Message */}
            {companionStatusMsg && (
              <div
                className={`mt-3 p-2.5 rounded font-mono text-xs flex items-center gap-2 ${
                  companionStatusMsg.type === "success"
                    ? "bg-emerald-950/70 border border-emerald-500/50 text-emerald-300"
                    : "bg-rose-950/70 border border-rose-500/50 text-rose-300"
                }`}
              >
                <span>{companionStatusMsg.text}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { TacticalHeader } from "@/components/hud/header";
import { TacticalFooter } from "@/components/hud/footer";
import { TelemetryTicker } from "@/components/hud/telemetry-ticker";
import { useTacticalTheme } from "@/components/theme-provider";
import { WeeklyActivity, ActivityIntensity, SportCategory, WorkoutLog } from "@/types/database";
import {
  SPORT_CATEGORIES,
  SPORTS_DATABASE,
  SportDefinition,
  calculateBurnedCalories,
  searchSports,
} from "@/lib/workouts/sports";
import {
  Activity,
  Plus,
  Trash2,
  Clock,
  Repeat,
  Zap,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Flame,
  RefreshCw,
  Dumbbell,
  Calendar,
  Search,
  Trophy,
  Shield,
  Target,
  Sliders,
  Sparkles,
  Info,
  CalendarDays,
  X
} from "lucide-react";

export default function ActivitiesPage() {
  const { isUltraman } = useTacticalTheme();

  // Mode: "daily" (Log Harian Olahraga) or "weekly" (Jadwal Rutin Mingguan)
  const [activeTab, setActiveTab] = useState<"daily" | "weekly">("daily");

  // User current profile weight in kg (for dynamic MET calorie burn conversion)
  const [userWeight, setUserWeight] = useState<number>(75);

  // Helper to format date string YYYY-MM-DD
  const getTodayDateString = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  // -------------------------------------------------------------
  // DAILY WORKOUT LOG STATE
  // -------------------------------------------------------------
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [dailyWorkouts, setDailyWorkouts] = useState<WorkoutLog[]>([]);
  const [totalBurnedKcal, setTotalBurnedKcal] = useState<number>(0);
  const [totalDurationMinutes, setTotalDurationMinutes] = useState<number>(0);
  const [isDailyLoading, setIsDailyLoading] = useState<boolean>(false);
  const [isSubmittingWorkout, setIsSubmittingWorkout] = useState<boolean>(false);
  const [dailyFeedback, setDailyFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Form State for logging a workout
  const [selectedCategory, setSelectedCategory] = useState<SportCategory | "all">("all");
  const [sportSearch, setSportSearch] = useState<string>("");
  const [selectedSport, setSelectedSport] = useState<SportDefinition>(
    SPORTS_DATABASE.find((s) => s.id === "racket-badminton") || SPORTS_DATABASE[0]
  );
  const [customSportName, setCustomSportName] = useState<string>("");
  const [customMet, setCustomMet] = useState<number>(6.0);
  const [workoutDuration, setWorkoutDuration] = useState<number>(60);
  const [workoutIntensity, setWorkoutIntensity] = useState<ActivityIntensity>("moderate");
  const [workoutNotes, setWorkoutNotes] = useState<string>("");
  const [showWorkoutForm, setShowWorkoutForm] = useState<boolean>(true);

  // Filtered sports list for selection
  const filteredSports = useMemo(() => {
    return searchSports(sportSearch, selectedCategory);
  }, [sportSearch, selectedCategory]);

  // Dynamic MET calculation value
  const activeMetValue = useMemo(() => {
    if (selectedSport.id === "other-custom") {
      return customMet;
    }
    return selectedSport.defaultMet;
  }, [selectedSport, customMet]);

  // Live real-time estimated calories burned
  const liveEstimatedKcal = useMemo(() => {
    return calculateBurnedCalories({
      met: activeMetValue,
      weightKg: userWeight,
      durationMinutes: workoutDuration,
      intensity: workoutIntensity,
    });
  }, [activeMetValue, userWeight, workoutDuration, workoutIntensity]);

  // -------------------------------------------------------------
  // WEEKLY ROUTINE STATE (Preserved from original)
  // -------------------------------------------------------------
  const [activities, setActivities] = useState<WeeklyActivity[]>([
    {
      id: "act-1",
      user_id: "demo",
      activity_name: "Latihan Angkat Beban (Strength Training)",
      frequency_per_week: 4,
      duration_minutes: 60,
      intensity: "high",
      created_at: new Date().toISOString(),
    },
    {
      id: "act-2",
      user_id: "demo",
      activity_name: "Jogging Pagi / Lari Santai",
      frequency_per_week: 3,
      duration_minutes: 30,
      intensity: "moderate",
      created_at: new Date().toISOString(),
    },
  ]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState("");
  const [freq, setFreq] = useState(3);
  const [duration, setDuration] = useState(45);
  const [intensity, setIntensity] = useState<ActivityIntensity>("moderate");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [isActSyncing, setIsActSyncing] = useState(false);

  // -------------------------------------------------------------
  // FETCH USER PROFILE (WEIGHT) & INITIAL DATA
  // -------------------------------------------------------------
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const data = await res.json();
          if (data.profile?.weight_kg) {
            setUserWeight(Number(data.profile.weight_kg));
          }
        }
      } catch {}
    };

    fetchProfile();
    fetchDailyWorkouts(selectedDate);
    fetchActivities(true);

    const handleGlobalSync = () => {
      fetchDailyWorkouts(selectedDate);
      fetchActivities(false);
    };

    window.addEventListener("chai_trigger_cloud_sync", handleGlobalSync);
    return () => {
      window.removeEventListener("chai_trigger_cloud_sync", handleGlobalSync);
    };
  }, []);

  // Fetch daily workouts whenever selectedDate changes
  useEffect(() => {
    fetchDailyWorkouts(selectedDate);
  }, [selectedDate]);

  const fetchDailyWorkouts = async (date: string) => {
    setIsDailyLoading(true);
    try {
      const res = await fetch(`/api/workouts?date=${date}`);
      if (res.ok) {
        const data = await res.json();
        setDailyWorkouts(data.workouts || []);
        setTotalBurnedKcal(data.total_burned_kcal || 0);
        setTotalDurationMinutes(data.total_duration_minutes || 0);
      }
    } catch {
      // offline fallback
    } finally {
      setIsDailyLoading(false);
    }
  };

  // Reusable sync activities from API (Weekly)
  const fetchActivities = async (silent = true) => {
    if (!silent) setIsActSyncing(true);
    try {
      const res = await fetch("/api/activities");
      if (res.ok) {
        const data = await res.json();
        if (data.activities && data.activities.length > 0) {
          setActivities(data.activities);
        }
        if (!silent) {
          setFeedback({
            type: "success",
            msg: "Daftar aktivitas mingguan berhasil disinkronkan dari Cloud!",
          });
        }
      }
    } catch {
      if (!silent) {
        setFeedback({
          type: "error",
          msg: "Gagal menyinkronkan aktivitas dari server.",
        });
      }
    } finally {
      if (!silent) setIsActSyncing(false);
    }
  };

  // -------------------------------------------------------------
  // HANDLE LOG DAILY WORKOUT
  // -------------------------------------------------------------
  const handleSaveWorkout = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingWorkout(true);
    setDailyFeedback(null);

    const isCustom = selectedSport.id === "other-custom";
    const finalSportName = isCustom ? customSportName.trim() : selectedSport.name;

    if (!finalSportName) {
      setDailyFeedback({ type: "error", msg: "Tuliskan nama olahraga kustom Anda." });
      setIsSubmittingWorkout(false);
      return;
    }

    try {
      const res = await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sport_category: selectedSport.category,
          sport_name: finalSportName,
          met_value: activeMetValue,
          duration_minutes: workoutDuration,
          intensity: workoutIntensity,
          logged_date: selectedDate,
          notes: workoutNotes.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mencatat olahraga.");
      }

      setDailyFeedback({
        type: "success",
        msg: `Sesi ${finalSportName} berhasil disimpan! Terbakar: ${data.calories_burned || liveEstimatedKcal} kcal.`,
      });

      // Refresh list
      await fetchDailyWorkouts(selectedDate);

      // Trigger event so dashboard summary can refresh
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("chai_trigger_cloud_sync"));
      }

      // Reset form fields
      setWorkoutNotes("");
      if (isCustom) setCustomSportName("");
    } catch (err: any) {
      setDailyFeedback({
        type: "error",
        msg: err.message || "Gagal menyimpan olahraga.",
      });
    } finally {
      setIsSubmittingWorkout(false);
    }
  };

  const handleDeleteWorkout = async (id: string) => {
    const prev = [...dailyWorkouts];
    setDailyWorkouts(dailyWorkouts.filter((w) => w.id !== id));
    try {
      const res = await fetch(`/api/workouts?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        setDailyWorkouts(prev);
      } else {
        await fetchDailyWorkouts(selectedDate);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("chai_trigger_cloud_sync"));
        }
      }
    } catch {
      setDailyWorkouts(prev);
    }
  };

  // -------------------------------------------------------------
  // HANDLE WEEKLY ACTIVITY
  // -------------------------------------------------------------
  const handleAddWeekly = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    const newAct: WeeklyActivity = {
      id: "act-" + Date.now(),
      user_id: "user",
      activity_name: name,
      frequency_per_week: Number(freq),
      duration_minutes: Number(duration),
      intensity,
      created_at: new Date().toISOString(),
    };

    try {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          activity_name: name,
          frequency_per_week: Number(freq),
          duration_minutes: Number(duration),
          intensity,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setActivities([data.activity, ...activities]);
      } else {
        setActivities([newAct, ...activities]);
      }
      setFeedback({ type: "success", msg: "Aktivitas mingguan baru berhasil didaftarkan!" });
      setName("");
      setShowAddForm(false);
    } catch {
      setActivities([newAct, ...activities]);
      setFeedback({ type: "success", msg: "Aktivitas tersimpan secara lokal." });
      setName("");
      setShowAddForm(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWeekly = async (id: string) => {
    setActivities(activities.filter((a) => a.id !== id));
    try {
      await fetch(`/api/activities?id=${id}`, {
        method: "DELETE",
      });
    } catch {
      // Ignored in offline fallback
    }
  };

  // Helper icon for sport categories
  const getCategoryIcon = (cat: SportCategory) => {
    switch (cat) {
      case "gym":
        return <Dumbbell className="w-4 h-4" />;
      case "cardio":
        return <Flame className="w-4 h-4 text-orange-400" />;
      case "racket":
        return <Zap className="w-4 h-4 text-yellow-400" />;
      case "team_sports":
        return <Trophy className="w-4 h-4 text-emerald-400" />;
      case "combat_water":
        return <Shield className="w-4 h-4 text-cyan-400" />;
      case "flexibility_hiit":
        return <Activity className="w-4 h-4 text-purple-400" />;
      default:
        return <Target className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between">
      <TacticalHeader activeTab="activities" />
      <TelemetryTicker />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 min-w-0">
        
        {/* Top Header Banner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 mb-6 border-b hud-border min-w-0">
          <div className="flex items-center gap-3 min-w-0 w-full max-w-full">
            <div className="w-10 h-10 rounded hud-card-high border hud-border flex items-center justify-center hud-hero-text shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-base sm:text-lg font-bold hud-text uppercase truncate">
                SEKTOR 06: TRACKING OLAHRAGA & TELEMETRI MET
              </h1>
              <span className="font-mono text-[10px] text-outline uppercase block truncate">
                {isUltraman
                  ? "SCIENCE PATROL COMBAT DISPATCH & CALORIE BURN SYSTEM"
                  : "TITAN COMBAT LOG & ENERGY EXPENDITURE PROTOCOL"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                if (activeTab === "daily") fetchDailyWorkouts(selectedDate);
                else fetchActivities(false);
              }}
              disabled={isDailyLoading || isActSyncing}
              className="flex-1 sm:flex-none min-h-[44px] py-2 px-3 rounded hud-card-inner border hud-border hover:border-primary font-mono text-xs font-bold uppercase transition-all flex items-center justify-center gap-1.5 text-slate-300 hover:text-white disabled:opacity-50 cursor-pointer shadow-sm"
              title="Sinkronkan data dari Cloud"
            >
              <RefreshCw
                className={`w-4 h-4 shrink-0 ${
                  isDailyLoading || isActSyncing ? "animate-spin text-primary" : "text-cyan-400"
                }`}
              />
              <span>{isDailyLoading || isActSyncing ? "SYNC..." : "SINKRONKAN CLOUD"}</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TWO TACTICAL TABS: DAILY LOG VS WEEKLY SCHEDULE                          */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-2 gap-2 p-1.5 rounded-lg hud-card-inner border hud-border mb-6">
          <button
            type="button"
            onClick={() => setActiveTab("daily")}
            className={`py-3 px-3 sm:px-4 rounded font-display text-xs sm:text-sm font-bold uppercase flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === "daily"
                ? "hud-hero-bg text-black shadow-lg"
                : "hud-text-muted hover:hud-text hover:bg-white/5"
            }`}
          >
            <Flame className="w-4 h-4 shrink-0" />
            <span className="truncate">LOG OLAHRAGA HARIAN</span>
            {dailyWorkouts.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                activeTab === "daily" ? "bg-black/25 text-black" : "hud-card-high hud-hero-text"
              }`}>
                {dailyWorkouts.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("weekly")}
            className={`py-3 px-3 sm:px-4 rounded font-display text-xs sm:text-sm font-bold uppercase flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === "weekly"
                ? "hud-hero-bg text-black shadow-lg"
                : "hud-text-muted hover:hud-text hover:bg-white/5"
            }`}
          >
            <CalendarDays className="w-4 h-4 shrink-0" />
            <span className="truncate">JADWAL RUTIN MINGGUAN</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
              activeTab === "weekly" ? "bg-black/25 text-black" : "hud-card-high hud-hero-text"
            }`}>
              {activities.length}
            </span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: DAILY WORKOUT LOG & SCIENTIFIC CALORIE BURN CONVERTER             */}
        {/* ========================================================================= */}
        {activeTab === "daily" && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            
            {/* Top Control Bar: Date Navigation & Daily Stats Banner */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
              
              {/* Date Selector Box */}
              <div className="lg:col-span-5 hud-card border rounded p-3.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 shadow">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 hud-hero-text shrink-0" />
                  <span className="font-mono text-xs font-bold uppercase hud-text">TANGGAL TEMPUR:</span>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setSelectedDate(getTodayDateString())}
                    className={`px-2.5 py-1.5 rounded font-mono text-[11px] font-bold uppercase transition-all ${
                      selectedDate === getTodayDateString()
                        ? "hud-hero-bg text-black"
                        : "hud-card-inner border hud-border text-slate-300 hover:text-white"
                    }`}
                  >
                    HARI INI
                  </button>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-3 py-1.5 rounded hud-card-inner border hud-border hud-text font-mono text-xs focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Stats Bar */}
              <div className="lg:col-span-7 grid grid-cols-3 gap-3">
                <div className="hud-card border rounded p-3 shadow flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-400 font-mono text-[10px] uppercase">
                    <span>Terbakar</span>
                    <Flame className="w-3.5 h-3.5 text-orange-400" />
                  </div>
                  <div className="mt-1">
                    <span className="font-display text-lg sm:text-xl font-bold text-orange-400 leading-none">
                      {totalBurnedKcal.toLocaleString()}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400 ml-1">KCAL</span>
                  </div>
                </div>

                <div className="hud-card border rounded p-3 shadow flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-400 font-mono text-[10px] uppercase">
                    <span>Durasi</span>
                    <Clock className="w-3.5 h-3.5 hud-sub-text" />
                  </div>
                  <div className="mt-1">
                    <span className="font-display text-lg sm:text-xl font-bold hud-text leading-none">
                      {totalDurationMinutes}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400 ml-1">MNT</span>
                  </div>
                </div>

                <div className="hud-card border rounded p-3 shadow flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-400 font-mono text-[10px] uppercase">
                    <span>Berat Bio</span>
                    <Sparkles className="w-3.5 h-3.5 hud-beam-text" />
                  </div>
                  <div className="mt-1">
                    <span className="font-display text-lg sm:text-xl font-bold hud-beam-text leading-none">
                      {userWeight}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400 ml-1">KG</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notification Feedback */}
            {dailyFeedback && (
              <div
                className={`p-3 rounded font-mono text-xs flex items-center justify-between gap-2 shadow ${
                  dailyFeedback.type === "success"
                    ? "bg-emerald-500/10 border border-emerald-500/40 text-emerald-400"
                    : "bg-red-500/10 border border-red-500/40 text-red-400"
                }`}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{dailyFeedback.msg}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setDailyFeedback(null)}
                  className="p-1 hover:opacity-75 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Workout Input Card */}
            <div className="hud-card border rounded-lg p-4 sm:p-6 shadow-xl relative min-w-0 border-primary/40">
              <div className="flex items-center justify-between pb-3 mb-4 border-b hud-border">
                <div className="flex items-center gap-2">
                  <Dumbbell className="w-5 h-5 hud-hero-text" />
                  <div>
                    <h2 className="font-display text-sm sm:text-base font-bold hud-text uppercase">
                      CATAT OLAHRAGA BARU & KONVERSI KALORI
                    </h2>
                    <span className="font-mono text-[10px] hud-text-muted">
                      Formula MET Internasional terkalibrasi ke bobot {userWeight} kg Anda
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowWorkoutForm(!showWorkoutForm)}
                  className="text-xs px-2.5 py-1 rounded hud-card-inner border hud-border font-mono hud-text-muted hover:hud-text flex items-center gap-1 cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>{showWorkoutForm ? "SEMBUNYIKAN" : "BUKA FORM"}</span>
                </button>
              </div>

              {showWorkoutForm && (
                <form onSubmit={handleSaveWorkout} className="space-y-5 font-mono text-xs">
                  
                  {/* Category Filter Pills */}
                  <div>
                    <label className="block text-slate-300 uppercase mb-2 font-bold flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 hud-hero-text" />
                      <span>1. PILIH KATEGORI CABANG OLAHRAGA</span>
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedCategory("all")}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-bold uppercase transition-all flex items-center gap-1.5 ${
                          selectedCategory === "all"
                            ? "hud-hero-bg text-black shadow"
                            : "hud-card-inner border hud-border text-slate-300 hover:text-white"
                        }`}
                      >
                        <span>SEMUA OLAHRAGA</span>
                      </button>
                      {SPORT_CATEGORIES.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            setSelectedCategory(cat.id);
                            // Auto select first sport in category
                            const first = SPORTS_DATABASE.find((s) => s.category === cat.id);
                            if (first) setSelectedSport(first);
                          }}
                          className={`px-3 py-1.5 rounded-full text-[11px] font-bold uppercase transition-all flex items-center gap-1.5 ${
                            selectedCategory === cat.id
                              ? "hud-hero-bg text-black shadow"
                              : "hud-card-inner border hud-border text-slate-300 hover:text-white"
                          }`}
                        >
                          {getCategoryIcon(cat.id)}
                          <span>{cat.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sport Search & Selection Grid */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-slate-300 uppercase font-bold flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 hud-beam-text" />
                        <span>2. PILIH JENIS OLAHRAGA SPESIFIK ({filteredSports.length} PILIHAN)</span>
                      </label>
                      <div className="relative w-44 sm:w-60">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={sportSearch}
                          onChange={(e) => setSportSearch(e.target.value)}
                          placeholder="Cari olahraga..."
                          className="w-full pl-8 pr-3 py-1 rounded hud-card-inner border hud-border hud-text text-xs focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>

                    {/* Sports Pill Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-52 overflow-y-auto p-1 rounded border hud-border hud-card-inner">
                      {filteredSports.map((sport) => {
                        const isSelected = selectedSport.id === sport.id;
                        return (
                          <button
                            key={sport.id}
                            type="button"
                            onClick={() => setSelectedSport(sport)}
                            className={`p-2.5 rounded text-left transition-all flex flex-col justify-between border ${
                              isSelected
                                ? "hud-card-high border-primary shadow-md ring-1 ring-primary"
                                : "hud-card-inner border-transparent hover:border-slate-700 hover:bg-white/5"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1.5">
                              <span className={`font-bold text-xs ${isSelected ? "hud-hero-text" : "text-white"}`}>
                                {sport.name}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-black/40 text-cyan-400 shrink-0 border hud-border">
                                MET {sport.defaultMet}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 line-clamp-1 mt-1">
                              {sport.description}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* If Custom Sport is selected */}
                  {selectedSport.id === "other-custom" && (
                    <div className="p-3.5 rounded hud-card-high border hud-border grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-slate-300 uppercase mb-1">Nama Olahraga Kustom</label>
                        <input
                          type="text"
                          required
                          value={customSportName}
                          onChange={(e) => setCustomSportName(e.target.value)}
                          placeholder="Contoh: Skateboard, Arung Jeram, Parkour"
                          className="w-full px-3 py-2 rounded hud-card-inner border hud-border hud-text text-xs focus:outline-none focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 uppercase mb-1">Nilai MET Estimasi</label>
                        <input
                          type="number"
                          step="0.5"
                          min="2.0"
                          max="16.0"
                          value={customMet}
                          onChange={(e) => setCustomMet(Number(e.target.value))}
                          className="w-full px-3 py-2 rounded hud-card-inner border hud-border hud-text text-xs focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>
                  )}

                  {/* Duration & Intensity Row */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2">
                    
                    {/* Duration Controller */}
                    <div className="lg:col-span-6 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-slate-300 uppercase font-bold flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 hud-sub-text" />
                          <span>3. DURASI LATIHAN:</span>
                        </label>
                        <span className="font-display text-base font-bold hud-hero-text">
                          {workoutDuration} MENIT <span className="font-mono text-xs text-slate-400">({(workoutDuration / 60).toFixed(1)} jam)</span>
                        </span>
                      </div>

                      <input
                        type="range"
                        min="5"
                        max="240"
                        step="5"
                        value={workoutDuration}
                        onChange={(e) => setWorkoutDuration(Number(e.target.value))}
                        className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary"
                      />

                      {/* Quick preset buttons */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {[15, 30, 45, 60, 90, 120].map((mins) => (
                          <button
                            key={mins}
                            type="button"
                            onClick={() => setWorkoutDuration(mins)}
                            className={`px-2.5 py-1 rounded font-mono text-[11px] font-bold transition-all ${
                              workoutDuration === mins
                                ? "hud-hero-bg text-black shadow"
                                : "hud-card-inner border hud-border text-slate-300 hover:text-white"
                            }`}
                          >
                            {mins}m
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Intensity Segmented Buttons */}
                    <div className="lg:col-span-6 space-y-2">
                      <label className="block text-slate-300 uppercase font-bold flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-yellow-400" />
                        <span>4. INTENSITAS KERJA</span>
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: "low", label: "RENDAH", mult: "0.88x", desc: "Santai / Pemulihan" },
                          { id: "moderate", label: "SEDANG", mult: "1.00x", desc: "Tempo Stabil Standar" },
                          { id: "high", label: "TINGGI", mult: "1.15x", desc: "Max Effort / Laktat" },
                        ].map((lvl) => {
                          const isCur = workoutIntensity === lvl.id;
                          return (
                            <button
                              key={lvl.id}
                              type="button"
                              onClick={() => setWorkoutIntensity(lvl.id as ActivityIntensity)}
                              className={`p-2 rounded text-left border transition-all flex flex-col justify-between ${
                                isCur
                                  ? "hud-hero-bg text-black border-primary shadow"
                                  : "hud-card-inner border-slate-700 text-slate-300 hover:text-white"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs">{lvl.label}</span>
                                <span className="text-[10px] font-mono opacity-80">{lvl.mult}</span>
                              </div>
                              <span className="text-[10px] opacity-75 mt-0.5 line-clamp-1">{lvl.desc}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Notes Field */}
                  <div>
                    <label className="block text-slate-300 uppercase mb-1">Catatan Latihan / Hobi (Opsional)</label>
                    <input
                      type="text"
                      value={workoutNotes}
                      onChange={(e) => setWorkoutNotes(e.target.value)}
                      placeholder="e.g. Main ganda 3 set di lapangan indoor, leg press 140kg 4 set"
                      className="w-full px-3 py-2 rounded hud-card-inner border hud-border hud-text text-xs focus:outline-none focus:border-primary"
                    />
                  </div>

                  {/* ================================================================= */}
                  {/* LIVE CALORIE CONVERTER HUD DISPLAY BOX                            */}
                  {/* ================================================================= */}
                  <div className="p-4 rounded-lg hud-card-high border border-primary/50 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg bg-gradient-to-r from-black/80 via-transparent to-black/80">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <div className="w-12 h-12 rounded-lg hud-hero-bg text-black flex items-center justify-center font-bold text-xl shadow-lg shrink-0">
                        🔥
                      </div>
                      <div>
                        <span className="font-mono text-[10px] hud-hero-text uppercase tracking-widest font-bold block">
                          KALORI TERBAKAR TERKONVERSI
                        </span>
                        <div className="flex items-baseline gap-2">
                          <span className="font-display text-2xl sm:text-3xl font-bold text-orange-400">
                            {liveEstimatedKcal.toLocaleString()}
                          </span>
                          <span className="font-mono text-sm font-bold text-slate-300">KCAL TERBAKAR</span>
                        </div>
                        <span className="font-mono text-[10px] text-slate-400 block mt-0.5">
                          Rumus: MET ({activeMetValue}) × {userWeight}kg × {(workoutDuration / 60).toFixed(2)} jam × {workoutIntensity === "high" ? "1.15" : workoutIntensity === "low" ? "0.88" : "1.0"}
                        </span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingWorkout}
                      className="w-full sm:w-auto min-h-[48px] hud-clip-chamfer hud-hero-bg px-6 py-2.5 font-display text-xs sm:text-sm font-bold uppercase transition-all flex items-center justify-center gap-2 shadow-lg hover:opacity-90 cursor-pointer text-black disabled:opacity-50 shrink-0"
                    >
                      <Plus className="w-4 h-4 shrink-0" />
                      <span>{isSubmittingWorkout ? "MENYIMPAN..." : "SIMPAN OLAHRAGA KE LOG"}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* List of Logged Workouts on Selected Date */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-xs sm:text-sm font-bold hud-text uppercase flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span>SESI OLAHRAGA TERCATAT ({selectedDate}):</span>
                </h3>
                <span className="font-mono text-xs hud-hero-text font-bold">
                  TOTAL TERBAKAR: {totalBurnedKcal.toLocaleString()} KCAL
                </span>
              </div>

              {dailyWorkouts.length === 0 ? (
                <div className="p-8 text-center hud-card border rounded-lg font-mono text-xs hud-text-muted">
                  <Dumbbell className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                  <span>Belum ada sesi olahraga yang dicatat pada {selectedDate}.</span>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Gunakan form di atas untuk mencatat olahraga seperti gym, badminton, tenis, futsal, lari, renang, dan lainnya.
                  </p>
                </div>
              ) : (
                dailyWorkouts.map((workout) => (
                  <div
                    key={workout.id}
                    className="hud-card-inner border hud-border rounded-lg p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-primary/50 transition-colors shadow min-w-0"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-lg hud-card-high border hud-border flex items-center justify-center text-orange-400 shrink-0 mt-0.5">
                        <Flame className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-display text-sm font-bold hud-text break-words">
                            {workout.sport_name}
                          </h4>
                          <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase bg-black/50 text-cyan-400 border hud-border">
                            MET {workout.met_value}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 font-mono text-xs hud-text-muted mt-1.5 flex-wrap">
                          <span className="flex items-center gap-1 text-orange-400 font-bold">
                            <Flame className="w-3.5 h-3.5" />
                            {workout.calories_burned} kcal
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-slate-300">
                            <Clock className="w-3.5 h-3.5 hud-sub-text" />
                            {workout.duration_minutes} Menit
                          </span>
                          <span>•</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              workout.intensity === "high"
                                ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                : workout.intensity === "moderate"
                                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            }`}
                          >
                            INTENSITAS: {workout.intensity}
                          </span>
                        </div>

                        {workout.notes && (
                          <p className="font-mono text-[11px] text-slate-400 mt-1 italic break-words">
                            &quot;{workout.notes}&quot;
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteWorkout(workout.id)}
                      className="min-h-[44px] min-w-[44px] p-2 rounded hud-card-high border hud-border flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-colors shrink-0 self-end sm:self-center cursor-pointer"
                      title="Hapus Catatan Olahraga"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: WEEKLY ROUTINE & RECURRING SCHEDULE (Preserved Sektor 3)           */}
        {/* ========================================================================= */}
        {activeTab === "weekly" && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-lg hud-card border">
              <div>
                <h2 className="font-display text-sm font-bold hud-text uppercase">
                  JADWAL AKTIVITAS & OLAHRAGA MINGGUAN (TDEE BASELINE)
                </h2>
                <p className="font-mono text-xs hud-text-muted mt-0.5">
                  Daftar rutinitas mingguan ini digunakan sebagai pengali PAL (Physical Activity Level) dan input AI untuk menyusun rekomendasi gizi harian.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddForm(!showAddForm)}
                className="w-full sm:w-auto min-h-[44px] hud-clip-chamfer hud-hero-bg py-2 px-4 font-mono text-xs font-bold uppercase transition-all flex items-center justify-center gap-1.5 shadow-md hover:opacity-90 cursor-pointer text-black"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span>+ TAMBAH RUTINITAS MINGGUAN</span>
              </button>
            </div>

            {feedback && (
              <div
                className={`p-3 rounded font-mono text-xs flex items-center gap-2 ${
                  feedback.type === "success"
                    ? "bg-emerald-500/10 border border-emerald-500/40 text-emerald-400"
                    : "bg-red-500/10 border border-red-500/40 text-red-400"
                }`}
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span className="break-words">{feedback.msg}</span>
              </div>
            )}

            {/* Inline Add Modal Form for Weekly */}
            {showAddForm && (
              <div className="hud-card border rounded p-4 sm:p-5 relative shadow-xl min-w-0">
                <h3 className="font-display text-sm font-bold hud-hero-text uppercase mb-4 flex items-center gap-2">
                  <Zap className="w-4 h-4 shrink-0" />
                  <span>DAFTARKAN AKTIVITAS MINGGUAN BARU</span>
                </h3>
                <form onSubmit={handleAddWeekly} className="space-y-4 font-mono text-xs">
                  <div>
                    <label className="block hud-text-muted uppercase mb-1">Nama Aktivitas / Olahraga</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Leg day Gym, Futsal Mingguan, Renang, Jogging"
                      className="w-full px-3 py-2.5 rounded hud-card-inner border hud-border hud-text text-base sm:text-xs focus:outline-none focus:border-primary min-h-[44px]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block hud-text-muted uppercase mb-1">Frekuensi / Minggu</label>
                      <input
                        type="number"
                        min={1}
                        max={7}
                        required
                        value={freq}
                        onChange={(e) => setFreq(Number(e.target.value))}
                        className="w-full px-3 py-2.5 rounded hud-card-inner border hud-border hud-text text-base sm:text-xs focus:outline-none focus:border-primary min-h-[44px]"
                      />
                    </div>

                    <div>
                      <label className="block hud-text-muted uppercase mb-1">Durasi (Menit)</label>
                      <input
                        type="number"
                        min={5}
                        max={300}
                        step={5}
                        required
                        value={duration}
                        onChange={(e) => setDuration(Number(e.target.value))}
                        className="w-full px-3 py-2.5 rounded hud-card-inner border hud-border hud-text text-base sm:text-xs focus:outline-none focus:border-primary min-h-[44px]"
                      />
                    </div>

                    <div>
                      <label className="block hud-text-muted uppercase mb-1">Intensitas</label>
                      <select
                        value={intensity}
                        onChange={(e) => setIntensity(e.target.value as ActivityIntensity)}
                        className="w-full px-3 py-2.5 rounded hud-card-inner border hud-border hud-text text-base sm:text-xs focus:outline-none focus:border-primary min-h-[44px]"
                      >
                        <option value="low">Rendah (Low)</option>
                        <option value="moderate">Sedang (Moderate)</option>
                        <option value="high">Tinggi (High)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="min-h-[44px] px-4 py-2 rounded hud-card-inner border hud-border hud-text-muted hover:hud-text font-bold cursor-pointer"
                    >
                      BATAL
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="min-h-[44px] hud-hero-bg px-5 py-2 rounded font-bold uppercase hover:opacity-90 cursor-pointer disabled:opacity-50 text-black"
                    >
                      {loading ? "MENYIMPAN..." : "SIMPAN RUTINITAS"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Weekly Activities List */}
            <div className="space-y-3">
              {activities.length === 0 ? (
                <div className="p-8 text-center hud-card border rounded font-mono text-xs hud-text-muted">
                  Belum ada aktivitas mingguan yang dicatat. Klik &quot;+ TAMBAH RUTINITAS MINGGUAN&quot; di atas.
                </div>
              ) : (
                activities.map((act) => (
                  <div
                    key={act.id}
                    className="hud-card-inner border hud-border rounded p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-primary/50 transition-colors shadow min-w-0"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded hud-card-high border hud-border flex items-center justify-center hud-beam-text mt-0.5 shrink-0">
                        <Activity className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-display text-sm font-bold hud-text break-words">
                          {act.activity_name}
                        </h3>
                        <div className="flex items-center gap-2 sm:gap-3 font-mono text-[11px] hud-text-muted mt-1 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Repeat className="w-3.5 h-3.5 hud-hero-text shrink-0" />
                            {act.frequency_per_week}x / mgg
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 hud-sub-text shrink-0" />
                            {act.duration_minutes} mnt / sesi
                          </span>
                          <span>•</span>
                          <span
                            className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase ${
                              act.intensity === "high"
                                ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                : act.intensity === "moderate"
                                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            }`}
                          >
                            INTENSITAS: {act.intensity}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteWeekly(act.id)}
                      className="min-h-[44px] min-w-[44px] p-2 rounded hud-card-high border hud-border flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-colors shrink-0 self-end sm:self-center cursor-pointer"
                      title="Hapus Aktivitas Mingguan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* AI Context Explainer Banner */}
            <div className="p-4 hud-card border rounded font-mono text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 min-w-0">
              <div className="min-w-0">
                <span className="hud-hero-text font-bold block flex items-center gap-1.5">
                  <Flame className="w-4 h-4 shrink-0" />
                  <span>INTEGRASI KONTEKS AI GEMINI (SEKTOR 4)</span>
                </span>
                <p className="text-[11px] hud-text-muted mt-0.5 break-words">
                  Daftar rutinitas mingguan ini otomatis dikirim ke Gemini AI saat meracik rencana makan mingguan (misal meningkatkan alokasi protein saat Anda memiliki jadwal angkat beban intensif).
                </p>
              </div>
              <Link
                href="/program"
                className="w-full sm:w-auto min-h-[44px] hud-clip-chamfer hud-hero-bg px-4 py-2 text-xs font-bold uppercase transition-all flex items-center justify-center gap-1.5 shrink-0 hover:opacity-90 text-black"
              >
                <span>LANJUT KE STEP 4: PILIH PROGRAM</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

      </main>

      <TacticalFooter />
    </div>
  );
}

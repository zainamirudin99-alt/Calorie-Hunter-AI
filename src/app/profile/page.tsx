"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TacticalHeader } from "@/components/hud/header";
import { TacticalFooter } from "@/components/hud/footer";
import { TelemetryTicker } from "@/components/hud/telemetry-ticker";
import { useTacticalTheme } from "@/components/theme-provider";
import { calculateTDEE, PAL_MULTIPLIERS } from "@/lib/tdee/calculator";
import { ActivityLevel, Gender } from "@/types/database";
import { 
  User, 
  Scale, 
  Ruler, 
  Calendar, 
  Activity, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  Flame,
  Zap,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  Cpu,
  RefreshCw,
  AlertTriangle,
  ShieldAlert
} from "lucide-react";

const GEMINI_MODELS = [
  { id: "gemini-3.8-flash", label: "Gemini 3.8 Flash (Default)", badge: "RECOMMENDED" },
  { id: "gemini-3.7-flash", label: "Gemini 3.7 Flash", badge: "FAST" },
  { id: "gemini-3.6-flash", label: "Gemini 3.6 Flash", badge: "LEGACY" },
  { id: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro (Preview)", badge: "PREVIEW" },
];

export default function ProfilePage() {
  const router = useRouter();
  const { isUltraman } = useTacticalTheme();

  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState<Gender>("male");
  const [age, setAge] = useState<number>(25);
  const [heightCm, setHeightCm] = useState<number>(175);
  const [weightKg, setWeightKg] = useState<number>(70);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>("moderate");

  // AI Model & Health State
  const [selectedModel, setSelectedModel] = useState<string>("gemini-3.8-flash");
  const [aiHealth, setAiHealth] = useState<{
    checking: boolean;
    status: "online" | "rate_limited" | "error" | "no_key" | null;
    latency_ms?: number;
    message?: string;
  }>({
    checking: false,
    status: null,
  });

  // Activities section inside Onboarding
  const [activities, setActivities] = useState<Array<{
    id: string;
    activity_name: string;
    frequency_per_week: number;
    duration_minutes: number;
    intensity: "low" | "moderate" | "high";
    checked: boolean;
  }>>([
    { id: "act-1", activity_name: "Jogging Santai / Lari", frequency_per_week: 3, duration_minutes: 30, intensity: "moderate", checked: true },
    { id: "act-2", activity_name: "Angkat Beban / Gym", frequency_per_week: 4, duration_minutes: 60, intensity: "high", checked: true },
    { id: "act-3", activity_name: "Bersepeda", frequency_per_week: 2, duration_minutes: 45, intensity: "low", checked: false },
    { id: "act-4", activity_name: "Renang", frequency_per_week: 1, duration_minutes: 45, intensity: "moderate", checked: false },
  ]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newActName, setNewActName] = useState("");
  const [newActFreq, setNewActFreq] = useState(3);
  const [newActDuration, setNewActDuration] = useState(45);
  const [newActIntensity, setNewActIntensity] = useState<"low" | "moderate" | "high">("moderate");

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Helper to derive PAL activity level from checked activities
  const deriveActivityLevel = (acts: Array<{ checked: boolean; frequency_per_week: number; duration_minutes: number; intensity: string }>): ActivityLevel => {
    const activeList = acts.filter(a => a.checked);
    if (activeList.length === 0) return "sedentary";
    
    let totalScore = 0;
    for (const a of activeList) {
      const mult = a.intensity === "high" ? 2.0 : a.intensity === "moderate" ? 1.5 : 1.0;
      totalScore += (Number(a.frequency_per_week) || 0) * ((Number(a.duration_minutes) || 30) / 30) * mult;
    }

    if (totalScore < 4) return "light";
    if (totalScore < 9) return "moderate";
    if (totalScore < 14) return "active";
    return "very_active";
  };

  // Live calculated TDEE
  const tdeeResult = calculateTDEE({
    weight_kg: weightKg || 70,
    height_cm: heightCm || 175,
    age: age || 25,
    gender,
    activity_level: activityLevel,
  });

  const toggleActivity = (id: string) => {
    const updated = activities.map(a => a.id === id ? { ...a, checked: !a.checked } : a);
    setActivities(updated);
    const derived = deriveActivityLevel(updated);
    setActivityLevel(derived);
    try {
      const saved = JSON.parse(localStorage.getItem("chai_user_profile") || "{}");
      saved.activities = updated;
      saved.activity_level = derived;
      localStorage.setItem("chai_user_profile", JSON.stringify(saved));
    } catch {}
  };

  const handleAddCustomActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActName.trim()) return;
    const newAct = {
      id: "custom-" + Date.now(),
      activity_name: newActName.trim(),
      frequency_per_week: Number(newActFreq),
      duration_minutes: Number(newActDuration),
      intensity: newActIntensity,
      checked: true,
    };
    const updated = [...activities, newAct];
    setActivities(updated);
    const derived = deriveActivityLevel(updated);
    setActivityLevel(derived);
    setNewActName("");
    setShowAddForm(false);
    try {
      const saved = JSON.parse(localStorage.getItem("chai_user_profile") || "{}");
      saved.activities = updated;
      saved.activity_level = derived;
      localStorage.setItem("chai_user_profile", JSON.stringify(saved));
    } catch {}
  };

  const handleDeleteActivity = (id: string) => {
    const updated = activities.filter(a => a.id !== id);
    setActivities(updated);
    const derived = deriveActivityLevel(updated);
    setActivityLevel(derived);
    try {
      const saved = JSON.parse(localStorage.getItem("chai_user_profile") || "{}");
      saved.activities = updated;
      saved.activity_level = derived;
      localStorage.setItem("chai_user_profile", JSON.stringify(saved));
    } catch {}
  };

  // Load profile, activities & model on mount
  useEffect(() => {
    const savedModel = localStorage.getItem("chai_ai_model");
    if (savedModel && GEMINI_MODELS.some(m => m.id === savedModel)) {
      setSelectedModel(savedModel);
    }

    // 1. Restore from localStorage if available
    const savedProfile = localStorage.getItem("chai_user_profile");
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile);
        if (parsed.full_name) setFullName(parsed.full_name);
        if (parsed.gender) setGender(parsed.gender);
        if (parsed.age) setAge(Number(parsed.age));
        if (parsed.height_cm) setHeightCm(Number(parsed.height_cm));
        if (parsed.weight_kg) setWeightKg(Number(parsed.weight_kg));
        if (parsed.activity_level) setActivityLevel(parsed.activity_level);
        if (Array.isArray(parsed.activities) && parsed.activities.length > 0) {
          setActivities(parsed.activities);
        }
      } catch {}
    }

    // 2. Fetch server status and activities
    const syncServerData = async () => {
      const token = typeof window !== "undefined" ? localStorage.getItem("chai_auth_token") : null;
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      try {
        const [statusRes, actRes] = await Promise.all([
          fetch("/api/auth/status", { headers }),
          fetch("/api/activities", { headers }),
        ]);

        if (statusRes.ok) {
          const data = await statusRes.json();
          if (data.profile) {
            if (data.profile.full_name) setFullName(data.profile.full_name);
            if (data.profile.gender) setGender(data.profile.gender);
            if (data.profile.age) setAge(Number(data.profile.age));
            if (data.profile.height_cm) setHeightCm(Number(data.profile.height_cm));
            if (data.profile.weight_kg) setWeightKg(Number(data.profile.weight_kg));
            if (data.profile.activity_level) setActivityLevel(data.profile.activity_level);
          }
          if (data.preferred_gemini_model) {
            setSelectedModel(data.preferred_gemini_model);
          }
        }

        if (actRes.ok) {
          const actData = await actRes.json();
          if (Array.isArray(actData.activities) && actData.activities.length > 0) {
            const serverActs = actData.activities.map((a: any) => ({
              id: a.id || `act-${Math.random()}`,
              activity_name: a.activity_name,
              frequency_per_week: Number(a.frequency_per_week) || 3,
              duration_minutes: Number(a.duration_minutes) || 30,
              intensity: a.intensity || "moderate",
              checked: true,
            }));
            setActivities(prev => {
              const names = new Set(serverActs.map((s: any) => s.activity_name.toLowerCase()));
              const remaining = prev.filter(p => !names.has(p.activity_name.toLowerCase())).map(p => ({ ...p, checked: false }));
              return [...serverActs, ...remaining];
            });
          }
        }
      } catch {}
    };

    syncServerData();
  }, []);

  const handleModelChange = (newModel: string) => {
    setSelectedModel(newModel);
    localStorage.setItem("chai_ai_model", newModel);
    document.cookie = `chai_ai_model=${encodeURIComponent(newModel)}; path=/; max-age=31536000; SameSite=Lax`;
    checkAiHealth(newModel);
  };

  const checkAiHealth = async (modelToCheck?: string) => {
    const model = modelToCheck || selectedModel;
    setAiHealth({ checking: true, status: null });

    try {
      const res = await fetch(`/api/ai/health?model=${encodeURIComponent(model)}`);
      const data = await res.json();
      setAiHealth({
        checking: false,
        status: data.status,
        latency_ms: data.latency_ms,
        message: data.message,
      });
    } catch {
      setAiHealth({
        checking: false,
        status: "error",
        message: "Tidak dapat terhubung ke server AI Health Check.",
      });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    const checkedActivities = activities.filter(a => a.checked);

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("chai_auth_token") : null;
      const authHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      // 1. Save profile
      await fetch("/api/profile", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          full_name: fullName,
          gender,
          age: Number(age),
          height_cm: Number(heightCm),
          weight_kg: Number(weightKg),
          activity_level: activityLevel,
          preferred_gemini_model: selectedModel,
        }),
      });

      // 2. Save checked activities via batch POST
      await fetch("/api/activities", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ activities: checkedActivities }),
      });

      // 3. Persist locally with exact calculated TDEE & BMR
      localStorage.setItem("chai_user_profile", JSON.stringify({
        full_name: fullName,
        gender,
        age: Number(age),
        height_cm: Number(heightCm),
        weight_kg: Number(weightKg),
        activity_level: activityLevel,
        tdee: tdeeResult.tdee,
        bmr: tdeeResult.bmr,
        activities,
      }));

      setFeedback({ 
        type: "success", 
        msg: `Data diri & aktivitas tersimpan! TDEE: ${tdeeResult.tdee} kcal. Mengalihkan ke Hasil & Program...` 
      });

      setTimeout(() => {
        window.location.href = "/program";
      }, 700);
    } catch {
      // Local preview fallback
      localStorage.setItem("chai_user_profile", JSON.stringify({
        full_name: fullName,
        gender,
        age: Number(age),
        height_cm: Number(heightCm),
        weight_kg: Number(weightKg),
        activity_level: activityLevel,
        tdee: tdeeResult.tdee,
        bmr: tdeeResult.bmr,
        activities,
      }));

      setFeedback({
        type: "success",
        msg: `Data tersimpan secara lokal (TDEE: ${tdeeResult.tdee} kcal). Melanjutkan ke Program...`,
      });

      setTimeout(() => {
        window.location.href = "/program";
      }, 700);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between">
      <TacticalHeader activeTab="profile" />
      <TelemetryTicker />

      <main className="flex-1 w-full max-w-5xl mx-auto p-3 sm:p-4 md:p-6 pb-24 md:pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Profile Form (Cols 1-7) */}
          <div className="lg:col-span-7 hud-card border rounded-lg p-4 sm:p-6 relative shadow-xl theme-transition">
            <div className="flex items-center justify-between pb-3 sm:pb-4 mb-4 sm:mb-6 border-b hud-border">
              <div className="flex items-center gap-2 sm:gap-2.5">
                <User className="w-5 h-5 hud-hero-text shrink-0" />
                <div>
                  <h1 className="font-display text-sm sm:text-base font-bold hud-text uppercase">
                    DATA DIRI BIOMETRIK HUNTER
                  </h1>
                  <span className="font-mono text-[9px] sm:text-[10px] text-outline uppercase block">
                    {isUltraman ? "SCIENCE PATROL BIO-DATA" : "TITAN BIO-METRICS"}
                  </span>
                </div>
              </div>
              <span className="font-mono text-[10px] sm:text-xs px-2 py-0.5 rounded hud-card-inner border hud-border hud-beam-text font-bold">
                FASE 1: AKTIF
              </span>
            </div>

            {feedback && (
              <div className={`mb-5 p-3 rounded font-mono text-xs flex items-center gap-2 ${
                feedback.type === "success" 
                  ? "bg-emerald-500/10 border border-emerald-500/40 text-emerald-400"
                  : "bg-red-500/10 border border-red-500/40 text-red-400"
              }`}>
                {feedback.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{feedback.msg}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4 font-mono text-xs">
              <div>
                <label className="block hud-text-muted uppercase mb-1">Nama Lengkap Hunter</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Captain Hayata / Kenjiro"
                  className="w-full px-3 py-2 rounded hud-card-inner border hud-border hud-text focus:outline-none focus:border-primary text-xs"
                />
              </div>

              {/* Gender Selection */}
              <div>
                <label className="block hud-text-muted uppercase mb-1.5">Jenis Kelamin</label>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setGender("male")}
                    className={`py-2 px-2 sm:px-3 rounded border text-center font-bold uppercase transition-all text-xs ${
                      gender === "male" 
                        ? "hud-hero-bg border-transparent shadow" 
                        : "hud-card-inner hud-border hud-text-muted hover:hud-text"
                    }`}
                  >
                    PRIA (MALE)
                  </button>
                  <button
                    type="button"
                    onClick={() => setGender("female")}
                    className={`py-2 px-2 sm:px-3 rounded border text-center font-bold uppercase transition-all text-xs ${
                      gender === "female" 
                        ? "hud-hero-bg border-transparent shadow" 
                        : "hud-card-inner hud-border hud-text-muted hover:hud-text"
                    }`}
                  >
                    WANITA (FEMALE)
                  </button>
                </div>
              </div>

              {/* Biometrics Grid */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div>
                  <label className="block hud-text-muted uppercase mb-1 text-[11px] truncate">Usia (Thn)</label>
                  <input
                    type="number"
                    min={10}
                    max={100}
                    required
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    className="w-full px-2 sm:px-3 py-2 rounded hud-card-inner border hud-border hud-text focus:outline-none focus:border-primary text-xs"
                  />
                </div>

                <div>
                  <label className="block hud-text-muted uppercase mb-1 text-[11px] truncate">Tinggi (cm)</label>
                  <input
                    type="number"
                    min={50}
                    max={250}
                    required
                    value={heightCm}
                    onChange={(e) => setHeightCm(Number(e.target.value))}
                    className="w-full px-2 sm:px-3 py-2 rounded hud-card-inner border hud-border hud-text focus:outline-none focus:border-primary text-xs"
                  />
                </div>

                <div>
                  <label className="block hud-text-muted uppercase mb-1 text-[11px] truncate">Berat (kg)</label>
                  <input
                    type="number"
                    min={20}
                    max={300}
                    step="0.1"
                    required
                    value={weightKg}
                    onChange={(e) => setWeightKg(Number(e.target.value))}
                    className="w-full px-2 sm:px-3 py-2 rounded hud-card-inner border hud-border hud-text focus:outline-none focus:border-primary text-xs"
                  />
                </div>
              </div>

              {/* Activity Level (PAL) */}
              <div>
                <label className="block hud-text-muted uppercase mb-1.5">
                  Aktivitas Fisik Mingguan (Pengali Dasar PAL)
                </label>
                <div className="space-y-1.5">
                  {[
                    { id: "sedentary", title: "Sedentary (1.2x)", desc: "Sedikit atau tanpa olahraga rutin" },
                    { id: "light", title: "Ringan (1.375x)", desc: "Olahraga ringan 1-3 hari/minggu" },
                    { id: "moderate", title: "Sedang (1.55x)", desc: "Olahraga moderat 3-5 hari/minggu" },
                    { id: "active", title: "Aktif (1.725x)", desc: "Latihan intens 6-7 hari/minggu" },
                    { id: "very_active", title: "Sangat Aktif (1.9x)", desc: "Latihan keras atletik / pekerjaan fisik berat" },
                  ].map((item) => (
                    <label
                      key={item.id}
                      onClick={() => setActivityLevel(item.id as ActivityLevel)}
                      className={`flex items-center justify-between p-2.5 rounded border cursor-pointer transition-all ${
                        activityLevel === item.id
                          ? "hud-card-high border-primary hud-text"
                          : "hud-card-inner hud-border hud-text-muted hover:border-primary/50"
                      }`}
                    >
                      <div>
                        <span className="font-bold block">{item.title}</span>
                        <span className="text-[10px] text-outline block">{item.desc}</span>
                      </div>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        activityLevel === item.id ? "border-primary hud-hero-bg" : "hud-border"
                      }`}>
                        {activityLevel === item.id && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Bagian Aktivitas Mingguan (Onboarding) */}
              <div className="pt-4 border-t hud-border">
                <div className="flex items-center justify-between mb-2">
                  <label className="block hud-text font-bold uppercase text-xs">
                    Jadwal Aktivitas Mingguan Hunter
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="px-2.5 py-1 rounded hud-card-high border hud-border text-primary font-mono text-[11px] font-bold flex items-center gap-1 hover:bg-primary/10 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Tambah Aktivitas</span>
                  </button>
                </div>
                <p className="text-[10px] text-outline mb-3">
                  Centang aktivitas olahraga rutin Anda atau tambahkan kegiatan kustom untuk konteks kalkulasi AI:
                </p>

                {/* Inline Add Custom Activity Form */}
                {showAddForm && (
                  <div className="mb-4 p-3 rounded hud-card-inner border hud-border space-y-3 bg-primary/5">
                    <div className="font-bold text-[11px] hud-hero-text">INPUT AKTIVITAS BARU:</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] text-outline block mb-1">Nama Aktivitas:</span>
                        <input
                          type="text"
                          value={newActName}
                          onChange={(e) => setNewActName(e.target.value)}
                          placeholder="e.g. Futsal, Muay Thai, Pilates"
                          className="w-full px-2.5 py-1.5 rounded hud-card border hud-border text-xs hud-text focus:outline-none focus:border-primary"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-outline block mb-1">Intensitas:</span>
                        <select
                          value={newActIntensity}
                          onChange={(e) => setNewActIntensity(e.target.value as any)}
                          className="w-full px-2.5 py-1.5 rounded hud-card border hud-border text-xs hud-text focus:outline-none focus:border-primary"
                        >
                          <option value="low">Ringan (Low)</option>
                          <option value="moderate">Sedang (Moderate)</option>
                          <option value="high">Tinggi (High)</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] text-outline block mb-1">Frekuensi / Minggu:</span>
                        <input
                          type="number"
                          min={1}
                          max={7}
                          value={newActFreq}
                          onChange={(e) => setNewActFreq(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 rounded hud-card border hud-border text-xs hud-text focus:outline-none focus:border-primary"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-outline block mb-1">Durasi (Menit):</span>
                        <input
                          type="number"
                          min={10}
                          max={240}
                          value={newActDuration}
                          onChange={(e) => setNewActDuration(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 rounded hud-card border hud-border text-xs hud-text focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowAddForm(false)}
                        className="px-3 py-1 rounded hud-card text-[11px] hud-text-muted"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={handleAddCustomActivity}
                        className="px-3 py-1 rounded hud-hero-bg text-[11px] font-bold text-black dark:text-black"
                      >
                        Simpan Aktivitas
                      </button>
                    </div>
                  </div>
                )}

                {/* Checked activities list */}
                <div className="space-y-1.5">
                  {activities.map((act) => (
                    <div
                      key={act.id}
                      className={`flex items-center justify-between p-2 rounded border transition-all ${
                        act.checked
                          ? "hud-card-high border-primary/50 hud-text"
                          : "hud-card-inner hud-border text-outline"
                      }`}
                    >
                      <div 
                        onClick={() => toggleActivity(act.id)}
                        className="flex items-center gap-2.5 flex-1 cursor-pointer"
                      >
                        {act.checked ? (
                          <CheckSquare className="w-4 h-4 text-primary shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-outline shrink-0" />
                        )}
                        <div>
                          <span className={`font-bold block ${act.checked ? "hud-text" : "line-through text-outline"}`}>
                            {act.activity_name}
                          </span>
                          <span className="text-[10px] text-outline block">
                            {act.frequency_per_week}x/minggu • {act.duration_minutes} mnt • Intensitas: {act.intensity}
                          </span>
                        </div>
                      </div>

                      {act.id.startsWith("custom-") && (
                        <button
                          type="button"
                          onClick={() => handleDeleteActivity(act.id)}
                          className="text-red-400 hover:text-red-300 p-1"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full hud-clip-chamfer hud-hero-bg py-3.5 px-4 font-mono text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 shadow-xl hover:opacity-90 disabled:opacity-50 mt-5 cursor-pointer"
              >
                {loading ? (
                  <span>MENGHITUNG TDEE METABOLISME...</span>
                ) : (
                  <>
                    <span>HITUNG TDEE SAYA</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Real-time TDEE Telemetry Card (Cols 8-12) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="hud-card border rounded p-5 relative shadow-lg theme-transition">
              <div className="flex items-center justify-between border-b hud-border pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 hud-hero-text" />
                  <h2 className="font-display text-sm font-bold hud-text uppercase">
                    RADAR KALKULASI TDEE
                  </h2>
                </div>
                <span className="font-mono text-[10px] hud-beam-text border hud-border px-1.5 py-0.5 rounded hud-card-inner font-bold">
                  MIFFLIN-ST JEOR
                </span>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="p-3 hud-card-inner rounded border hud-border flex items-center justify-between">
                  <span className="hud-text-muted">BMR INTI (Basal):</span>
                  <span className="hud-text font-bold text-sm">{tdeeResult.bmr} kcal/hari</span>
                </div>

                <div className="p-3 hud-card-inner rounded border hud-border flex items-center justify-between">
                  <span className="hud-text-muted">FAKTOR PAL:</span>
                  <span className="hud-sub-text font-bold">{tdeeResult.pal_factor}x</span>
                </div>

                <div className="p-4 hud-card-high rounded border hud-border text-center">
                  <span className="text-[11px] hud-text-muted block uppercase mb-1">
                    TOTAL ESTIMASI TDEE HARIAN
                  </span>
                  <span className="font-display text-3xl font-bold hud-hero-text">
                    {tdeeResult.tdee}
                  </span>
                  <span className="font-mono text-xs text-outline block">KCAL / HARI</span>
                </div>
              </div>

              {/* Target Splits Preview */}
              <div className="mt-4 pt-3 border-t hud-border space-y-2 font-mono text-[11px]">
                <span className="text-outline uppercase block text-[10px]">PREVIEW PROGRAM TARGET:</span>
                <div className="flex justify-between p-2 rounded hud-card-inner border hud-border">
                  <span className="hud-text-muted">Cutting (-20%):</span>
                  <span className="hud-hero-text font-bold">{tdeeResult.targets.cutting} kcal</span>
                </div>
                <div className="flex justify-between p-2 rounded hud-card-inner border hud-border">
                  <span className="hud-text-muted">Maintenance (0%):</span>
                  <span className="hud-beam-text font-bold">{tdeeResult.targets.maintenance} kcal</span>
                </div>
                <div className="flex justify-between p-2 rounded hud-card-inner border hud-border">
                  <span className="hud-text-muted">Bulking (+15%):</span>
                  <span className="hud-sub-text font-bold">{tdeeResult.targets.bulking} kcal</span>
                </div>
              </div>

              <div className="mt-4 pt-2 text-[10px] text-outline font-mono">
                * Formula deterministik sesuai ADR-2. Bebas halusinasi aritmatika AI.
              </div>
            </div>

            {/* Quick Link to Custom Activities */}
            <div className="hud-card border rounded p-4 font-mono text-xs flex items-center justify-between">
              <div>
                <span className="hud-text font-bold block">Aktivitas Kustom</span>
                <span className="text-[10px] text-outline block">Tambah hobi & latihan spesifik</span>
              </div>
              <Link
                href="/activities"
                className="px-3 py-1.5 rounded hud-card-inner border hud-border hud-beam-text hover:border-primary transition-colors font-bold"
              >
                + ATUR AKTIVITAS
              </Link>
            </div>

            {/* AI Engine & Live Diagnostics Card (Requirement 7: Cek AI) */}
            <div className="hud-card border rounded p-5 relative shadow-lg theme-transition space-y-3">
              <div className="flex items-center justify-between border-b hud-border pb-3">
                <div className="flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-amber-400" />
                  <h2 className="font-display text-sm font-bold hud-text uppercase">
                    ENGINE AI & CEK KESIAPAN
                  </h2>
                </div>
                <span className="font-mono text-[9px] px-1.5 py-0.5 rounded hud-card-inner border hud-border hud-beam-text font-bold">
                  GEMINI 3
                </span>
              </div>

              <p className="font-mono text-xs text-outline leading-relaxed">
                Pilih model kecerdasan buatan yang digunakan untuk pemindaian nutrisi dan perancangan menu makan, serta periksa ketersediaan layanannya secara live.
              </p>

              {/* Model Select */}
              <div className="space-y-1.5 font-mono text-xs">
                <label className="text-outline uppercase text-[10px] block">Model Aktif:</label>
                <select
                  value={selectedModel}
                  onChange={(e) => handleModelChange(e.target.value)}
                  className="w-full px-3 py-2 rounded hud-card-inner border hud-border font-mono text-xs hud-text focus:outline-none focus:border-primary cursor-pointer"
                >
                  {GEMINI_MODELS.map((m) => (
                    <option key={m.id} value={m.id} className="bg-slate-900 text-white">
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cek AI Button */}
              <button
                type="button"
                onClick={() => checkAiHealth()}
                disabled={aiHealth.checking}
                className="w-full py-2 px-3 rounded hud-card-high border border-primary/50 hover:border-primary font-mono text-xs hud-hero-text font-bold uppercase transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${aiHealth.checking ? "animate-spin" : ""}`} />
                <span>{aiHealth.checking ? "MENGECEK RESPONS AI..." : "CEK STATUS KONEKSI AI"}</span>
              </button>

              {/* Health Result */}
              {aiHealth.status && (
                <div className={`p-3 rounded font-mono text-xs space-y-1.5 transition-all ${
                  aiHealth.status === "online"
                    ? "bg-emerald-500/10 border border-emerald-500/40 text-emerald-300"
                    : aiHealth.status === "rate_limited"
                    ? "bg-amber-500/10 border border-amber-500/40 text-amber-300"
                    : "bg-red-500/10 border border-red-500/40 text-red-300"
                }`}>
                  <div className="flex items-center justify-between font-bold">
                    <div className="flex items-center gap-2">
                      {aiHealth.status === "online" && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                      {aiHealth.status === "rate_limited" && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                      {aiHealth.status === "error" && <AlertCircle className="w-4 h-4 text-red-400" />}
                      {aiHealth.status === "no_key" && <ShieldAlert className="w-4 h-4 text-amber-400" />}
                      <span>
                        {aiHealth.status === "online" && "AI AKTIF & SIAP DIGUNAKAN"}
                        {aiHealth.status === "rate_limited" && "BATAS KUOTA AI TERCAPAI"}
                        {aiHealth.status === "error" && "AI TIDAK DAPAT DIAKSES"}
                        {aiHealth.status === "no_key" && "GEMINI_API_KEY TIDAK TERDETEKSI"}
                      </span>
                    </div>
                    {aiHealth.latency_ms !== undefined && (
                      <span className="text-[10px] font-mono opacity-80">{aiHealth.latency_ms}ms</span>
                    )}
                  </div>
                  {aiHealth.message && (
                    <p className="text-[11px] opacity-90 leading-tight">{aiHealth.message}</p>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </main>

      <TacticalFooter />
    </div>
  );
}

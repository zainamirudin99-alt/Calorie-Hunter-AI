"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TacticalHeader } from "@/components/hud/header";
import { TacticalFooter } from "@/components/hud/footer";
import { TelemetryTicker } from "@/components/hud/telemetry-ticker";
import { CampaignStepper } from "@/components/hud/campaign-stepper";
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
  Square
} from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const { isUltraman } = useTacticalTheme();

  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState<Gender>("male");
  const [age, setAge] = useState<number>(25);
  const [heightCm, setHeightCm] = useState<number>(175);
  const [weightKg, setWeightKg] = useState<number>(70);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>("moderate");

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

  // Live calculated TDEE
  const tdeeResult = calculateTDEE({
    weight_kg: weightKg || 70,
    height_cm: heightCm || 175,
    age: age || 25,
    gender,
    activity_level: activityLevel,
  });

  const toggleActivity = (id: string) => {
    setActivities(activities.map(a => a.id === id ? { ...a, checked: !a.checked } : a));
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
    setActivities([...activities, newAct]);
    setNewActName("");
    setShowAddForm(false);
  };

  const handleDeleteActivity = (id: string) => {
    setActivities(activities.filter(a => a.id !== id));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    const checkedActivities = activities.filter(a => a.checked);

    try {
      const token = localStorage.getItem("chai_auth_token");
      
      // Save profile
      await fetch("/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          full_name: fullName,
          gender,
          age: Number(age),
          height_cm: Number(heightCm),
          weight_kg: Number(weightKg),
          activity_level: activityLevel,
        }),
      });

      // Save checked activities
      for (const act of checkedActivities) {
        try {
          await fetch("/api/activities", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              activity_name: act.activity_name,
              frequency_per_week: act.frequency_per_week,
              duration_minutes: act.duration_minutes,
              intensity: act.intensity,
            }),
          });
        } catch {}
      }

      // Persist locally for immediate calculation & next screens
      localStorage.setItem("chai_user_profile", JSON.stringify({
        full_name: fullName,
        gender,
        age: Number(age),
        height_cm: Number(heightCm),
        weight_kg: Number(weightKg),
        activity_level: activityLevel,
        tdee: tdeeResult.tdee,
        bmr: tdeeResult.bmr,
        activities: checkedActivities,
      }));

      setFeedback({ 
        type: "success", 
        msg: "Data diri & aktivitas tersimpan! Mengalihkan ke Hasil TDEE & Pilihan Program..." 
      });

      setTimeout(() => {
        router.push("/program");
      }, 800);
    } catch (err: any) {
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
        activities: checkedActivities,
      }));

      setFeedback({
        type: "success",
        msg: "Data tersimpan secara lokal. Melanjutkan ke Hasil TDEE & Program...",
      });

      setTimeout(() => {
        router.push("/program");
      }, 800);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between">
      <TacticalHeader activeTab="profile" />
      <CampaignStepper />
      <TelemetryTicker />

      <main className="flex-1 w-full max-w-5xl mx-auto p-4 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Profile Form (Cols 1-7) */}
          <div className="lg:col-span-7 hud-card border rounded p-6 relative shadow-xl theme-transition">
            <div className="flex items-center justify-between pb-4 mb-6 border-b hud-border">
              <div className="flex items-center gap-2.5">
                <User className="w-5 h-5 hud-hero-text" />
                <div>
                  <h1 className="font-display text-base font-bold hud-text uppercase">
                    DATA DIRI BIOMETRIK HUNTER
                  </h1>
                  <span className="font-mono text-[10px] text-outline uppercase block">
                    {isUltraman ? "SCIENCE PATROL BIO-DATA" : "TITAN BIO-METRICS"}
                  </span>
                </div>
              </div>
              <span className="font-mono text-xs px-2 py-0.5 rounded hud-card-inner border hud-border hud-beam-text font-bold">
                FASE 1: AKTIF
              </span>
            </div>

            {feedback && (
              <div className={`mb-5 p-3 rounded font-mono text-xs flex items-center gap-2 ${
                feedback.type === "success" 
                  ? "bg-emerald-500/10 border border-emerald-500/40 text-emerald-400"
                  : "bg-red-500/10 border border-red-500/40 text-red-400"
              }`}>
                {feedback.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
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
                  className="w-full px-3 py-2 rounded hud-card-inner border hud-border hud-text focus:outline-none focus:border-primary"
                />
              </div>

              {/* Gender Selection */}
              <div>
                <label className="block hud-text-muted uppercase mb-1.5">Jenis Kelamin</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setGender("male")}
                    className={`py-2 px-3 rounded border text-center font-bold uppercase transition-all ${
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
                    className={`py-2 px-3 rounded border text-center font-bold uppercase transition-all ${
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
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block hud-text-muted uppercase mb-1">Usia (Thn)</label>
                  <input
                    type="number"
                    min={10}
                    max={100}
                    required
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded hud-card-inner border hud-border hud-text focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block hud-text-muted uppercase mb-1">Tinggi (cm)</label>
                  <input
                    type="number"
                    min={50}
                    max={250}
                    required
                    value={heightCm}
                    onChange={(e) => setHeightCm(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded hud-card-inner border hud-border hud-text focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block hud-text-muted uppercase mb-1">Berat (kg)</label>
                  <input
                    type="number"
                    min={20}
                    max={300}
                    step="0.1"
                    required
                    value={weightKg}
                    onChange={(e) => setWeightKg(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded hud-card-inner border hud-border hud-text focus:outline-none focus:border-primary"
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
          </div>

        </div>
      </main>

      <TacticalFooter />
    </div>
  );
}

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
  Zap
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    try {
      const token = localStorage.getItem("chai_auth_token");
      const res = await fetch("/api/profile", {
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

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menyimpan profil");
      }

      setFeedback({ type: "success", msg: "Data profil berhasil disinkronkan ke Core Engine!" });
      setTimeout(() => {
        router.push("/program");
      }, 1200);
    } catch (err: any) {
      // In local preview without live Supabase session, save to localStorage fallback so user is never blocked
      localStorage.setItem("chai_user_profile", JSON.stringify({
        full_name: fullName,
        gender,
        age: Number(age),
        height_cm: Number(heightCm),
        weight_kg: Number(weightKg),
        activity_level: activityLevel,
        tdee: tdeeResult.tdee,
      }));

      setFeedback({
        type: "success",
        msg: "Data profil disimpan secara lokal (Tactical Offline Mode). Siap untuk pemilihan program!",
      });

      setTimeout(() => {
        router.push("/program");
      }, 1200);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between">
      <TacticalHeader activeTab="profile" />
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

              <button
                type="submit"
                disabled={loading}
                className="w-full hud-clip-chamfer hud-hero-bg py-3 px-4 font-mono text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 shadow-lg hover:opacity-90 disabled:opacity-50 mt-4 cursor-pointer"
              >
                {loading ? (
                  <span>MENYIMPAN BIOMETRIK...</span>
                ) : (
                  <>
                    <span>SIMPAN & LANJUT PILIH PROGRAM</span>
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

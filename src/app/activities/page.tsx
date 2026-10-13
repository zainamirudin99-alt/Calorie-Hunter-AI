"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { TacticalHeader } from "@/components/hud/header";
import { TacticalFooter } from "@/components/hud/footer";
import { TelemetryTicker } from "@/components/hud/telemetry-ticker";
import { useTacticalTheme } from "@/components/theme-provider";
import { WeeklyActivity, ActivityIntensity } from "@/types/database";
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
  RefreshCw
} from "lucide-react";

export default function ActivitiesPage() {
  const { isUltraman } = useTacticalTheme();

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

  // Reusable sync activities from API
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
            msg: "Daftar aktivitas berhasil disinkronkan dari Cloud!",
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

  useEffect(() => {
    fetchActivities(true);

    const handleGlobalSync = () => {
      fetchActivities(false);
    };

    window.addEventListener("chai_trigger_cloud_sync", handleGlobalSync);
    return () => {
      window.removeEventListener("chai_trigger_cloud_sync", handleGlobalSync);
    };
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
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
      setFeedback({ type: "success", msg: "Aktivitas tempur baru berhasil didaftarkan!" });
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

  const handleDelete = async (id: string) => {
    setActivities(activities.filter((a) => a.id !== id));
    try {
      await fetch(`/api/activities?id=${id}`, {
        method: "DELETE",
      });
    } catch {
      // Ignored in offline fallback
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between">
      <TacticalHeader activeTab="activities" />
      <TelemetryTicker />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 min-w-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 mb-6 border-b hud-border min-w-0">
          <div className="flex items-center gap-3 min-w-0 w-full max-w-full">
            <div className="w-10 h-10 rounded hud-card-high border hud-border flex items-center justify-center hud-hero-text shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-base sm:text-lg font-bold hud-text uppercase truncate">
                LOG AKTIVITAS & HOBI MINGGUAN
              </h1>
              <span className="font-mono text-[10px] text-outline uppercase block truncate">
                {isUltraman ? "SCIENCE PATROL COMBAT SCHEDULE" : "TITAN TRAINING DECK"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => fetchActivities(false)}
              disabled={isActSyncing}
              className="flex-1 sm:flex-none min-h-[44px] py-2 px-3 rounded hud-card-inner border hud-border hover:border-primary font-mono text-xs font-bold uppercase transition-all flex items-center justify-center gap-1.5 text-slate-300 hover:text-white disabled:opacity-50 cursor-pointer shadow-sm"
              title="Sinkronkan aktivitas tersimpan dari database Cloud"
            >
              <RefreshCw className={`w-4 h-4 shrink-0 ${isActSyncing ? "animate-spin text-primary" : "text-cyan-400"}`} />
              <span>{isActSyncing ? "MENYINKRONKAN..." : "SINKRONKAN CLOUD"}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex-1 sm:flex-none min-h-[44px] hud-clip-chamfer hud-hero-bg py-2 px-4 font-mono text-xs font-bold uppercase transition-all flex items-center justify-center gap-1.5 shadow-md hover:opacity-90 cursor-pointer"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>+ TAMBAH AKTIVITAS</span>
            </button>
          </div>
        </div>

        {feedback && (
          <div className={`mb-5 p-3 rounded font-mono text-xs flex items-center gap-2 ${
            feedback.type === "success" 
              ? "bg-emerald-500/10 border border-emerald-500/40 text-emerald-400"
              : "bg-red-500/10 border border-red-500/40 text-red-400"
          }`}>
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="break-words">{feedback.msg}</span>
          </div>
        )}

        {/* Inline Add Modal Form */}
        {showAddForm && (
          <div className="mb-6 hud-card border rounded p-4 sm:p-5 relative shadow-xl animate-in fade-in-50 duration-200 min-w-0">
            <h2 className="font-display text-sm font-bold hud-hero-text uppercase mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 shrink-0" />
              <span>DAFTARKAN AKTIVITAS KUSTOM BARU</span>
            </h2>
            <form onSubmit={handleAdd} className="space-y-4 font-mono text-xs">
              <div>
                <label className="block hud-text-muted uppercase mb-1">Nama Aktivitas / Olahraga</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Renang, Futsal, Muay Thai, Angkat Beban"
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
                  className="min-h-[44px] hud-hero-bg px-5 py-2 rounded font-bold uppercase hover:opacity-90 cursor-pointer disabled:opacity-50"
                >
                  {loading ? "MENYIMPAN..." : "SIMPAN AKTIVITAS"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Activities List */}
        <div className="space-y-3">
          {activities.length === 0 ? (
            <div className="p-8 text-center hud-card border rounded font-mono text-xs hud-text-muted">
              Belum ada aktivitas khusus yang dicatat. Klik "+ TAMBAH AKTIVITAS" di atas.
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
                    <h3 className="font-display text-sm font-bold hud-text break-words">{act.activity_name}</h3>
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
                      <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase ${
                        act.intensity === "high" 
                          ? "bg-red-500/20 text-red-400 border border-red-500/30" 
                          : act.intensity === "moderate" 
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" 
                          : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      }`}>
                        INTENSITAS: {act.intensity}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(act.id)}
                  className="min-h-[44px] min-w-[44px] p-2 rounded hud-card-high border hud-border flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-colors shrink-0 self-end sm:self-center cursor-pointer"
                  title="Hapus Aktivitas"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* AI Context Explainer Banner */}
        <div className="mt-8 p-4 hud-card border rounded font-mono text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 min-w-0">
          <div className="min-w-0">
            <span className="hud-hero-text font-bold block flex items-center gap-1.5">
              <Flame className="w-4 h-4 shrink-0" />
              <span>INTEGRASI KONTEKS AI GEMINI (SEKTOR 4)</span>
            </span>
            <p className="text-[11px] hud-text-muted mt-0.5 break-words">
              Daftar aktivitas ini otomatis dikirim ke Gemini AI saat meracik rencana makan mingguan (misal meningkatkan alokasi protein saat Anda memiliki jadwal angkat beban intensif).
            </p>
          </div>
          <Link
            href="/program"
            className="w-full sm:w-auto min-h-[44px] hud-clip-chamfer hud-hero-bg px-4 py-2 text-xs font-bold uppercase transition-all flex items-center justify-center gap-1.5 shrink-0 hover:opacity-90"
          >
            <span>LANJUT KE STEP 4: PILIH PROGRAM</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>

      <TacticalFooter />
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, Scale, ArrowRight, X, Sparkles } from "lucide-react";

interface LockoutGateProps {
  isExpired: boolean;
  onUnlocked?: () => void;
}

export function LockoutGate({ isExpired, onUnlocked }: LockoutGateProps) {
  const router = useRouter();
  const [isDismissed, setIsDismissed] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newWeight, setNewWeight] = useState<number>(75);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem("chai_lockout_banner_dismissed");
    if (dismissed === "true") {
      setIsDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem("chai_lockout_banner_dismissed", "true");
  };

  const handleUpdateWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await fetch("/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          weight_kg: Number(newWeight),
          gender: "male",
          age: 25,
          height_cm: 175,
          activity_level: "moderate",
        }),
      });

      setShowModal(false);
      handleDismiss();
      if (onUnlocked) onUnlocked();
      router.push("/program");
    } catch {
      setShowModal(false);
      handleDismiss();
      router.push("/program");
    } finally {
      setLoading(false);
    }
  };

  if (!isExpired || isDismissed) return null;

  return (
    <>
      {/* Non-blocking Sleek HUD Warning Banner */}
      <div className="w-full bg-gradient-to-r from-amber-500/20 via-red-500/20 to-amber-500/20 border-b-2 border-amber-500/50 p-3 sm:px-6 shadow-xl backdrop-blur-md sticky top-0 z-40 animate-in fade-in duration-300">
        <div className="max-w-[1920px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono text-xs">
          <div className="flex items-center gap-2.5 text-amber-300">
            <ShieldAlert className="w-5 h-5 shrink-0 text-amber-400 animate-pulse" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold uppercase tracking-wider text-[11px] text-amber-400">
                  [PERINGATAN: SIKLUS 180 HARI TERCAPAI]
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 border border-amber-500/40 text-amber-200">
                  NON-BLOCKING
                </span>
              </div>
              <p className="text-[11px] text-slate-200 mt-0.5">
                Siklus program 6 bulan Anda telah genap. Timbang berat badan terbaru untuk mengkalibrasi ulang ketepatan TDEE & metabolisme Anda.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="px-3 py-1.5 rounded hud-hero-bg font-bold text-[11px] uppercase tracking-wider text-black dark:text-black flex items-center gap-1.5 shadow-md hover:opacity-90 transition-all cursor-pointer"
            >
              <Scale className="w-3.5 h-3.5" />
              <span>TIMBANG ULANG SEKARANG</span>
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              className="px-2.5 py-1.5 rounded hud-card-inner border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white text-[11px] transition-all cursor-pointer flex items-center gap-1"
              title="Abaikan pengingat ini untuk sesi ini"
            >
              <X className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Nanti</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal Timbang Ulang (Triggered by button, does NOT lock screen automatically) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md hud-card border-2 border-primary rounded p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between border-b hud-border pb-2">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 hud-hero-text" />
                <span className="font-display text-sm font-bold hud-hero-text uppercase">
                  KALIBRASI BERAT BADAN BARU
                </span>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-outline hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="font-mono text-xs text-outline leading-relaxed">
              Masukkan berat badan Anda saat ini. Sistem akan menghitung ulang BMR & TDEE terbaru sebelum Anda memilih target program berikutnya.
            </p>

            <form onSubmit={handleUpdateWeight} className="space-y-4 font-mono text-xs">
              <div className="p-4 rounded hud-card-inner border hud-border text-center space-y-2">
                <label className="block text-outline uppercase font-bold text-[11px]">
                  BERAT BADAN SAAT INI (KG):
                </label>
                <div className="flex items-center justify-center gap-3">
                  <input
                    type="number"
                    step="0.1"
                    min={20}
                    max={300}
                    required
                    value={newWeight}
                    onChange={(e) => setNewWeight(Number(e.target.value))}
                    className="w-28 px-3 py-2 text-center text-lg font-bold rounded hud-card-high border hud-border hud-hero-text focus:outline-none focus:border-primary"
                  />
                  <span className="font-bold hud-text text-sm">KG</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t hud-border">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded hud-card border hud-border text-slate-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded hud-hero-bg font-bold text-black dark:text-black flex items-center gap-1.5 shadow-lg disabled:opacity-50"
                >
                  {loading ? (
                    <span>MENYIMPAN...</span>
                  ) : (
                    <>
                      <span>SIMPAN & PILIH PROGRAM</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

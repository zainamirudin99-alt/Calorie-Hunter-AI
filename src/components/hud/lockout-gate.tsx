"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldAlert, Scale, ArrowRight, CheckCircle2 } from "lucide-react";

interface LockoutGateProps {
  isExpired: boolean;
  onUnlocked?: () => void;
}

export function LockoutGate({ isExpired, onUnlocked }: LockoutGateProps) {
  const router = useRouter();
  const [newWeight, setNewWeight] = useState<number>(75);
  const [loading, setLoading] = useState(false);

  if (!isExpired) return null;

  const handleUpdateWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem("chai_auth_token");
      await fetch("/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          weight_kg: Number(newWeight),
          gender: "male",
          age: 25,
          height_cm: 175,
          activity_level: "moderate",
        }),
      });
      router.push("/program");
    } catch {
      router.push("/program");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg hud-card border-2 border-red-500 rounded p-6 sm:p-8 relative shadow-2xl text-center space-y-4 crt-scanlines">
        <div className="w-14 h-14 mx-auto rounded-full bg-red-500/20 border border-red-500 flex items-center justify-center text-red-500 animate-pulse">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div>
          <span className="font-mono text-xs text-red-400 uppercase tracking-widest font-bold block">
            [INTERLOCK SISTEM: PROTOKOL 180 HARI BERAKHIR]
          </span>
          <h2 className="font-display text-xl font-bold hud-text mt-1 uppercase">
            EVALUASI BERAT BADAN WAJIB
          </h2>
        </div>

        <p className="font-mono text-xs hud-text-muted leading-relaxed">
          Sesuai standar metabolik ADR-5, program 6 bulan Anda telah selesai. Akses Tracking Kalori dikunci hingga Anda memperbarui data berat badan terbaru dan memilih program baru.
        </p>

        <form onSubmit={handleUpdateWeight} className="p-4 rounded hud-card-inner border hud-border space-y-3 font-mono text-xs">
          <label className="block hud-text font-bold uppercase">
            Input Berat Badan Terbaru Anda (kg):
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
              className="w-32 px-3 py-2 text-center text-base font-bold rounded hud-card-high border hud-border hud-hero-text focus:outline-none focus:border-primary"
            />
            <span className="font-bold hud-text">KG</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full hud-clip-chamfer hud-hero-bg py-2.5 px-4 font-mono text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 shadow-lg hover:opacity-90 disabled:opacity-50 cursor-pointer mt-3"
          >
            <span>SIMPAN BB & PILIH PROGRAM BARU</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

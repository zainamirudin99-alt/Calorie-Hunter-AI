"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTacticalTheme } from "@/components/theme-provider";
import { TacticalHeader } from "@/components/hud/header";
import { TacticalFooter } from "@/components/hud/footer";
import { Shield, Swords, Lock, User, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";

export default function AuthPage() {
  const router = useRouter();
  const { isUltraman } = useTacticalTheme();
  const [mode, setMode] = useState<"login" | "register">("login");

  // Form states
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (mode === "register") {
      if (password !== confirmPassword) {
        setErrorMsg("Konfirmasi password tidak cocok!");
        return;
      }
      if (password.length < 6) {
        setErrorMsg("Password minimal 6 karakter!");
        return;
      }
    }

    setLoading(true);

    try {
      const endpoint = mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal melakukan proses autentikasi");
      }

      if (mode === "register") {
        setSuccessMsg("Registrasi berhasil! Mengalihkan ke form login...");
        setTimeout(() => {
          setMode("login");
          setPassword("");
          setConfirmPassword("");
          setSuccessMsg(null);
        }, 1500);
      } else {
        // Save session locally if returned
        if (data.session?.access_token) {
          localStorage.setItem("chai_auth_token", data.session.access_token);
          localStorage.setItem("chai_username", data.session.user.username);
        }
        setSuccessMsg("Login berhasil! Mengakses Tactical Command Deck...");
        setTimeout(() => {
          router.push("/profile");
        }, 1000);
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between">
      <TacticalHeader />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md hud-card border rounded p-6 sm:p-8 relative shadow-2xl theme-transition overflow-hidden">
          {/* Reticle corner markers */}
          <div className="absolute top-2 left-2 text-outline font-mono text-[9px]">[+]</div>
          <div className="absolute top-2 right-2 text-outline font-mono text-[9px]">[+]</div>
          <div className="absolute bottom-2 left-2 text-outline font-mono text-[9px]">[+]</div>
          <div className="absolute bottom-2 right-2 text-outline font-mono text-[9px]">[+]</div>

          {/* Logo & Header */}
          <div className="text-center mb-6">
            <div className="relative w-16 h-16 mx-auto mb-3 rounded-full hud-card-high border hud-border flex items-center justify-center p-2 shadow-lg">
              <Image
                src="/logo.png"
                alt="Calorie Hunter AI Logo"
                width={52}
                height={52}
                className="object-contain"
                priority
              />
            </div>
            <h1 className="font-display text-xl font-bold hud-hero-text tracking-wider uppercase">
              CALORIE HUNTER AI
            </h1>
            <p className="font-mono text-xs text-outline mt-1 uppercase">
              {isUltraman ? "SCIENCE PATROL TERMINAL // AUTH" : "TITAN PROTOCOL GATE // AUTH"}
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 gap-1 p-1 rounded hud-card-inner border hud-border mb-6">
            <button
              type="button"
              onClick={() => { setMode("login"); setErrorMsg(null); }}
              className={`py-2 text-xs font-mono font-bold uppercase transition-all rounded ${
                mode === "login"
                  ? "hud-hero-bg shadow"
                  : "hud-text-muted hover:hud-text"
              }`}
            >
              LOGIN HUNTER
            </button>
            <button
              type="button"
              onClick={() => { setMode("register"); setErrorMsg(null); }}
              className={`py-2 text-xs font-mono font-bold uppercase transition-all rounded ${
                mode === "register"
                  ? "hud-hero-bg shadow"
                  : "hud-text-muted hover:hud-text"
              }`}
            >
              REGISTRASI
            </button>
          </div>

          {/* Feedback Alerts */}
          {errorMsg && (
            <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/40 text-red-400 font-mono text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 font-mono text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-mono text-xs hud-text-muted uppercase mb-1.5">
                Username Hunter
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-outline">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="masukkan username..."
                  className="w-full pl-9 pr-3 py-2.5 rounded hud-card-inner border hud-border text-xs font-mono hud-text focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block font-mono text-xs hud-text-muted uppercase mb-1.5">
                Password
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-outline">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 rounded hud-card-inner border hud-border text-xs font-mono hud-text focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>

            {mode === "register" && (
              <div>
                <label className="block font-mono text-xs hud-text-muted uppercase mb-1.5">
                  Konfirmasi Password
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-outline">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 rounded hud-card-inner border hud-border text-xs font-mono hud-text focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full hud-clip-chamfer hud-hero-bg py-3 px-4 font-mono text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 shadow-lg hover:opacity-90 disabled:opacity-50 mt-2 cursor-pointer"
            >
              {loading ? (
                <span>MEMPROSES PROTOKOL...</span>
              ) : (
                <>
                  <span>{mode === "login" ? "MASUK KE COMMAND DECK" : "BUAT AKUN HUNTER"}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* ADR-1 Note */}
          <div className="mt-6 pt-4 border-t hud-border text-center">
            <span className="font-mono text-[10px] text-outline block">
              AUTENTIKASI DETERMINISTIK TANPA VERIFIKASI EMAIL
            </span>
          </div>
        </div>
      </main>

      <TacticalFooter />
    </div>
  );
}

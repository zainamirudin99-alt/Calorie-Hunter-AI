"use client";

import React, { useEffect, useState } from "react";
import { Download, X, Sparkles, Smartphone } from "lucide-react";

export function PwaRegistrar() {
  const [deferredPrompt, setDeferredPrompt] = useState<any | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    // 1. Check if already running in standalone mode (installed PWA)
    const isRunningStandalone = 
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    setIsStandalone(isRunningStandalone);

    // 2. Detect iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    // 3. Register Service Worker for PWA installability
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("[PWA] Service Worker registered with scope:", registration.scope);
          })
          .catch((error) => {
            console.warn("[PWA] Service Worker registration failed:", error);
          });
      });
    }

    // 4. Capture native beforeinstallprompt event (Android / Chromium)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);

      // Check if dismissed before
      const dismissed = localStorage.getItem("chai_pwa_banner_dismissed");
      if (!dismissed && !isRunningStandalone) {
        setShowBanner(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // 5. If user successfully installed
    window.addEventListener("appinstalled", () => {
      console.log("[PWA] Calorie Hunter AI successfully installed!");
      setIsInstallable(false);
      setShowBanner(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      if (isIos) {
        alert("Untuk iOS Safari:\n1. Tekan tombol 'Bagikan' (ikon kotak panah ke atas) di bawah browser\n2. Gulir ke bawah dan pilih 'Tambahkan ke Layar Utama' (Add to Home Screen).");
      }
      return;
    }

    // Show native browser install prompt
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log("[PWA] User choice outcome:", outcome);

    if (outcome === "accepted") {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  const handleDismissBanner = () => {
    setShowBanner(false);
    localStorage.setItem("chai_pwa_banner_dismissed", "true");
  };

  // Don't render banner if already running in standalone PWA mode
  if (isStandalone) {
    return null;
  }

  return (
    <>
      {/* Floating Tactical PWA Install Banner */}
      {showBanner && (isInstallable || isIos) && (
        <div className="fixed bottom-20 md:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-40 animate-slideUp">
          <div className="hud-card border-2 border-primary rounded-xl p-4 shadow-2xl bg-black/95 backdrop-blur-md relative">
            <button
              onClick={handleDismissBanner}
              className="absolute top-2.5 right-2.5 text-slate-400 hover:text-white p-1 rounded hud-card-high border hud-border"
              title="Tutup banner"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-start gap-3 mr-6">
              <div className="w-10 h-10 rounded-lg hud-hero-bg flex items-center justify-center text-black shrink-0 mt-0.5 shadow-lg">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-display text-xs font-bold hud-text tracking-wide">
                    INSTALL APLIKASI RESMI
                  </span>
                  <Sparkles className="w-3 h-3 hud-hero-text" />
                </div>
                <p className="font-mono text-[11px] text-slate-300 mt-0.5 leading-snug">
                  Pasang <strong>Calorie Hunter AI</strong> ke layar utama HP Anda untuk performa penuh tanpa bilah browser.
                </p>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t hud-border flex items-center gap-2">
              <button
                onClick={handleInstallClick}
                className="flex-1 hud-clip-chamfer hud-hero-bg py-2 px-3 font-mono text-xs font-bold uppercase text-black hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isIos ? "PANDUAN INSTALL IOS" : "INSTALL SEKARANG"}</span>
              </button>

              <button
                onClick={handleDismissBanner}
                className="px-3 py-2 rounded font-mono text-xs text-outline hover:text-white transition-colors"
              >
                Nanti
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

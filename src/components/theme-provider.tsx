"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type TacticalTheme = "godzilla" | "ultraman";

interface ThemeContextType {
  theme: TacticalTheme;
  isUltraman: boolean;
  toggleTheme: () => void;
  setTheme: (theme: TacticalTheme) => void;
  isSidebarOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<TacticalTheme>("godzilla");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Check localStorage or default to godzilla
    const savedTheme = localStorage.getItem("chai_tactical_theme") as TacticalTheme | null;
    if (savedTheme === "ultraman" || savedTheme === "godzilla") {
      setThemeState(savedTheme);
      applyTheme(savedTheme);
    } else {
      applyTheme("godzilla");
    }
    setMounted(true);

    // Background silent keep-alive check (max 1 ping per 24h per visitor to keep Supabase active)
    try {
      const lastPing = localStorage.getItem("chai_last_supaping");
      const now = Date.now();
      if (!lastPing || now - Number(lastPing) > 24 * 60 * 60 * 1000) {
        localStorage.setItem("chai_last_supaping", String(now));
        fetch("/api/cron/keep-alive?source=client-visit", { method: "GET", keepalive: true }).catch(() => {});
      }
    } catch {}
  }, []);


  const applyTheme = (newTheme: TacticalTheme) => {
    const root = document.documentElement;
    if (newTheme === "ultraman") {
      root.classList.remove("dark");
      root.classList.add("theme-ultraman");
    } else {
      root.classList.remove("theme-ultraman");
      root.classList.add("dark");
    }
  };

  const setTheme = (newTheme: TacticalTheme) => {
    setThemeState(newTheme);
    localStorage.setItem("chai_tactical_theme", newTheme);
    applyTheme(newTheme);
  };

  const toggleTheme = () => {
    const nextTheme = theme === "godzilla" ? "ultraman" : "godzilla";
    setTheme(nextTheme);
  };

  const openSidebar = () => setIsSidebarOpen(true);
  const closeSidebar = () => setIsSidebarOpen(false);
  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isUltraman: theme === "ultraman",
        toggleTheme,
        setTheme,
        isSidebarOpen,
        openSidebar,
        closeSidebar,
        toggleSidebar,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTacticalTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTacticalTheme must be used within a ThemeProvider");
  }
  return context;
}

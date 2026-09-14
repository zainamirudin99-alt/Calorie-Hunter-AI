"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type TacticalTheme = "godzilla" | "ultraman";

interface ThemeContextType {
  theme: TacticalTheme;
  isUltraman: boolean;
  toggleTheme: () => void;
  setTheme: (theme: TacticalTheme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<TacticalTheme>("godzilla");
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

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isUltraman: theme === "ultraman",
        toggleTheme,
        setTheme,
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

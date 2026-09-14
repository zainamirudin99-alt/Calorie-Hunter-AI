import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#4be277",
        "primary-container": "#22c55e",
        "surface-container-lowest": "#0a0e18",
        "surface-container-low": "#171b26",
        "surface-container": "#1c1f2a",
        "surface-container-high": "#262a35",
        "surface-container-highest": "#313540",
        surface: "#0f131d",
        "on-surface": "#dfe2f1",
        "on-surface-variant": "#bccbb9",
        outline: "#869585",
        "outline-variant": "#3d4a3d",
        tertiary: "#4dd8f7",
        secondary: "#ddb7ff",
        error: "#ffb4ab",
        "error-container": "#93000a",
        "on-primary": "#003915",
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        full: "9999px",
      },
      fontFamily: {
        body: ["var(--font-geist)", "sans-serif"],
        display: ["var(--font-space-grotesk)", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;

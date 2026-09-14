import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { MobileTacticalDock } from "@/components/hud/mobile-dock";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "CALORIE HUNTER AI // TACTICAL HUD [GODZILLA VS ULTRAMAN]",
  description: "Tactical metabolic energy & calorie hunting HUD powered by deterministic Mifflin-St Jeor and Gemini AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="dark" id="theme-root">
      <body
        className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} font-sans hud-surface-bg hud-text antialiased min-h-screen flex flex-col overflow-x-hidden theme-transition pb-20 md:pb-0`}
      >
        <ThemeProvider>
          {children}
          <MobileTacticalDock />
        </ThemeProvider>
      </body>
    </html>
  );
}

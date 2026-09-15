import type { Metadata, Viewport } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { MobileTacticalDock } from "@/components/hud/mobile-dock";
import { TacticalSidebar } from "@/components/hud/sidebar";
import { PwaRegistrar } from "@/components/pwa-registrar";

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

export const viewport: Viewport = {
  themeColor: "#030712",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "CALORIE HUNTER AI // TACTICAL HUD [GODZILLA VS ULTRAMAN]",
  description: "Tactical metabolic energy & calorie hunting HUD powered by deterministic Mifflin-St Jeor and Gemini AI.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Calorie Hunter",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/sidebar-icon.png", sizes: "1024x1024", type: "image/png" },
    ],
    shortcut: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="dark" id="theme-root">
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Calorie Hunter" />
      </head>
      <body
        className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} font-sans hud-surface-bg hud-text antialiased min-h-screen flex flex-col overflow-x-hidden theme-transition pb-20 md:pb-0`}
      >
        <ThemeProvider>
          {children}
          <TacticalSidebar />
          <MobileTacticalDock />
          <PwaRegistrar />
        </ThemeProvider>
      </body>
    </html>
  );
}

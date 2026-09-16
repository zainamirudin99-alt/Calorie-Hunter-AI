import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Single source of truth for standard calendar date string in WIB (Asia/Jakarta, UTC+7).
 * Prevents mobile and desktop from diverging around midnight due to different device timezones.
 */
export function getStandardWibDate(d: Date = new Date()): string {
  const wibTime = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  return wibTime.toISOString().split("T")[0];
}

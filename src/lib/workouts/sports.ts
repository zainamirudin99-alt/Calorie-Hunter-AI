import { SportCategory, ActivityIntensity } from "@/types/database";

export interface SportDefinition {
  id: string;
  name: string;
  category: SportCategory;
  defaultMet: number;
  description: string;
  popular?: boolean;
}

export interface SportCategoryInfo {
  id: SportCategory;
  name: string;
  iconName: string;
  badge: string;
}

export const SPORT_CATEGORIES: SportCategoryInfo[] = [
  { id: "gym", name: "Gym & Strength Training", iconName: "Dumbbell", badge: "STRENGTH" },
  { id: "cardio", name: "Cardio, Lari & Sepeda", iconName: "Flame", badge: "ENDURANCE" },
  { id: "racket", name: "Olahraga Raket (Badminton/Tenis)", iconName: "Zap", badge: "AGILITY" },
  { id: "team_sports", name: "Futsal, Sepakbola & Tim", iconName: "Trophy", badge: "TEAM" },
  { id: "combat_water", name: "Bela Diri & Renang", iconName: "Shield", badge: "COMBAT / WATER" },
  { id: "flexibility_hiit", name: "HIIT, Yoga & Fleksibilitas", iconName: "Activity", badge: "HIIT / MOBILITY" },
  { id: "other", name: "Olahraga & Hobi Lainnya", iconName: "Target", badge: "CUSTOM" },
];

/**
 * Standard Scientific Sports Compendium with verified MET values
 * Source: 2011/2024 Compendium of Physical Activities (Ainsworth et al.)
 */
export const SPORTS_DATABASE: SportDefinition[] = [
  // 1. GYM & STRENGTH TRAINING
  { id: "gym-leg-day", name: "Leg Day Gym (Squat / Leg Press / Lunge)", category: "gym", defaultMet: 6.5, description: "Latihan intensitas tinggi fokus otot paha & gluteus", popular: true },
  { id: "gym-upper-day", name: "Upper Body Gym (Bench Press / Row / Overhead)", category: "gym", defaultMet: 5.5, description: "Latihan dada, punggung, dan bahu", popular: true },
  { id: "gym-full-body", name: "Full Body Gym (Compound Movements)", category: "gym", defaultMet: 6.0, description: "Latihan beban menyeluruh melibatkan multi-sendi", popular: true },
  { id: "gym-powerlifting", name: "Powerlifting (Heavy Deadlift, Squat, Bench)", category: "gym", defaultMet: 6.0, description: "Beban maksimal dengan jeda istirahat terukur" },
  { id: "gym-calisthenics", name: "Kalistenik (Push Up, Pull Up, Dips, Muscle Up)", category: "gym", defaultMet: 6.5, description: "Latihan beban tubuh intensif" },
  { id: "gym-arms-core", name: "Isolasi Lengan & Perut (Bicep/Tricep/Abs)", category: "gym", defaultMet: 4.5, description: "Latihan isolasi lengan dan otot inti" },

  // 2. CARDIO, RUNNING & CYCLING
  { id: "cardio-jogging", name: "Jogging Santai / Lari Sedang (~8 km/jam)", category: "cardio", defaultMet: 8.0, description: "Lari aerobik zona 2 untuk membakar lemak", popular: true },
  { id: "cardio-sprint", name: "Lari Cepat / Interval Sprint (~11-13 km/jam)", category: "cardio", defaultMet: 11.5, description: "Sprint intensitas maksimal", popular: true },
  { id: "cardio-treadmill", name: "Treadmill (Incline Walk / Jogging)", category: "cardio", defaultMet: 7.5, description: "Latihan kardio mesin treadmill dengan kemiringan" },
  { id: "cardio-cycling-road", name: "Bersepeda Luar Ruangan (~16-20 km/jam)", category: "cardio", defaultMet: 6.8, description: "Bersepeda jalan raya dengan kecepatan konstan" },
  { id: "cardio-spinning", name: "Spinning / Sepeda Statis Cepat", category: "cardio", defaultMet: 8.5, description: "Latihan interval sepeda statis RPM tinggi", popular: true },
  { id: "cardio-brisk-walk", name: "Jalan Kaki Cepat (Brisk Walking 5.5-6.5 km/jam)", category: "cardio", defaultMet: 4.3, description: "Jalan kaki tempo cepat hemat persendian" },
  { id: "cardio-skipping", name: "Lompat Tali / Skipping (Sedang-Cepat)", category: "cardio", defaultMet: 10.0, description: "Kardio ritmik kaki dan pembakaran kalori masif" },
  { id: "cardio-elliptical", name: "Mesin Elliptical / Cross Trainer", category: "cardio", defaultMet: 5.0, description: "Kardio low-impact untuk seluruh tubuh" },
  { id: "cardio-rowing", name: "Mesin Dayung / Rowing Ergometer", category: "cardio", defaultMet: 7.0, description: "Kardio full body melibatkan punggung dan kaki" },

  // 3. RACKET SPORTS
  { id: "racket-badminton", name: "Badminton / Bulutangkis (Tunggal / Ganda)", category: "racket", defaultMet: 7.0, description: "Manuver smash, lunge, dan reli dinamis", popular: true },
  { id: "racket-tennis", name: "Tenis Lapangan (Singles / Tunggal)", category: "racket", defaultMet: 7.3, description: "Pergerakan lapangan penuh dan reli keras", popular: true },
  { id: "racket-tennis-doubles", name: "Tenis Lapangan (Doubles / Ganda)", category: "racket", defaultMet: 6.0, description: "Permainan tenis ganda dengan tempo taktis" },
  { id: "racket-padel", name: "Padel Tennis", category: "racket", defaultMet: 7.0, description: "Olahraga raket padel dengan pantulan dinding cepat", popular: true },
  { id: "racket-table-tennis", name: "Tenis Meja / Pingpong", category: "racket", defaultMet: 4.0, description: "Refleks cepat dan koordinasi mata-tangan" },
  { id: "racket-squash", name: "Squash / Racquetball", category: "racket", defaultMet: 10.0, description: "Akselerasi eksplosif di ruangan tertutup" },

  // 4. TEAM SPORTS
  { id: "team-futsal", name: "Futsal / Minisoccer", category: "team_sports", defaultMet: 8.5, description: "Transisi cepat menyerang-bertahan di lapangan rumput sintetis/vinyl", popular: true },
  { id: "team-football", name: "Sepakbola Lapangan Besar", category: "team_sports", defaultMet: 8.0, description: "Pertandingan 11 vs 11 dengan jarak lari jauh", popular: true },
  { id: "team-basketball", name: "Bola Basket (Pertandingan / Game Penuh)", category: "team_sports", defaultMet: 8.0, description: "Lompatan, sprint pendek, dan kontak fisik", popular: true },
  { id: "team-volleyball", name: "Bola Voli (Indoor / Pantai)", category: "team_sports", defaultMet: 6.0, description: "Spike, block, dan reaksi cepat lapangan" },

  // 5. COMBAT & WATER SPORTS
  { id: "water-swimming-freestyle", name: "Renang Gaya Bebas (Freestyle Sedang-Cepat)", category: "combat_water", defaultMet: 8.3, description: "Latihan renang kardio tanpa beban sendi", popular: true },
  { id: "water-swimming-breaststroke", name: "Renang Gaya Dada", category: "combat_water", defaultMet: 6.8, description: "Gaya renang ritmis dan stabil" },
  { id: "water-swimming-butterfly", name: "Renang Gaya Kupu-Kupu (Intens)", category: "combat_water", defaultMet: 11.0, description: "Kekuatan tarikan bahu dan dorongan masif" },
  { id: "combat-muay-thai", name: "Muay Thai / Kickboxing (Pad Work / Sparring)", category: "combat_water", defaultMet: 10.0, description: "Pukulan, tendangan, sikutan, dan latihan ketahanan tinggi", popular: true },
  { id: "combat-boxing", name: "Tinju / Boxing (Heavy Bag & Shadow Boxing)", category: "combat_water", defaultMet: 9.0, description: "Footwork, kombinasi pukulan, dan kardio tempur", popular: true },
  { id: "combat-bjj", name: "Brazilian Jiu-Jitsu (BJJ) / Gulat", category: "combat_water", defaultMet: 10.0, description: "Grappling di lantai dengan pengeluaran energi konstan" },
  { id: "combat-taekwondo-karate", name: "Taekwondo / Karate / Silat", category: "combat_water", defaultMet: 8.0, description: "Latihan jurus, tendangan, dan ketangkasan" },

  // 6. FLEXIBILITY & HIIT
  { id: "hiit-circuit", name: "HIIT / Tabata / Circuit Training", category: "flexibility_hiit", defaultMet: 9.0, description: "Interval kerja keras dan istirahat singkat untuk EPOC tinggi", popular: true },
  { id: "flexibility-yoga", name: "Yoga (Vinyasa / Power Yoga)", category: "flexibility_hiit", defaultMet: 4.0, description: "Aliran pose dinamis menguatkan otot penstabil" },
  { id: "flexibility-pilates", name: "Pilates / Core Conditioning", category: "flexibility_hiit", defaultMet: 3.5, description: "Penguatan otot perut, panggul, dan postur" },
  { id: "flexibility-stretching", name: "Stretching & Mobilitas Sendi", category: "flexibility_hiit", defaultMet: 2.5, description: "Peregangan otot dan pemulihan neuromuskular" },

  // 7. OTHER
  { id: "other-stair-climbing", name: "Naik Turun Tangga / Stair Master", category: "other", defaultMet: 8.5, description: "Latihan kaki dan kardio vertikal", popular: true },
  { id: "other-hiking", name: "Hiking / Mendaki Gunung", category: "other", defaultMet: 7.0, description: "Berjalan di medan tanjakan alam" },
  { id: "other-bowling", name: "Bowling", category: "other", defaultMet: 3.0, description: "Olahraga presisi santai" },
  { id: "other-custom", name: "Olahraga Lainnya (Kustom)", category: "other", defaultMet: 6.0, description: "Aktivitas fisik khusus pilihan Anda" },
];

/**
 * Calculates exact burned calories based on scientific formula:
 * Calories = Math.round(MET * weight_kg * (duration_minutes / 60) * intensityMultiplier)
 */
export function calculateBurnedCalories(params: {
  met: number;
  weightKg: number;
  durationMinutes: number;
  intensity?: ActivityIntensity;
}): number {
  const { met, weightKg, durationMinutes, intensity = "moderate" } = params;
  if (!met || met <= 0 || !weightKg || weightKg <= 0 || !durationMinutes || durationMinutes <= 0) {
    return 0;
  }

  // Intensity modifier: low reduces slightly, high boosts slightly
  const intensityMultiplier = intensity === "high" ? 1.15 : intensity === "low" ? 0.88 : 1.0;
  const burned = met * weightKg * (durationMinutes / 60) * intensityMultiplier;
  return Math.round(burned);
}

export function findSportById(id: string): SportDefinition | undefined {
  return SPORTS_DATABASE.find((s) => s.id === id);
}

export function getSportsByCategory(category: SportCategory | "all"): SportDefinition[] {
  if (category === "all") return SPORTS_DATABASE;
  return SPORTS_DATABASE.filter((s) => s.category === category);
}

export function searchSports(
  query: string,
  category: SportCategory | "all" = "all"
): SportDefinition[] {
  const list = getSportsByCategory(category);
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q)
  );
}

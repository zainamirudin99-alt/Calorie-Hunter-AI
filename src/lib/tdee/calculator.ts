import { ActivityLevel, Gender, ProgramType, ProgramNutrientRules } from "@/types/database";

export const PAL_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,      // Sedentary: little or no exercise
  light: 1.375,        // Light exercise 1-3 days/week
  moderate: 1.55,      // Moderate exercise 3-5 days/week
  active: 1.725,       // Hard exercise 6-7 days/week
  very_active: 1.9,    // Very hard exercise/training & physical job
};

export const PROGRAM_MULTIPLIERS: Record<ProgramType, number> = {
  // Legacy base types
  cutting: 0.8,               // -20% deficit (clamped at BMR)
  maintenance: 1.0,           // 0%
  bulking: 1.15,              // +15% surplus

  // Specialized 6 programs
  weight_loss: 0.75,          // -25% deficit, pure calorie focus
  loss_fat: 0.80,             // -20% deficit, no strict protein
  loss_fat_build_muscle: 0.82,// -18% deficit, strict high protein
  gain_mass: 1.18,            // +18% surplus, pure calorie focus
  gain_mass_build_muscle: 1.12,// +12% surplus, strict protein
  lean_mass: 1.06,            // +6% clean surplus, strict macro & micro
};

export interface TdeeCalculationParams {
  weight_kg: number;
  height_cm: number;
  age: number;
  gender: Gender;
  activity_level: ActivityLevel;
}

export interface TdeeResult {
  bmr: number;
  pal_factor: number;
  tdee: number;
  targets: Record<ProgramType, number>;
}

/**
 * Calculates deterministic BMR using Mifflin-St Jeor equation:
 * Men:   BMR = 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
 * Women: BMR = 10 * weight_kg + 6.25 * height_cm - 5 * age - 161
 */
export function calculateBMR(params: Omit<TdeeCalculationParams, "activity_level">): number {
  const { weight_kg, height_cm, age, gender } = params;
  const base = 10 * weight_kg + 6.25 * height_cm - 5 * age;
  const bmr = gender === "male" ? base + 5 : base - 161;
  return Math.round(bmr);
}

/**
 * Calculates TDEE = BMR * PAL Factor
 * And derives target daily kcal for all ProgramTypes.
 * Note: Deficit programs are clamped at minimum = BMR to ensure metabolic safety.
 */
export function calculateTDEE(params: TdeeCalculationParams): TdeeResult {
  const bmr = calculateBMR(params);
  const pal_factor = PAL_MULTIPLIERS[params.activity_level] || 1.2;
  const tdee = Math.round(bmr * pal_factor);

  const targets = {} as Record<ProgramType, number>;

  for (const [pType, mult] of Object.entries(PROGRAM_MULTIPLIERS)) {
    const rawTarget = Math.round(tdee * mult);
    // If deficit program (multiplier < 1), clamp to BMR
    targets[pType as ProgramType] = mult < 1.0 ? Math.max(rawTarget, bmr) : rawTarget;
  }

  return {
    bmr,
    pal_factor,
    tdee,
    targets,
  };
}

/**
 * Returns exact nutrient monitoring rules for each program
 */
export function getProgramNutrientRules(programType: ProgramType): ProgramNutrientRules {
  switch (programType) {
    case "weight_loss":
      return {
        tracksMacros: false,
        tracksMicros: false,
        tracksProteinStrictly: false,
        proteinTargetDesc: "Bebas / Tidak Wajib Pantau",
        ruleTitle: "Fokus Defisit Total Kalori",
        ruleDescription: "Tidak memperhatikan mikro dan makro nutrisinya. Target utama adalah mematuhi defisit kalori harian.",
        badge: "BEBAS MAKRO & MIKRO",
      };
    case "loss_fat":
      return {
        tracksMacros: true,
        tracksMicros: false,
        tracksProteinStrictly: false,
        proteinTargetDesc: "Standar (Tidak Di-enforce)",
        ruleTitle: "Fokus Bakar Lemak",
        ruleDescription: "Defisit kalori terukur untuk pembakaran lemak, tidak memperhatikan protein hariannya secara ketat.",
        badge: "FLEKSIBEL PROTEIN",
      };
    case "loss_fat_build_muscle":
      return {
        tracksMacros: true,
        tracksMicros: false,
        tracksProteinStrictly: true,
        proteinTargetDesc: "Tinggi (1.8g - 2.2g / kg BB)",
        ruleTitle: "Rekomposisi Tubuh (Fat Loss + Otot)",
        ruleDescription: "Memperhatikan protein harian yang seharusnya untuk build muscle sambil menjaga defisit kalori.",
        badge: "WAJIB PROTEIN TINGGI",
      };
    case "gain_mass":
      return {
        tracksMacros: false,
        tracksMicros: false,
        tracksProteinStrictly: false,
        proteinTargetDesc: "Bebas / Tidak Wajib Pantau",
        ruleTitle: "Fokus Surplus Berat Badan",
        ruleDescription: "Tidak memperhatikan mikro dan makro nutrisi. Target utama adalah mencapai surplus kalori harian.",
        badge: "BEBAS MAKRO & MIKRO",
      };
    case "gain_mass_build_muscle":
      return {
        tracksMacros: true,
        tracksMicros: false,
        tracksProteinStrictly: true,
        proteinTargetDesc: "Tinggi (1.6g - 2.0g / kg BB)",
        ruleTitle: "Surplus Hipertrofi Otot",
        ruleDescription: "Surplus kalori terkontrol dan memperhatikan protein harian untuk pembentukan jaringan otot optimal.",
        badge: "WAJIB PROTEIN TINGGI",
      };
    case "lean_mass":
      return {
        tracksMacros: true,
        tracksMicros: true,
        tracksProteinStrictly: true,
        proteinTargetDesc: "Optimal Seimbang (1.8g - 2.0g / kg BB)",
        ruleTitle: "Kontrol Penuh Makro & Mikro",
        ruleDescription: "Memperhatikan mikro dan makronya secara ketat untuk pertumbuhan massa murni dan kesehatan metabolik maksimal.",
        badge: "KONTROL MAKRO & MIKRO KETAT",
      };
    case "bulking":
      return {
        tracksMacros: true,
        tracksMicros: false,
        tracksProteinStrictly: true,
        proteinTargetDesc: "Tinggi (1.6g - 2.0g / kg BB)",
        ruleTitle: "Bulking Power Surge",
        ruleDescription: "Surplus kalori +15% untuk hipertrofi.",
        badge: "SURPLUS HYPERTROPHY",
      };
    case "maintenance":
      return {
        tracksMacros: true,
        tracksMicros: true,
        tracksProteinStrictly: false,
        proteinTargetDesc: "Standar (1.2g - 1.5g / kg BB)",
        ruleTitle: "Maintenance Defense",
        ruleDescription: "Keseimbangan energi netral untuk stabilisasi metabolik.",
        badge: "STABILISASI ENERGI",
      };
    case "cutting":
    default:
      return {
        tracksMacros: true,
        tracksMicros: false,
        tracksProteinStrictly: true,
        proteinTargetDesc: "Tinggi (1.8g - 2.2g / kg BB)",
        ruleTitle: "Cutting Protocol",
        ruleDescription: "Defisit -20% TDEE dengan retensi protein tinggi.",
        badge: "DEFISIT TERUKUR",
      };
  }
}

export interface MacroTargets {
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  protein_pct: number;
  carbs_pct: number;
  fat_pct: number;
}

export interface ReassessmentStatus {
  isExpired: boolean;
  daysRemaining: number;
  totalDays: number;
  progressPct: number;
}

/**
 * Single source of truth for remaining calories calculation (guaranteed non-negative).
 */
export function calculateRemainingCalories(targetDailyKcal: number, consumedKcal: number): number {
  return Math.max(0, Math.round(targetDailyKcal) - Math.round(consumedKcal));
}

/**
 * Single source of truth for 180-day program reassessment cycle.
 */
export function calculateReassessmentStatus(
  startDate: string | Date,
  endDate?: string | Date
): ReassessmentStatus {
  const start = new Date(startDate).getTime();
  const end = endDate ? new Date(endDate).getTime() : start + 180 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const totalDays = 180;
  const diffMs = end - now;
  const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  const isExpired = daysRemaining <= 0;
  const daysElapsed = Math.min(totalDays, Math.max(0, Math.floor((now - start) / (1000 * 60 * 60 * 24))));
  const progressPct = Math.min(100, Math.round((daysElapsed / totalDays) * 100));

  return {
    isExpired,
    daysRemaining,
    totalDays,
    progressPct,
  };
}

/**
 * Single source of truth for macro split calculations per program protocol.
 */
export function calculateMacroTargets(
  targetDailyKcal: number,
  programType: ProgramType
): MacroTargets {
  const target = Math.max(0, targetDailyKcal);
  let pRatio = 0.35;
  let cRatio = 0.40;
  let fRatio = 0.25;

  switch (programType) {
    case "weight_loss":
      pRatio = 0.25; cRatio = 0.50; fRatio = 0.25;
      break;
    case "loss_fat":
      pRatio = 0.25; cRatio = 0.50; fRatio = 0.25;
      break;
    case "loss_fat_build_muscle":
      pRatio = 0.38; cRatio = 0.37; fRatio = 0.25;
      break;
    case "gain_mass":
      pRatio = 0.20; cRatio = 0.55; fRatio = 0.25;
      break;
    case "gain_mass_build_muscle":
      pRatio = 0.32; cRatio = 0.48; fRatio = 0.20;
      break;
    case "lean_mass":
      pRatio = 0.35; cRatio = 0.45; fRatio = 0.20;
      break;
    case "bulking":
      pRatio = 0.25; cRatio = 0.55; fRatio = 0.20;
      break;
    case "maintenance":
      pRatio = 0.30; cRatio = 0.45; fRatio = 0.25;
      break;
    case "cutting":
    default:
      pRatio = 0.35; cRatio = 0.40; fRatio = 0.25;
      break;
  }

  return {
    protein_g: Math.round((target * pRatio) / 4),
    carbs_g: Math.round((target * cRatio) / 4),
    fat_g: Math.round((target * fRatio) / 9),
    protein_pct: Math.round(pRatio * 100),
    carbs_pct: Math.round(cRatio * 100),
    fat_pct: Math.round(fRatio * 100),
  };
}


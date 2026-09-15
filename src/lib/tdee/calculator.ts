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

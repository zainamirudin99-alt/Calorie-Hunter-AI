// ==============================================================================
// CALORIE HUNTER AI — DETERMINISTIC BMR / TDEE CALCULATOR (Mifflin-St Jeor)
// Source of Truth: SOURCE_OF_TRUTH.md (§1 ADR-2 & §6.1)
// ==============================================================================

import { ActivityLevel, Gender, ProgramType } from "@/types/database";

export const PAL_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,      // Sedentary: little or no exercise
  light: 1.375,        // Light exercise 1-3 days/week
  moderate: 1.55,      // Moderate exercise 3-5 days/week
  active: 1.725,       // Hard exercise 6-7 days/week
  very_active: 1.9,    // Very hard exercise/training & physical job
};

export const PROGRAM_MULTIPLIERS: Record<ProgramType, number> = {
  cutting: 0.8,        // -20% deficit (clamped at BMR)
  maintenance: 1.0,    // 0%
  bulking: 1.15,       // +15% surplus
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
  targets: {
    cutting: number;
    maintenance: number;
    bulking: number;
  };
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
 * And derives target daily kcal for Cutting, Maintenance, and Bulking.
 * Note: Cutting is clamped at minimum = BMR to ensure metabolic safety.
 */
export function calculateTDEE(params: TdeeCalculationParams): TdeeResult {
  const bmr = calculateBMR(params);
  const pal_factor = PAL_MULTIPLIERS[params.activity_level] || 1.2;
  const tdee = Math.round(bmr * pal_factor);

  // Cutting: TDEE * 0.8, clamped at minimum BMR
  const rawCutting = Math.round(tdee * PROGRAM_MULTIPLIERS.cutting);
  const cutting = Math.max(rawCutting, bmr);

  const maintenance = Math.round(tdee * PROGRAM_MULTIPLIERS.maintenance);
  const bulking = Math.round(tdee * PROGRAM_MULTIPLIERS.bulking);

  return {
    bmr,
    pal_factor,
    tdee,
    targets: {
      cutting,
      maintenance,
      bulking,
    },
  };
}

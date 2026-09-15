// ==============================================================================
// CALORIE HUNTER AI — DATABASE & DOMAIN TYPES
// Source of Truth: SOURCE_OF_TRUTH.md (§2.1 Model Domain & Invariant)
// ==============================================================================

export type Gender = "male" | "female";

export type ActivityLevel = 
  | "sedentary"   // PAL 1.2
  | "light"       // PAL 1.375
  | "moderate"    // PAL 1.55
  | "active"      // PAL 1.725
  | "very_active"; // PAL 1.9

export type ActivityIntensity = "low" | "moderate" | "high";

export type ProgramType = 
  | "cutting" 
  | "bulking" 
  | "maintenance"
  | "weight_loss"
  | "loss_fat"
  | "loss_fat_build_muscle"
  | "gain_mass"
  | "gain_mass_build_muscle"
  | "lean_mass";

export interface ProgramNutrientRules {
  tracksMacros: boolean;
  tracksMicros: boolean;
  tracksProteinStrictly: boolean;
  proteinTargetDesc: string;
  ruleTitle: string;
  ruleDescription: string;
  badge: string;
}

export interface CompanionProfile {
  character_name: string;
  avatar_url: string;
  character_type?: string;
  theme?: "godzilla" | "ultraman";
  level?: number;
  updated_at?: string;
}

export type ProgramStatus = "active" | "expired" | "superseded";

export type FoodLogInputType = "photo" | "manual_text";

export interface Profile {
  id: string; // references auth.users(id)
  username: string;
  full_name: string | null;
  gender: Gender | null;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  activity_level: ActivityLevel | null;
  created_at: string;
  updated_at: string;
}

export interface WeeklyActivity {
  id: string;
  user_id: string;
  activity_name: string;
  frequency_per_week: number; // 0 to 7
  duration_minutes: number;   // > 0
  intensity: ActivityIntensity;
  created_at: string;
}

export interface WeightLog {
  id: string;
  user_id: string;
  weight_kg: number;
  logged_at: string;
  note?: string | null;
}

export interface Program {
  id: string;
  user_id: string;
  tdee_base: number;
  program_type: ProgramType;
  target_daily_kcal: number;
  start_date: string;
  end_date: string; // start_date + 6 months
  status: ProgramStatus;
  created_at: string;
}

export interface MealPlanDayMeal {
  meal_name: string; // e.g. "Sarapan", "Makan Siang", "Camilan", "Makan Malam"
  time_slot: string; // e.g. "08:00"
  estimated_kcal: number;
  macros: {
    carbs_g: number;
    protein_g: number;
    fat_g: number;
  };
  suggested_menu: string[];
  tips?: string;
}

export interface MealPlanDay {
  day_number: number; // 1 to 7
  day_name: string;   // e.g. "Senin", "Selasa", ...
  total_day_kcal: number;
  meals: MealPlanDayMeal[];
}

export interface MealPlanJson {
  summary: string;
  target_daily_kcal: number;
  weekly_split: {
    protein_pct: number;
    carbs_pct: number;
    fat_pct: number;
  };
  days: MealPlanDay[];
}

export interface MealPlan {
  id: string;
  program_id: string;
  week_start_date: string;
  plan_json: MealPlanJson;
  generated_at: string;
  model_used: string;
}

export interface FoodLogItemNutrition {
  food_name: string;
  weight_g: number;
  calories_kcal: number;
  carbs_g: number;
  protein_g: number;
  fat_g: number;
  fiber_g: number;
  sugar_g: number;
  micros_json: {
    sodium_mg?: number;
    potassium_mg?: number;
    vitamin_c_mg?: number;
    calcium_mg?: number;
    iron_mg?: number;
    [key: string]: number | undefined;
  };
  confidence?: number;
  pct_of_daily_kcal?: number;
}

export interface FoodLog {
  id: string;
  user_id: string;
  program_id: string | null;
  logged_at: string;
  input_type: FoodLogInputType;
  photo_url: string | null;
  raw_text_input: string | null;
  ai_response_json: {
    items: FoodLogItemNutrition[];
    total_calories_kcal: number;
    notes?: string;
  } | null;
  total_kcal: number;
}

export interface FoodLogItem extends FoodLogItemNutrition {
  id: string;
  food_log_id: string;
  created_at: string;
}

-- ==============================================================================
-- CALORIE HUNTER AI — INITIAL POSTGRES DATABASE SCHEMA & RLS MIGRATION
-- Source of Truth: SOURCE_OF_TRUTH.md (§2.1 Model Domain & Invariant)
-- ==============================================================================

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  full_name TEXT,
  gender TEXT CHECK (gender IN ('male', 'female')),
  age INT CHECK (age BETWEEN 10 AND 100),
  height_cm NUMERIC CHECK (height_cm > 0),
  weight_kg NUMERIC CHECK (weight_kg > 0),
  activity_level TEXT CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Case-insensitive unique index on lower(username)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_lower ON public.profiles (lower(username));

-- 2. WEEKLY ACTIVITIES TABLE
CREATE TABLE IF NOT EXISTS public.weekly_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_name TEXT NOT NULL,
  frequency_per_week INT NOT NULL CHECK (frequency_per_week BETWEEN 0 AND 7),
  duration_minutes INT NOT NULL CHECK (duration_minutes > 0),
  intensity TEXT NOT NULL CHECK (intensity IN ('low', 'moderate', 'high')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_weekly_activities_user_id ON public.weekly_activities(user_id);

-- 3. WEIGHT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.weight_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weight_kg NUMERIC NOT NULL CHECK (weight_kg > 0),
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  note TEXT
);

CREATE INDEX IF NOT EXISTS idx_weight_logs_user_id_logged_at ON public.weight_logs(user_id, logged_at DESC);

-- 4. PROGRAMS TABLE
CREATE TABLE IF NOT EXISTS public.programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tdee_base NUMERIC NOT NULL,
  program_type TEXT NOT NULL CHECK (program_type IN ('cutting', 'bulking', 'maintenance')),
  target_daily_kcal NUMERIC NOT NULL,
  start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'superseded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Invariant: Exactly one active program per user at any time
CREATE UNIQUE INDEX IF NOT EXISTS idx_single_active_program_per_user 
ON public.programs (user_id) 
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_programs_user_id ON public.programs(user_id);

-- 5. MEAL PLANS TABLE
CREATE TABLE IF NOT EXISTS public.meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  plan_json JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  model_used TEXT DEFAULT 'gemini-3.8-flash'
);

CREATE INDEX IF NOT EXISTS idx_meal_plans_program_id ON public.meal_plans(program_id);

-- 6. FOOD LOGS TABLE
CREATE TABLE IF NOT EXISTS public.food_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  input_type TEXT NOT NULL CHECK (input_type IN ('photo', 'manual_text')),
  photo_url TEXT,
  raw_text_input TEXT,
  ai_response_json JSONB,
  total_kcal NUMERIC NOT NULL DEFAULT 0,
  -- Invariant XOR: Exactly one of photo_url or raw_text_input must be provided
  CONSTRAINT chk_food_logs_photo_or_text CHECK ((photo_url IS NOT NULL) <> (raw_text_input IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_food_logs_user_id_logged_at ON public.food_logs(user_id, logged_at DESC);

-- 7. FOOD LOG ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.food_log_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  food_log_id UUID NOT NULL REFERENCES public.food_logs(id) ON DELETE CASCADE,
  food_name TEXT NOT NULL,
  weight_g NUMERIC NOT NULL CHECK (weight_g > 0),
  calories_kcal NUMERIC NOT NULL CHECK (calories_kcal >= 0),
  carbs_g NUMERIC NOT NULL DEFAULT 0,
  protein_g NUMERIC NOT NULL DEFAULT 0,
  fat_g NUMERIC NOT NULL DEFAULT 0,
  fiber_g NUMERIC NOT NULL DEFAULT 0,
  sugar_g NUMERIC NOT NULL DEFAULT 0,
  micros_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  pct_of_daily_kcal NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_food_log_items_food_log_id ON public.food_log_items(food_log_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all 7 tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_log_items ENABLE ROW LEVEL SECURITY;

-- 1. Profiles RLS (Users manage their own profile)
CREATE POLICY "Users can view own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

-- 2. Weekly Activities RLS
CREATE POLICY "Users can manage own activities" 
  ON public.weekly_activities FOR ALL 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. Weight Logs RLS
CREATE POLICY "Users can manage own weight logs" 
  ON public.weight_logs FOR ALL 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Programs RLS
CREATE POLICY "Users can manage own programs" 
  ON public.programs FOR ALL 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. Meal Plans RLS
CREATE POLICY "Users can view meal plans for their programs" 
  ON public.meal_plans FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.programs 
    WHERE programs.id = meal_plans.program_id 
    AND programs.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert meal plans for their programs" 
  ON public.meal_plans FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.programs 
    WHERE programs.id = meal_plans.program_id 
    AND programs.user_id = auth.uid()
  ));

CREATE POLICY "Users can update meal plans for their programs" 
  ON public.meal_plans FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM public.programs 
    WHERE programs.id = meal_plans.program_id 
    AND programs.user_id = auth.uid()
  ));

-- 6. Food Logs RLS
CREATE POLICY "Users can manage own food logs" 
  ON public.food_logs FOR ALL 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 7. Food Log Items RLS
CREATE POLICY "Users can view own food log items" 
  ON public.food_log_items FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.food_logs 
    WHERE food_logs.id = food_log_items.food_log_id 
    AND food_logs.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage own food log items" 
  ON public.food_log_items FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM public.food_logs 
    WHERE food_logs.id = food_log_items.food_log_id 
    AND food_logs.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.food_logs 
    WHERE food_logs.id = food_log_items.food_log_id 
    AND food_logs.user_id = auth.uid()
  ));

-- ==============================================================================
-- STORAGE BUCKET: food-photos (Private)
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('food-photos', 'food-photos', false) 
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: Users can upload and read their own food photos
CREATE POLICY "Allow authenticated users to upload food photos" 
  ON storage.objects FOR INSERT 
  TO authenticated 
  WITH CHECK (bucket_id = 'food-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Allow authenticated users to read their own food photos" 
  ON storage.objects FOR SELECT 
  TO authenticated 
  USING (bucket_id = 'food-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Allow authenticated users to delete their own food photos" 
  ON storage.objects FOR DELETE 
  TO authenticated 
  USING (bucket_id = 'food-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

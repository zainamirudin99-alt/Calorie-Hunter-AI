-- ==============================================================================
-- CALORIE HUNTER AI — MIGRATION 0003: CROSS-DEVICE SYNC & ROBUSTNESS
-- 1. Loosen food_logs constraint so both photo and text note can be stored simultaneously
-- 2. Ensure both 'logged_at' and 'created_at' columns exist on food_logs
-- 3. Add avatar_url and companion_data columns to profiles for instant cloud sync
-- ==============================================================================

-- 1. Relax rigid XOR constraint on food_logs so users can provide photo + text hint together
ALTER TABLE IF EXISTS public.food_logs 
  DROP CONSTRAINT IF EXISTS chk_food_logs_photo_or_text;

-- Replace with permissive constraint: at least one of photo_url or raw_text_input must be present
ALTER TABLE IF EXISTS public.food_logs 
  ADD CONSTRAINT chk_food_logs_photo_or_text_permissive 
  CHECK (photo_url IS NOT NULL OR raw_text_input IS NOT NULL);

-- 2. Ensure both created_at and logged_at exist on food_logs for backward and forward compatibility
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'food_logs' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.food_logs ADD COLUMN created_at TIMESTAMPTZ DEFAULT now();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'food_logs' AND column_name = 'logged_at'
  ) THEN
    ALTER TABLE public.food_logs ADD COLUMN logged_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

-- 3. Sync existing rows if one timestamp column was null
UPDATE public.food_logs SET created_at = logged_at WHERE created_at IS NULL AND logged_at IS NOT NULL;
UPDATE public.food_logs SET logged_at = created_at WHERE logged_at IS NULL AND created_at IS NOT NULL;

-- 4. Ensure profiles table has avatar_url and companion_data for seamless cross-device desktop/mobile sync
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'companion_data'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN companion_data JSONB;
  END IF;
END $$;

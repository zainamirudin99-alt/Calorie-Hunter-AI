-- ==============================================================================
-- CALORIE HUNTER AI — MIGRATION 0009: DAILY WORKOUT & EXERCISE LOGS (MET-BASED)
-- Source of Truth: Compendium of Physical Activities (Ainsworth et al.)
-- Invariant: Calories burned = Math.round(MET * weight_kg * (duration_minutes / 60))
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.workout_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sport_category TEXT NOT NULL,
  sport_name TEXT NOT NULL,
  met_value NUMERIC NOT NULL CHECK (met_value > 0),
  duration_minutes INT NOT NULL CHECK (duration_minutes > 0),
  calories_burned INT NOT NULL CHECK (calories_burned >= 0),
  intensity TEXT NOT NULL DEFAULT 'moderate' CHECK (intensity IN ('low', 'moderate', 'high')),
  logged_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Efficient indexing for user date range queries (e.g. daily dashboard & weekly analytics)
CREATE INDEX IF NOT EXISTS idx_workout_logs_user_date ON public.workout_logs(user_id, logged_date);
CREATE INDEX IF NOT EXISTS idx_workout_logs_created_at ON public.workout_logs(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;

-- Grant permissions to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_logs TO authenticated;

-- RLS Policies
CREATE POLICY "Users can view own workout logs"
  ON public.workout_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workout logs"
  ON public.workout_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workout logs"
  ON public.workout_logs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own workout logs"
  ON public.workout_logs
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

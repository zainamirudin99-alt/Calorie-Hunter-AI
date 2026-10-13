-- ==============================================================================
-- CALORIE HUNTER AI — MIGRATION 0008: MEAL PLAN DAYS (PER-DAY UNIQUENESS)
-- Enforces strict uniqueness constraint: exactly one entry per (meal_plan_id, day_number).
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.meal_plan_days (
  meal_plan_id UUID NOT NULL REFERENCES public.meal_plans(id) ON DELETE CASCADE,
  day_number INT NOT NULL CHECK (day_number BETWEEN 1 AND 7),
  day_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (meal_plan_id, day_number)
);

CREATE INDEX IF NOT EXISTS idx_meal_plan_days_plan_id ON public.meal_plan_days(meal_plan_id);

-- Enable RLS
ALTER TABLE public.meal_plan_days ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view and manage meal plan days belonging to their programs
CREATE POLICY "Users can manage meal plan days for their programs"
  ON public.meal_plan_days
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.meal_plans
    JOIN public.programs ON programs.id = meal_plans.program_id
    WHERE meal_plans.id = meal_plan_days.meal_plan_id
    AND programs.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.meal_plans
    JOIN public.programs ON programs.id = meal_plans.program_id
    WHERE meal_plans.id = meal_plan_days.meal_plan_id
    AND programs.user_id = auth.uid()
  ));

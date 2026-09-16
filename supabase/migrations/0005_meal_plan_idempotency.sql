-- ==============================================================================
-- CALORIE HUNTER AI — MIGRATION 0005: MEAL PLAN IDEMPOTENCY CONSTRAINT
-- Enforces one primary active meal plan per program_id to prevent duplicate AI generations
-- ==============================================================================

-- 1. Deduplicate any existing meal_plans per program_id keeping the latest generated_at
DELETE FROM public.meal_plans a USING public.meal_plans b
WHERE a.program_id = b.program_id
  AND a.generated_at < b.generated_at;

-- 2. Create unique constraint/index on program_id so parallel inserts coalesce atomically
CREATE UNIQUE INDEX IF NOT EXISTS idx_meal_plans_program_id_unique 
ON public.meal_plans (program_id);

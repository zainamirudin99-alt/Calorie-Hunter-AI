-- ==============================================================================
-- CALORIE HUNTER AI — MIGRATION 0004: ATOMIC PROGRAM TRANSITION RPC
-- Guarantees atomic supersede of old active program and insertion of new program
-- preventing race conditions between concurrent sessions (mobile & desktop)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.switch_active_program(
  p_user_id UUID,
  p_tdee_base NUMERIC,
  p_program_type TEXT,
  p_target_daily_kcal NUMERIC,
  p_start_date TIMESTAMPTZ DEFAULT now(),
  p_end_date TIMESTAMPTZ DEFAULT (now() + INTERVAL '180 days')
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_program public.programs%ROWTYPE;
BEGIN
  -- 1. Explicitly acquire lock on existing active programs for this user to prevent concurrent race conditions
  PERFORM 1 FROM public.programs 
  WHERE user_id = p_user_id AND status = 'active'
  FOR UPDATE;

  -- 2. Mark any currently active programs as superseded
  UPDATE public.programs 
  SET status = 'superseded'
  WHERE user_id = p_user_id AND status = 'active';

  -- 3. Insert new program atomically
  INSERT INTO public.programs (
    user_id,
    tdee_base,
    program_type,
    target_daily_kcal,
    start_date,
    end_date,
    status
  )
  VALUES (
    p_user_id,
    p_tdee_base,
    p_program_type,
    p_target_daily_kcal,
    p_start_date,
    p_end_date,
    'active'
  )
  RETURNING * INTO v_new_program;

  -- 4. Return clean JSON of the active program
  RETURN to_jsonb(v_new_program);
EXCEPTION
  WHEN unique_violation THEN
    -- If concurrent race condition caught by partial unique index, return current active program
    SELECT * INTO v_new_program 
    FROM public.programs 
    WHERE user_id = p_user_id AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;
    RETURN to_jsonb(v_new_program);
END;
$$;

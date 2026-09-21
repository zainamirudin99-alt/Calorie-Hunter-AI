-- ==============================================================================
-- CALORIE HUNTER AI — SYSTEM KEEP-ALIVE & TELEMETRY LOGS (NON-INVASIVE)
-- Keeps Supabase project active to prevent free-tier 7-day inactivity pause.
-- Has zero impact on user data, programs, or UI.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.system_keep_alive_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL DEFAULT 'calorie-hunter-keepalive',
  status TEXT NOT NULL DEFAULT 'alive',
  ping_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  details JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_keep_alive_ping_timestamp 
ON public.system_keep_alive_logs (ping_timestamp DESC);

-- Enable RLS: Keep strictly private to service_role (invisible to public clients)
ALTER TABLE public.system_keep_alive_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access to keep-alive logs"
  ON public.system_keep_alive_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

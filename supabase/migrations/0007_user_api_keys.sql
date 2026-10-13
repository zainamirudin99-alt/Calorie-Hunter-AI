-- ==============================================================================
-- CALORIE HUNTER AI — MIGRATION 0007: BYOK USER API KEYS TABLE & SECURITY
-- Invariant: Key raw secrets are NEVER readable by client/authenticated roles.
-- Only server route handlers via service_role admin client can decrypt and access keys.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.user_api_keys (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT CHECK (provider IN ('gemini', 'openai', 'deepseek', 'groq')),
  key_enc TEXT NOT NULL,
  key_version INT NOT NULL DEFAULT 1,
  key_last4 TEXT NOT NULL,
  base_url TEXT NULL,
  status TEXT NOT NULL DEFAULT 'unverified' CHECK (status IN ('valid', 'invalid', 'unverified')),
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id ON public.user_api_keys(user_id);

-- Enable RLS
ALTER TABLE public.user_api_keys ENABLE ROW LEVEL SECURITY;

-- Revoke all direct table permissions from anon and authenticated
REVOKE ALL ON public.user_api_keys FROM anon;
REVOKE ALL ON public.user_api_keys FROM authenticated;

-- Grant selective column permissions to authenticated role (excluding key_enc)
GRANT SELECT (
  user_id,
  provider,
  key_version,
  key_last4,
  base_url,
  status,
  last_checked_at,
  created_at,
  updated_at
) ON public.user_api_keys TO authenticated;

-- RLS Policy: Authenticated users can only read their own non-secret metadata
CREATE POLICY "Users can view own api keys metadata"
  ON public.user_api_keys
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policy: Authenticated users can delete their own keys
CREATE POLICY "Users can delete own api keys"
  ON public.user_api_keys
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ==============================================================================
-- VERIFICATION TEST QUERIES AS AUTHENTICATED ROLE:
--
-- Test 1 (LULUS): Membaca metadata aman:
-- SET ROLE authenticated;
-- SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
-- SELECT provider, key_last4, status, base_url, updated_at FROM public.user_api_keys;
-- => Hasil: Query berhasil mengeksekusi dan mengembalikan baris milik user.
--
-- Test 2 (DITOLAK): Mencoba mengekstrak ciphertext rahasia:
-- SELECT key_enc FROM public.user_api_keys;
-- => Hasil: ERROR: permission denied for column key_enc of relation user_api_keys
-- ==============================================================================

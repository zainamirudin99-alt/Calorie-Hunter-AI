import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

/**
 * Browser-side Supabase client for authenticated user operations.
 * Bound to RLS policies via auth.uid().
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

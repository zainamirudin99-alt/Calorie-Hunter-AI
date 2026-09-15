import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-role-key";

/**
 * ADR-1: Generates deterministic synthetic email from username:
 * {username_lowercase}@chai.local
 */
export function getSyntheticEmail(username: string): string {
  const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
  return `${cleanUsername}@chai.local`;
}

/**
 * Server-side Supabase Admin Client using service_role key.
 * Used exclusively for administrative operations such as registering synthetic emails
 * and executing background cron jobs. Never expose to client!
 */
export function createAdminClient() {
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Creates a server-side Supabase client for Route Handlers acting on behalf of a user.
 * Reads Authorization header (Bearer token) if present to enforce RLS.
 */
export function createServerClient(req?: Request) {
  let token: string | undefined;
  const headers: Record<string, string> = {};
  
  if (req) {
    const authHeader = req.headers.get("authorization");
    if (authHeader) {
      token = authHeader.replace(/^Bearer\s+/i, "").trim();
      headers["Authorization"] = authHeader;
    } else {
      const cookieHeader = req.headers.get("cookie");
      if (cookieHeader) {
        const match = cookieHeader.match(/(?:^|;\s*)chai_auth_token=([^;]+)/);
        if (match && match[1]) {
          token = decodeURIComponent(match[1]).trim();
          headers["Authorization"] = `Bearer ${token}`;
        }
      }
    }
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers,
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
    },
  });

  // Automatically pass token to getUser() so it validates directly against Supabase Auth
  const originalGetUser = client.auth.getUser.bind(client.auth);
  client.auth.getUser = (jwt?: string) => {
    return originalGetUser(jwt || token);
  };

  return client;
}

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env["VITE_SUPABASE_URL"] ??
  process.env["SUPABASE_URL"] ??
  "https://placeholder.supabase.co";

const SUPABASE_ANON_KEY =
  process.env["VITE_SUPABASE_ANON_KEY"] ??
  process.env["SUPABASE_ANON_KEY"] ??
  "placeholder-anon-key";

const SUPABASE_SERVICE_KEY =
  process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "placeholder-service-key";

export function createSupabaseClient(accessToken?: string) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
  });
}

export function createAdminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

export { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY };

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    import.meta.env.VITE_SUPABASE_URL ?? "https://placeholder.supabase.co",
    import.meta.env.VITE_SUPABASE_ANON_KEY ?? "placeholder-anon-key"
  );
}

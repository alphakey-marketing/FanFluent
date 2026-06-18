import { createBrowserClient } from "@supabase/ssr";
import { createMockClient, installMockApi } from "./mock";

// When no real Supabase credentials are configured (local preview), fall back to
// a local mock client so the app is fully browsable without a backend.
// Log in with any email + password. See ./mock.ts for tier rules.
const hasRealConfig =
  !!import.meta.env.VITE_SUPABASE_URL &&
  !!import.meta.env.VITE_SUPABASE_ANON_KEY &&
  !import.meta.env.VITE_SUPABASE_URL.includes("placeholder");

export function createClient() {
  if (!hasRealConfig) {
    installMockApi();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return createMockClient() as any;
  }
  return createBrowserClient(
    import.meta.env.VITE_SUPABASE_URL ?? "https://placeholder.supabase.co",
    import.meta.env.VITE_SUPABASE_ANON_KEY ?? "placeholder-anon-key"
  );
}

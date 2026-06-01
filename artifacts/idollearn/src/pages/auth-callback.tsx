import { useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const [, navigate] = useLocation();
  const search = useSearch();

  useEffect(() => {
    const params = new URLSearchParams(search);
    const code = params.get("code");
    const next = params.get("next") ?? "/feed";

    if (code) {
      const supabase = createClient();
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (!error) {
          navigate(next);
        } else {
          navigate("/auth/login?error=auth_callback_failed");
        }
      });
    } else {
      navigate("/auth/login?error=auth_callback_failed");
    }
  }, [navigate, search]);

  return (
    <div className="flex min-h-screen items-center justify-center text-gray-400">
      驗證中…
    </div>
  );
}

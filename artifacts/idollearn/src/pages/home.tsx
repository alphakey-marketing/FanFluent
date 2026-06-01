import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const [, navigate] = useLocation();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/feed");
      } else {
        setChecking(false);
      }
    });
  }, [navigate]);

  if (checking) return null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="max-w-md space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-[#01696f]">IdolLearn</h1>
          <p className="text-gray-600">
            透過武田航平的社群貼文，輕鬆學習日語
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <Link href="/auth/login">登入 / 加入</Link>
          </Button>
        </div>
        <p className="text-xs text-gray-400">私人 Beta 版。僅限邀請用戶。</p>
      </div>
    </main>
  );
}

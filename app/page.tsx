import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    redirect("/feed");
  }

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

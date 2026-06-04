import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Lock, Star, Zap } from "lucide-react";

export default function UpgradePage() {
  const [, navigate] = useLocation();
  const [checkoutLinks, setCheckoutLinks] = useState<{ pro: string | null; max: string | null }>({
    pro: null,
    max: null,
  });
  const [loading, setLoading] = useState(true);
  const isMock = !checkoutLinks.pro && !checkoutLinks.max && !loading;

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth/login");
        return;
      }

      const linksRes = await fetch("/api/checkout-links");
      if (!cancelled && linksRes.ok) {
        const links = await linksRes.json();
        setCheckoutLinks(links);
      }
      if (!cancelled) setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-400">
        載入中…
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/feed">← 返回</Link>
          </Button>
          <h1 className="font-bold text-[#01696f]">升級方案</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10 space-y-8">
        {/* Hero */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#01696f]/10 mb-2">
            <Lock className="h-7 w-7 text-[#01696f]" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">解鎖完整解析</h2>
          <p className="text-gray-500 text-sm max-w-sm mx-auto">
            升級即可查看每篇貼文的詞彙、文化典故與文法完整分析，讓你在追星的同時真正學好日語。
          </p>
        </div>

        {isMock && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            🚧 <strong>UAT 模式</strong>｜付款連結尚未設定。以下為示意版面，點擊按鈕不會進行實際交易。
          </div>
        )}

        {/* Pricing cards */}
        <div className="grid sm:grid-cols-2 gap-4">
          {/* Pro */}
          <div className="rounded-xl border border-[#01696f]/30 bg-[#f7f6f2] p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-[#01696f]" />
              <span className="font-semibold text-[#01696f]">Pro Membership</span>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed flex-1">
              Unlock the full FanFluent experience. Get unlimited access to
              fan-powered language lessons, expanded vocabulary packs, and
              ad-free learning — all designed around the content you love.
            </p>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>✅ 完整詞彙解析</li>
              <li>✅ 文化典故說明</li>
              <li>✅ 文法重點解析</li>
              <li>✅ 無廣告體驗</li>
            </ul>
            {checkoutLinks.pro ? (
              <Button
                asChild
                className="bg-[#01696f] hover:bg-[#01696f]/90 text-white w-full"
              >
                <a href={checkoutLinks.pro} target="_blank" rel="noopener noreferrer">
                  月費訂閱
                </a>
              </Button>
            ) : (
              <Button
                disabled
                className="bg-[#01696f]/50 text-white w-full cursor-not-allowed"
              >
                月費訂閱（即將開放）
              </Button>
            )}
          </div>

          {/* MAX */}
          <div className="rounded-xl border-2 border-[#01696f] bg-[#01696f]/5 p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-[#01696f]" />
              <span className="font-semibold text-[#01696f]">MAX Membership</span>
              <span className="ml-auto text-xs bg-[#01696f] text-white px-2 py-0.5 rounded-full">
                最超值
              </span>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed flex-1">
              The ultimate FanFluent membership. Get everything in Pro, plus
              early access to new content, advanced grammar deep-dives,
              community challenges, and direct access to native speaker sessions.
            </p>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>✅ Pro 所有功能</li>
              <li>✅ 搶先閱讀新內容</li>
              <li>✅ 進階文法深度解析</li>
              <li>✅ 社群挑戰與母語者交流</li>
            </ul>
            {checkoutLinks.max ? (
              <Button
                asChild
                className="bg-[#01696f] hover:bg-[#01696f]/90 text-white w-full"
              >
                <a href={checkoutLinks.max} target="_blank" rel="noopener noreferrer">
                  終身購買
                </a>
              </Button>
            ) : (
              <Button
                disabled
                className="bg-[#01696f]/50 text-white w-full cursor-not-allowed"
              >
                終身購買（即將開放）
              </Button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400">
          付款由 Lemon Squeezy 安全處理，隨時可取消訂閱。
        </p>
      </main>
    </div>
  );
}

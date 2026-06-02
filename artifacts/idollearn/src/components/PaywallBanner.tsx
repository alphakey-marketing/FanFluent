import { Button } from "@/components/ui/button";
import { Lock, Star, Zap } from "lucide-react";

interface PaywallBannerProps {
  monthlyUrl: string;
  lifetimeUrl: string;
}

export default function PaywallBanner({
  monthlyUrl,
  lifetimeUrl,
}: PaywallBannerProps) {
  return (
    <div className="rounded-xl border-2 border-[#01696f]/20 bg-white p-6 flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-[#01696f]/10 flex items-center justify-center shrink-0">
          <Lock className="h-5 w-5 text-[#01696f]" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">解鎖完整解析</h3>
          <p className="text-gray-500 text-sm">升級即可查看詞彙、文化與文法完整分析</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {/* Pro Membership */}
        <div className="rounded-lg border border-[#01696f]/30 bg-[#f7f6f2] p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-[#01696f]" />
            <span className="font-semibold text-[#01696f] text-sm">Pro Membership</span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            Unlock the full FanFluent experience. Get unlimited access to fan-powered language lessons, expanded vocabulary packs, and ad-free learning — all designed around the content you love.
          </p>
          <Button asChild className="mt-auto bg-[#01696f] hover:bg-[#01696f]/90 text-white w-full">
            <a href={monthlyUrl} target="_blank" rel="noopener noreferrer">
              月費訂閱
            </a>
          </Button>
        </div>

        {/* MAX Membership */}
        <div className="rounded-lg border-2 border-[#01696f] bg-[#01696f]/5 p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-[#01696f]" />
            <span className="font-semibold text-[#01696f] text-sm">MAX Membership</span>
            <span className="ml-auto text-xs bg-[#01696f] text-white px-2 py-0.5 rounded-full">最超值</span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            The ultimate FanFluent membership. Get everything in Pro, plus early access to new content, advanced grammar deep-dives, community challenges, and direct access to native speaker sessions.
          </p>
          <Button asChild className="mt-auto bg-[#01696f] hover:bg-[#01696f]/90 text-white w-full">
            <a href={lifetimeUrl} target="_blank" rel="noopener noreferrer">
              終身購買
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}

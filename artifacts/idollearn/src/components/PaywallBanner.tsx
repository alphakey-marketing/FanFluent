import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

interface PaywallBannerProps {
  monthlyUrl: string;
  lifetimeUrl: string;
}

export default function PaywallBanner({
  monthlyUrl,
  lifetimeUrl,
}: PaywallBannerProps) {
  return (
    <div className="rounded-xl border-2 border-dashed border-[#01696f]/30 bg-[#f7f6f2] p-6 text-center flex flex-col items-center gap-4">
      <div className="h-12 w-12 rounded-full bg-[#01696f]/10 flex items-center justify-center">
        <Lock className="h-6 w-6 text-[#01696f]" />
      </div>
      <div>
        <h3 className="font-semibold text-gray-900 text-lg">解鎖完整解析</h3>
        <p className="text-gray-500 text-sm mt-1">
          升級即可查看詞彙、文化與文法完整分析
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
        <Button asChild variant="default">
          <a href={monthlyUrl} target="_blank" rel="noopener noreferrer">
            月費訂閱 HKD 38/月
          </a>
        </Button>
        <Button asChild variant="outline">
          <a href={lifetimeUrl} target="_blank" rel="noopener noreferrer">
            終身購買 HKD 188
          </a>
        </Button>
      </div>
    </div>
  );
}

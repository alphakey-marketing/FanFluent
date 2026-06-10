import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MosaicOverlayProps {
  children: React.ReactNode;
  /** LemonSqueezy Pro checkout URL */
  proUrl: string | null;
  /** LemonSqueezy Max checkout URL */
  maxUrl: string | null;
}

/**
 * Wraps content with a blur/mosaic effect and an upgrade CTA overlay.
 * Used to tease paid content to free-tier users.
 */
export default function MosaicOverlay({ children, proUrl, maxUrl }: MosaicOverlayProps) {
  const upgradeUrl = proUrl ?? maxUrl ?? "/";

  return (
    <div className="relative rounded-xl overflow-hidden">
      {/* Blurred content — non-interactive for free users */}
      <div
        className="blur-sm select-none pointer-events-none"
        aria-hidden="true"
      >
        {children}
      </div>

      {/* Gradient + CTA overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-end bg-gradient-to-b from-transparent via-white/60 to-white/95 pb-6 px-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-1.5 text-gray-500 text-sm">
            <Lock className="h-4 w-4" />
            <span>升級解鎖完整內容</span>
          </div>
          <Button
            size="sm"
            className="bg-[#01696f] hover:bg-[#015a5f] text-white"
            onClick={() => window.open(upgradeUrl, "_blank", "noopener,noreferrer")}
          >
            立即升級 Pro
          </Button>
        </div>
      </div>
    </div>
  );
}

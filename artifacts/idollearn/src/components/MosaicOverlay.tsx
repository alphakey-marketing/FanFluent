import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MosaicOverlayProps {
  children: React.ReactNode;
  /** LemonSqueezy Pro checkout URL */
  proUrl: string | null;
  /** LemonSqueezy Max checkout URL */
  maxUrl: string | null;
  /**
   * Fraction of the content (0–1) revealed clearly at the top. The rest is
   * mosaiced regardless of how long or short the content is, so at least
   * `1 - revealRatio` is always hidden — even for a single sentence.
   */
  revealRatio?: number;
  /** Max rendered height; taller content is clipped so the block stays compact. */
  maxHeightPx?: number;
}

/**
 * Teases paid content to free-tier users. The top `revealRatio` of the block is
 * shown clearly; everything below a hard boundary is covered by a heavily
 * blurred, washed-out copy that is impossible to read (no legible gradient
 * fade). An upgrade CTA is pinned to the bottom.
 *
 * Because the reveal is a fraction of the content height, the majority is always
 * hidden no matter the content length. The DOM also only contains the backend's
 * truncated teaser payload, so nothing extra leaks via copy/paste.
 */
export default function MosaicOverlay({
  children,
  proUrl,
  maxUrl,
  revealRatio = 0.35,
  maxHeightPx = 260,
}: MosaicOverlayProps) {
  const upgradeUrl = proUrl ?? maxUrl ?? "/";
  const pct = Math.round(revealRatio * 100);
  // Hard boundary at pct%: clear layer shows only the top, blur layer only the rest.
  const clearMask = `linear-gradient(to bottom, black ${pct}%, transparent ${pct}%)`;
  const blurMask = `linear-gradient(to bottom, transparent ${pct}%, black ${pct}%)`;

  return (
    <div
      className="relative rounded-xl overflow-hidden"
      style={{ maxHeight: maxHeightPx }}
    >
      {/* Clear layer — only the top `pct%` is painted (hard cut, no fade) */}
      <div
        className="select-none"
        style={{ maskImage: clearMask, WebkitMaskImage: clearMask }}
      >
        {children}
      </div>

      {/* Mosaic layer — covers everything below the boundary, heavily blurred
          and washed out so the text underneath is unreadable */}
      <div
        aria-hidden="true"
        className="absolute inset-0 select-none pointer-events-none"
        style={{ maskImage: blurMask, WebkitMaskImage: blurMask }}
      >
        <div style={{ filter: "blur(14px) saturate(0.6)" }}>{children}</div>
        <div className="absolute inset-0 bg-white/55" />
      </div>

      {/* CTA pinned to the bottom */}
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-end pt-12 pb-4 px-4 bg-gradient-to-b from-transparent to-white/95">
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

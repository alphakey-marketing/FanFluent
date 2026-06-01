import { createServerClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import VocabBreakdown from "@/components/VocabBreakdown";
import CultureNote from "@/components/CultureNote";
import GrammarHighlight from "@/components/GrammarHighlight";
import PaywallBanner from "@/components/PaywallBanner";
import { formatDate } from "@/lib/utils";
import type { Post, PostAnalysis, UserTier } from "@/types";
import {
  getMonthlyCheckoutUrl,
  getLifetimeCheckoutUrl,
} from "@/lib/lemonsqueezy/client";

export const dynamic = "force-dynamic";

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("tier")
    .eq("id", user.id)
    .single();

  const userTier: UserTier = (profile?.tier as UserTier) ?? "free";
  const isPaid = userTier === "paid" || userTier === "admin";

  const { data: post } = await supabase
    .from("posts")
    .select("*")
    .eq("id", id)
    .eq("status", "published")
    .single();

  if (!post) notFound();

  const { data: analysis } = await supabase
    .from("post_analysis")
    .select("*")
    .eq("post_id", id)
    .single();

  const typedPost = post as Post;
  const typedAnalysis = analysis as PostAnalysis | null;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/feed">← 返回</Link>
          </Button>
          <h1 className="font-bold text-[#01696f]">武田航平</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Original post */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 space-y-3">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="font-medium text-gray-600">
              {typedPost.source_platform === "x" ? "𝕏" : "Instagram"}
            </span>
            <span>·</span>
            <span>{formatDate(typedPost.post_date)}</span>
            {typedPost.source_url && (
              <>
                <span>·</span>
                <a
                  href={typedPost.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#01696f] underline"
                >
                  原文連結
                </a>
              </>
            )}
          </div>
          {typedPost.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={typedPost.image_url}
              alt="Post image"
              className="rounded-lg w-full object-cover max-h-80"
            />
          )}
          <p className="font-japanese text-lg leading-relaxed whitespace-pre-wrap text-gray-900">
            {typedPost.original_text}
          </p>
        </section>

        {/* Summary (free) */}
        {typedAnalysis?.summary && (
          <section className="rounded-xl border border-gray-200 bg-[#f7f6f2] p-5">
            <h2 className="text-xs font-semibold text-[#01696f] mb-2 uppercase tracking-wide">
              AI 摘要
            </h2>
            <p className="text-gray-700 text-sm">{typedAnalysis.summary}</p>
          </section>
        )}

        {/* Paid content */}
        {isPaid && typedAnalysis ? (
          <>
            {typedAnalysis.full_translation && (
              <section className="rounded-xl border border-gray-200 bg-white p-5">
                <h2 className="text-xs font-semibold text-[#01696f] mb-2 uppercase tracking-wide">
                  完整翻譯
                </h2>
                <p className="text-gray-800 leading-relaxed">
                  {typedAnalysis.full_translation}
                </p>
              </section>
            )}

            {typedAnalysis.vocab_breakdown &&
              typedAnalysis.vocab_breakdown.length > 0 && (
                <VocabBreakdown vocab={typedAnalysis.vocab_breakdown} />
              )}

            {typedAnalysis.culture_notes && (
              <CultureNote notes={typedAnalysis.culture_notes} />
            )}

            {typedAnalysis.grammar_notes && (
              <GrammarHighlight
                grammarNotes={typedAnalysis.grammar_notes}
                languageOrigin={typedAnalysis.language_origin}
              />
            )}
          </>
        ) : (
          !isPaid && (
            <PaywallBanner
              monthlyUrl={getMonthlyCheckoutUrl()}
              lifetimeUrl={getLifetimeCheckoutUrl()}
            />
          )
        )}
      </main>
    </div>
  );
}

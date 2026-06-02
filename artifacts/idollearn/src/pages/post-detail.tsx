import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { createClient } from "@/lib/supabase/client";
import { authedFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import VocabBreakdown from "@/components/VocabBreakdown";
import CultureNote from "@/components/CultureNote";
import GrammarHighlight from "@/components/GrammarHighlight";
import PaywallBanner from "@/components/PaywallBanner";
import { formatDate } from "@/lib/utils";
import type { Post, PostAnalysis, UserTier } from "@/types";

const MONTHLY_URL =
  "https://fanfluent.lemonsqueezy.com/checkout/buy/" +
  (import.meta.env.VITE_LEMONSQUEEZY_MONTHLY_VARIANT_ID ?? "");
const LIFETIME_URL =
  "https://fanfluent.lemonsqueezy.com/checkout/buy/" +
  (import.meta.env.VITE_LEMONSQUEEZY_LIFETIME_VARIANT_ID ?? "");

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [post, setPost] = useState<Post | null>(null);
  const [analysis, setAnalysis] = useState<PostAnalysis | null>(null);
  const [userTier, setUserTier] = useState<UserTier>("free");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth/login"); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("tier")
        .eq("id", user.id)
        .single();

      const tier: UserTier = (profile?.tier as UserTier) ?? "free";
      if (!cancelled) setUserTier(tier);

      const { data: postData } = await supabase
        .from("posts")
        .select("*")
        .eq("id", id)
        .eq("status", "published")
        .single();

      if (!postData) {
        if (!cancelled) setNotFound(true);
        return;
      }
      if (!cancelled) setPost(postData as Post);

      // Fetch analysis server-side so tier-gating is enforced on the backend
      const res = await authedFetch(`/api/post-analysis/${id}`);
      if (!cancelled) {
        if (res.ok) {
          const data = await res.json();
          setAnalysis(data as PostAnalysis);
        }
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [id, navigate]);

  if (loading && !notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-400">
        載入中…
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-400">
        貼文不存在
      </div>
    );
  }

  const isPaid = userTier === "paid" || userTier === "admin";

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
              {post.source_platform === "x" ? "𝕏" : "Instagram"}
            </span>
            <span>·</span>
            <span>{formatDate(post.post_date)}</span>
            {post.source_url && (
              <>
                <span>·</span>
                <a
                  href={post.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#01696f] underline"
                >
                  原文連結
                </a>
              </>
            )}
          </div>
          {post.image_url && (
            <img
              src={post.image_url}
              alt="Post image"
              className="rounded-lg w-full object-cover max-h-80"
            />
          )}
          <p className="font-japanese text-lg leading-relaxed whitespace-pre-wrap text-gray-900">
            {post.original_text}
          </p>
        </section>

        {/* Summary (always shown if available — server returns summary-only for free tier) */}
        {analysis?.summary && (
          <section className="rounded-xl border border-gray-200 bg-[#f7f6f2] p-5">
            <h2 className="text-xs font-semibold text-[#01696f] mb-2 uppercase tracking-wide">
              AI 摘要
            </h2>
            <p className="text-gray-700 text-sm">{analysis.summary}</p>
          </section>
        )}

        {/* Paid content — only present in API response for paid/admin tier */}
        {isPaid && analysis ? (
          <>
            {analysis.full_translation && (
              <section className="rounded-xl border border-gray-200 bg-white p-5">
                <h2 className="text-xs font-semibold text-[#01696f] mb-2 uppercase tracking-wide">
                  完整翻譯
                </h2>
                <p className="text-gray-800 leading-relaxed">
                  {analysis.full_translation}
                </p>
              </section>
            )}

            {analysis.vocab_breakdown && analysis.vocab_breakdown.length > 0 && (
              <VocabBreakdown vocab={analysis.vocab_breakdown} />
            )}

            {analysis.culture_notes && (
              <CultureNote notes={analysis.culture_notes} />
            )}

            {analysis.grammar_notes && (
              <GrammarHighlight
                grammarNotes={analysis.grammar_notes}
                languageOrigin={analysis.language_origin ?? null}
              />
            )}
          </>
        ) : (
          !isPaid && (
            <PaywallBanner
              monthlyUrl={MONTHLY_URL}
              lifetimeUrl={LIFETIME_URL}
            />
          )
        )}
      </main>
    </div>
  );
}

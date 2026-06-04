import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { createClient } from "@/lib/supabase/client";
import { authedFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import VocabBreakdown from "@/components/VocabBreakdown";
import CultureNote from "@/components/CultureNote";
import GrammarHighlight from "@/components/GrammarHighlight";
import PaywallBanner from "@/components/PaywallBanner";
import QuotedPost from "@/components/QuotedPost";
import { formatDate } from "@/lib/utils";
import { Repeat2, Quote, Reply } from "lucide-react";
import type { Post, PostAnalysis, PostType, UserTier } from "@/types";

const POST_TYPE_LABEL: Record<PostType, { label: string; icon: React.ReactNode } | null> = {
  post: null,
  reply: { label: "回覆", icon: <Reply className="h-3.5 w-3.5" /> },
  retweet: { label: "轉發", icon: <Repeat2 className="h-3.5 w-3.5" /> },
  quote_repost: { label: "引用轉發", icon: <Quote className="h-3.5 w-3.5" /> },
};

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [post, setPost] = useState<Post | null>(null);
  const [analysis, setAnalysis] = useState<PostAnalysis | null>(null);
  const [userTier, setUserTier] = useState<UserTier>("free");
  const [checkoutLinks, setCheckoutLinks] = useState<{ pro: string | null; max: string | null }>({ pro: null, max: null });
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth/login"); return; }

      const [profileRes, postRes, linksRes] = await Promise.all([
        supabase.from("profiles").select("tier").eq("id", user.id).single(),
        supabase.from("posts").select("*").eq("id", id).eq("status", "published").single(),
        fetch("/api/checkout-links"),
      ]);

      if (cancelled) return;

      const tier: UserTier = (profileRes.data?.tier as UserTier) ?? "free";
      setUserTier(tier);

      if (linksRes.ok) {
        const links = await linksRes.json();
        setCheckoutLinks(links);
      }

      if (!postRes.data) { setNotFound(true); return; }
      setPost(postRes.data as Post);

      // Pure retweets have no AI analysis
      if ((postRes.data as Post).post_type === "retweet") {
        if (!cancelled) setLoading(false);
        return;
      }

      // Fetch analysis server-side so tier-gating is enforced on the backend
      const analysisRes = await authedFetch(`/api/post-analysis/${id}`);
      if (!cancelled) {
        if (analysisRes.ok) {
          const data = await analysisRes.json();
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
  const isRetweet = (post.post_type ?? "post") === "retweet";
  const postTypeInfo = POST_TYPE_LABEL[post.post_type ?? "post"];

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
          <div className="flex items-center gap-2 text-xs text-gray-400 flex-wrap">
            <span className="font-medium text-gray-600">
              {post.source_platform === "x" ? "𝕏" : "Instagram"}
            </span>
            {postTypeInfo && (
              <>
                <span>·</span>
                <Badge
                  variant="outline"
                  className="flex items-center gap-1 text-xs py-0 h-5"
                >
                  {postTypeInfo.icon}
                  {postTypeInfo.label}
                </Badge>
              </>
            )}
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
          {/* Idol's own text — absent for pure retweets */}
          {post.original_text && (
            <p className="font-japanese text-lg leading-relaxed whitespace-pre-wrap text-gray-900">
              {post.original_text}
            </p>
          )}
          {/* Quoted / retweeted post block */}
          {post.retweeted_text && (
            <QuotedPost
              retweeted_text={post.retweeted_text}
              retweeted_author={post.retweeted_author}
              retweeted_url={post.retweeted_url}
              retweeted_translation={post.retweeted_translation}
            />
          )}
        </section>

        {/* Pure retweet: show the TC translation prominently */}
        {isRetweet && post.retweeted_translation && (
          <section className="rounded-xl border border-gray-200 bg-[#f7f6f2] p-5">
            <h2 className="text-xs font-semibold text-[#01696f] mb-2 uppercase tracking-wide">
              中文翻譯
            </h2>
            <p className="text-gray-700 text-sm leading-relaxed">
              {post.retweeted_translation}
            </p>
          </section>
        )}

        {/* Summary — always shown for analysable posts; server returns summary-only for free tier */}
        {!isRetweet && analysis?.summary && (
          <section className="rounded-xl border border-gray-200 bg-[#f7f6f2] p-5">
            <h2 className="text-xs font-semibold text-[#01696f] mb-2 uppercase tracking-wide">
              AI 摘要
            </h2>
            <p className="text-gray-700 text-sm">{analysis.summary}</p>
          </section>
        )}

        {/* Paid content — only present in API response for paid/admin tier */}
        {!isRetweet && isPaid && analysis ? (
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
          !isRetweet && !isPaid && (
            <PaywallBanner
              proUrl={checkoutLinks.pro}
              maxUrl={checkoutLinks.max}
            />
          )
        )}
      </main>
    </div>
  );
}

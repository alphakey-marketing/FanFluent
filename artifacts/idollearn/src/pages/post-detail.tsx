import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { createClient } from "@/lib/supabase/client";
import { authedFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import VocabBreakdown from "@/components/VocabBreakdown";
import CultureNote from "@/components/CultureNote";
import GrammarHighlight from "@/components/GrammarHighlight";
import MosaicOverlay from "@/components/MosaicOverlay";
import QuotedPost from "@/components/QuotedPost";
import { formatDate } from "@/lib/utils";
import { Repeat2, Quote, Reply } from "lucide-react";
import type { Post, PostAnalysis, TeaserAnalysis, PostType, UserTier } from "@/types";

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
  const [analysis, setAnalysis] = useState<PostAnalysis | TeaserAnalysis | null>(null);
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
          setAnalysis(data as PostAnalysis | TeaserAnalysis);
        }
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [id, navigate]);

  if (loading && !notFound) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">載入中…</p>
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">貼文不存在</p>
      </div>
    );
  }

  const isPaid = userTier === "paid" || userTier === "admin";
  const isPreview = !isPaid && analysis != null && "is_preview" in analysis && analysis.is_preview === true;
  const isRetweet = (post.post_type ?? "post") === "retweet";
  const postTypeInfo = POST_TYPE_LABEL[post.post_type ?? "post"];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/">← 返回</Link>
        </Button>
      </div>

      <h1 className="text-2xl font-bold">武田航平</h1>

      {/* Original post */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <Badge variant="outline" className={post.source_platform === "x" ? "border-gray-900 text-gray-900" : "border-pink-500 text-pink-600"}>
            {post.source_platform === "x" ? "𝕏" : "Instagram"}
          </Badge>
          {postTypeInfo && (
            <>
              <span>·</span>
              <Badge variant="outline" className="flex items-center gap-1">
                {postTypeInfo.icon} {postTypeInfo.label}
              </Badge>
            </>
          )}
          <span>·</span>
          <span>{formatDate(post.post_date)}</span>
          {post.source_url && (
            <>
              <span>·</span>
              <a href={post.source_url} target="_blank" rel="noopener noreferrer" className="underline">原文連結</a>
            </>
          )}
        </div>

        {post.image_url && (
          <img src={post.image_url} alt="Post image" className="rounded-lg max-w-full" />
        )}
        {/* Idol's own text — absent for pure retweets */}
        {post.original_text && (
          <p className="text-gray-900 whitespace-pre-wrap">{post.original_text}</p>
        )}
        {/* Quoted / retweeted post block */}
        {post.retweeted_text && (
          <QuotedPost
            text={post.retweeted_text}
            author={post.retweeted_author}
            url={post.retweeted_url}
            translation={post.retweeted_translation}
          />
        )}
      </div>

      {/* Pure retweet: show the TC translation prominently */}
      {isRetweet && post.retweeted_translation && (
        <div className="rounded-xl border p-4 space-y-2">
          <h2 className="text-sm font-semibold text-gray-700">中文翻譯</h2>
          <p className="text-gray-800 whitespace-pre-wrap">{post.retweeted_translation}</p>
        </div>
      )}

      {/* Summary — always shown for analysable posts */}
      {!isRetweet && analysis?.summary && (
        <div className="rounded-xl border p-4 space-y-2">
          <h2 className="text-sm font-semibold text-gray-700">AI 摘要</h2>
          <p className="text-gray-800">{analysis.summary}</p>
        </div>
      )}

      {/* Full translation */}
      {!isRetweet && analysis && "full_translation" in analysis && analysis.full_translation && (
        isPaid ? (
          <div className="rounded-xl border p-4 space-y-2">
            <h2 className="text-sm font-semibold text-gray-700">完整翻譯</h2>
            <p className="text-gray-800 whitespace-pre-wrap">{analysis.full_translation}</p>
          </div>
        ) : isPreview ? (
          <MosaicOverlay proUrl={checkoutLinks.pro} maxUrl={checkoutLinks.max}>
            <div className="rounded-xl border p-4 space-y-2">
              <h2 className="text-sm font-semibold text-gray-700">完整翻譯</h2>
              <p className="text-gray-800 whitespace-pre-wrap">{analysis.full_translation}</p>
            </div>
          </MosaicOverlay>
        ) : null
      )}

      {/* Vocab breakdown */}
      {!isRetweet && analysis && "vocab_breakdown" in analysis && analysis.vocab_breakdown && analysis.vocab_breakdown.length > 0 && (
        isPaid ? (
          <VocabBreakdown vocab={analysis.vocab_breakdown} />
        ) : isPreview ? (
          <MosaicOverlay proUrl={checkoutLinks.pro} maxUrl={checkoutLinks.max}>
            <VocabBreakdown vocab={analysis.vocab_breakdown} />
          </MosaicOverlay>
        ) : null
      )}

      {/* Grammar & Culture — hint labels for free users, full content for paid */}
      {!isRetweet && isPaid && analysis && "grammar_notes" in analysis && analysis.grammar_notes && (
        <GrammarHighlight notes={analysis.grammar_notes} />
      )}
      {!isRetweet && isPaid && analysis && "culture_notes" in analysis && analysis.culture_notes && (
        <CultureNote notes={analysis.culture_notes} />
      )}
      {!isRetweet && !isPaid && (
        <div className="rounded-xl border border-dashed border-gray-300 p-5 text-center text-gray-400 text-sm">
          🔒 文法解析 &amp; 文化背景說明（升級後解鎖）
        </div>
      )}
    </div>
  );
}

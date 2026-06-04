import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { authedFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PostCard from "@/components/PostCard";
import VocabBreakdown from "@/components/VocabBreakdown";
import CultureNote from "@/components/CultureNote";
import GrammarHighlight from "@/components/GrammarHighlight";
import QuotedPost from "@/components/QuotedPost";
import { formatDate } from "@/lib/utils";
import { Repeat2, Quote, Reply } from "lucide-react";
import type { Post, PostAnalysis, PostType } from "@/types";

const POST_TYPE_LABEL: Record<PostType, { label: string; icon: React.ReactNode } | null> = {
  post: null,
  reply: { label: "回覆", icon: <Reply className="h-3.5 w-3.5" /> },
  retweet: { label: "轉發", icon: <Repeat2 className="h-3.5 w-3.5" /> },
  quote_repost: { label: "引用轉發", icon: <Quote className="h-3.5 w-3.5" /> },
};

export default function AdminPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [post, setPost] = useState<Post | null>(null);
  const [analysis, setAnalysis] = useState<PostAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    authedFetch(`/api/admin/posts/${id}`).then(async (res) => {
      if (cancelled) return;
      if (res.status === 401 || res.status === 403) {
        navigate("/feed");
        return;
      }
      if (!res.ok) { setNotFound(true); setLoading(false); return; }
      const data = await res.json() as { post: Post; analysis: PostAnalysis | null };
      if (!cancelled) {
        setPost(data.post);
        setAnalysis(data.analysis);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [id, navigate]);

  if (loading) {
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

  const isRetweet = post.post_type === "retweet";
  const postTypeInfo = POST_TYPE_LABEL[post.post_type ?? "post"];

  return (
    <div className="min-h-screen bg-[#f7f6f2]">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin">← 返回管理後台</Link>
            </Button>
            <span className="text-gray-300">|</span>
            <h1 className="font-bold text-[#01696f]">貼文預覽</h1>
            <Badge variant="outline" className="text-xs">
              {post.status === "pending" ? "待處理" : post.status === "processed" ? "已分析" : post.status === "published" ? "已發佈" : post.status}
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-10">
        {/* Feed card preview */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
            動態牆顯示（Feed 卡片）
          </h2>
          <div className="max-w-sm">
            <PostCard
              post={post}
              analysis={analysis ? { summary: analysis.summary } : null}
              userTier="admin"
            />
          </div>
        </section>

        {/* Post detail preview */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
            貼文詳細頁（Post Detail）
          </h2>
          <div className="max-w-2xl space-y-6">
            {/* Original post block */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-3">
              <div className="flex items-center gap-2 text-xs text-gray-400 flex-wrap">
                <span className="font-medium text-gray-600">
                  {post.source_platform === "x" ? "𝕏" : "Instagram"}
                </span>
                {postTypeInfo && (
                  <>
                    <span>·</span>
                    <Badge variant="outline" className="flex items-center gap-1 text-xs py-0 h-5">
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
              {post.original_text && (
                <p className="font-japanese text-lg leading-relaxed whitespace-pre-wrap text-gray-900">
                  {post.original_text}
                </p>
              )}
              {post.retweeted_text && (
                <QuotedPost
                  retweeted_text={post.retweeted_text}
                  retweeted_author={post.retweeted_author}
                  retweeted_url={post.retweeted_url}
                  retweeted_translation={post.retweeted_translation}
                />
              )}
            </div>

            {/* Pure retweet: prominent translation section */}
            {isRetweet && post.retweeted_translation && (
              <div className="rounded-xl border border-gray-200 bg-[#f7f6f2] p-5">
                <h2 className="text-xs font-semibold text-[#01696f] mb-2 uppercase tracking-wide">
                  中文翻譯
                </h2>
                <p className="text-gray-700 text-sm leading-relaxed">
                  {post.retweeted_translation}
                </p>
              </div>
            )}

            {/* AI Summary */}
            {!isRetweet && analysis?.summary && (
              <div className="rounded-xl border border-gray-200 bg-[#f7f6f2] p-5">
                <h2 className="text-xs font-semibold text-[#01696f] mb-2 uppercase tracking-wide">
                  AI 摘要
                </h2>
                <p className="text-gray-700 text-sm">{analysis.summary}</p>
              </div>
            )}

            {/* Full analysis (admin sees everything) */}
            {!isRetweet && analysis && (
              <>
                {analysis.full_translation && (
                  <div className="rounded-xl border border-gray-200 bg-white p-5">
                    <h2 className="text-xs font-semibold text-[#01696f] mb-2 uppercase tracking-wide">
                      完整翻譯
                    </h2>
                    <p className="text-gray-800 leading-relaxed">{analysis.full_translation}</p>
                  </div>
                )}
                {analysis.vocab_breakdown && analysis.vocab_breakdown.length > 0 && (
                  <VocabBreakdown vocab={analysis.vocab_breakdown} />
                )}
                {analysis.culture_notes && <CultureNote notes={analysis.culture_notes} />}
                {analysis.grammar_notes && (
                  <GrammarHighlight
                    grammarNotes={analysis.grammar_notes}
                    languageOrigin={analysis.language_origin ?? null}
                  />
                )}
              </>
            )}

            {!isRetweet && !analysis && (
              <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-gray-400 text-sm">
                尚未進行 AI 分析。請先在管理後台點擊「AI 分析」後再預覽完整內容。
              </div>
            )}

            {isRetweet && !post.retweeted_translation && (
              <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-gray-400 text-sm">
                尚未生成中文翻譯。請先在管理後台點擊「AI 分析」。
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

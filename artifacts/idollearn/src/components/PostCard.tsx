import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import QuotedPost from "@/components/QuotedPost";
import type { Post, PostAnalysis, PostType, UserTier } from "@/types";
import { Lock, Repeat2, Quote, Reply } from "lucide-react";

interface PostCardProps {
  post: Post;
  analysis: Pick<PostAnalysis, "summary" | "vocab_breakdown"> | null;
  userTier: UserTier;
}

const POST_TYPE_CONFIG: Record<PostType, { label: string; icon: React.ReactNode; color: string } | null> = {
  post: null,
  reply: { label: "回覆", icon: <Reply className="h-3 w-3" />, color: "text-blue-500 border-blue-300" },
  retweet: { label: "轉發", icon: <Repeat2 className="h-3 w-3" />, color: "text-green-600 border-green-300" },
  quote_repost: { label: "引用轉發", icon: <Quote className="h-3 w-3" />, color: "text-purple-600 border-purple-300" },
};

export default function PostCard({ post, analysis, userTier }: PostCardProps) {
  const isPaid = userTier === "paid" || userTier === "admin";
  const platformLabel = post.source_platform === "x" ? "𝕏" : "Instagram";
  const platformColor =
    post.source_platform === "x"
      ? "border-gray-900 text-gray-900"
      : "border-pink-500 text-pink-600";

  const postTypeConfig = POST_TYPE_CONFIG[post.post_type ?? "post"];

  // Teaser vocab hint: first vocab item for free users
  const teaserVocab =
    !isPaid && analysis?.vocab_breakdown && analysis.vocab_breakdown.length > 0
      ? analysis.vocab_breakdown[0]
      : null;

  return (
    <Card className="flex flex-col">
      <CardHeader className="gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-[#01696f]/10 flex items-center justify-center text-sm font-bold text-[#01696f]">
              武
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">武田航平</p>
              <p className="text-xs text-gray-400">{formatDate(post.post_date)}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {postTypeConfig && (
              <Badge variant="outline" className={`text-xs flex items-center gap-1 ${postTypeConfig.color}`}>
                {postTypeConfig.icon} {postTypeConfig.label}
              </Badge>
            )}
            <Badge variant="outline" className={`text-xs ${platformColor}`}>{platformLabel}</Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {/* Idol's own text — not present for pure retweets */}
        {post.original_text && (
          <p className="text-sm text-gray-800 line-clamp-4 whitespace-pre-wrap">{post.original_text}</p>
        )}
        {/* Quoted / retweeted content block */}
        {post.retweeted_text && (
          <QuotedPost
            text={post.retweeted_text}
            author={post.retweeted_author}
            url={post.retweeted_url}
            translation={post.retweeted_translation}
          />
        )}
        {/* AI summary — not shown for pure retweets */}
        {post.post_type !== "retweet" && (
          analysis ? (
            <div className="rounded-md bg-gray-50 border p-2.5 space-y-0.5">
              <p className="text-xs font-semibold text-gray-500">摘要</p>
              <p className="text-xs text-gray-700 line-clamp-2">{analysis.summary}</p>
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic">AI 摘要生成中…</p>
          )
        )}
        {/* Teaser vocab hint for free users: blurred first vocab item */}
        {post.post_type !== "retweet" && teaserVocab && (
          <div
            className="rounded-md bg-gray-50 border p-2 blur-[2px] select-none pointer-events-none text-xs text-gray-600"
            aria-hidden="true"
          >
            📖 {teaserVocab.word}《{teaserVocab.reading}》— {teaserVocab.meaning_zh}
          </div>
        )}
      </CardContent>

      {post.post_type !== "retweet" && (
        <CardFooter>
          {isPaid ? (
            <Button size="sm" variant="outline" className="w-full" asChild>
              <Link href={`/post/${post.id}`}>查看完整解析</Link>
            </Button>
          ) : (
            <Button size="sm" variant="outline" className="w-full text-gray-500" asChild>
              <Link href={`/post/${post.id}`}>
                <Lock className="h-3 w-3 mr-1" />
                查看完整解析
              </Link>
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}

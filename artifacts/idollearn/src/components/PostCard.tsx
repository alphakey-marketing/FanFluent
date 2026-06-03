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
  analysis: Pick<PostAnalysis, "summary"> | null;
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
              <Badge
                className={`border bg-transparent text-xs flex items-center gap-1 ${postTypeConfig.color}`}
                variant="outline"
              >
                {postTypeConfig.icon}
                {postTypeConfig.label}
              </Badge>
            )}
            <Badge
              className={`border bg-transparent text-xs ${platformColor}`}
              variant="outline"
            >
              {platformLabel}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {/* Idol's own text — not present for pure retweets */}
        {post.original_text && (
          <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap font-japanese">
            {post.original_text}
          </p>
        )}

        {/* Quoted / retweeted content block */}
        {post.retweeted_text && (
          <QuotedPost
            retweeted_text={post.retweeted_text}
            retweeted_author={post.retweeted_author}
            retweeted_url={post.retweeted_url}
          />
        )}

        {/* AI summary — not shown for pure retweets (status: skipped) */}
        {post.post_type !== "retweet" && (
          analysis ? (
            <div className="rounded-md bg-[#f7f6f2] p-3">
              <p className="text-xs font-medium text-[#01696f] mb-1">摘要</p>
              <p className="text-sm text-gray-700">{analysis.summary}</p>
            </div>
          ) : (
            <div className="rounded-md bg-gray-50 p-3 text-sm text-gray-400 italic">
              AI 摘要生成中…
            </div>
          )
        )}
      </CardContent>

      {post.post_type !== "retweet" && (
        <CardFooter className="mt-auto">
          {isPaid ? (
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href={`/post/${post.id}`}>查看完整解析</Link>
            </Button>
          ) : (
            <Button asChild variant="default" size="sm" className="w-full gap-1">
              <Link href={`/post/${post.id}`}>
                <Lock className="h-3 w-3" />
                查看完整解析
              </Link>
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}


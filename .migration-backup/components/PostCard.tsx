"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import type { Post, PostAnalysis, UserTier } from "@/types";
import { Lock } from "lucide-react";

interface PostCardProps {
  post: Post;
  analysis: Pick<PostAnalysis, "summary"> | null;
  userTier: UserTier;
}

export default function PostCard({ post, analysis, userTier }: PostCardProps) {
  const isPaid = userTier === "paid" || userTier === "admin";
  const platformLabel = post.source_platform === "x" ? "𝕏" : "Instagram";
  const platformColor =
    post.source_platform === "x"
      ? "border-gray-900 text-gray-900"
      : "border-pink-500 text-pink-600";

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
          <Badge
            className={`border bg-transparent text-xs ${platformColor}`}
            variant="outline"
          >
            {platformLabel}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap font-japanese">
          {post.original_text}
        </p>
        {analysis ? (
          <div className="rounded-md bg-[#f7f6f2] p-3">
            <p className="text-xs font-medium text-[#01696f] mb-1">摘要</p>
            <p className="text-sm text-gray-700">{analysis.summary}</p>
          </div>
        ) : (
          <div className="rounded-md bg-gray-50 p-3 text-sm text-gray-400 italic">
            AI 摘要生成中…
          </div>
        )}
      </CardContent>

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
    </Card>
  );
}

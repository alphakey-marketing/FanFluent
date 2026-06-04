import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import PostCard from "@/components/PostCard";
import type { Post, PostAnalysis, PostType, UserTier } from "@/types";

type FeedFilter = "all" | PostType;

const FILTER_LABELS: Record<FeedFilter, string> = {
  all: "全部",
  post: "原文貼文",
  reply: "回覆",
  quote_repost: "引用轉發",
  retweet: "轉發",
};

export default function FeedPage() {
  const [, navigate] = useLocation();
  const [userTier, setUserTier] = useState<UserTier>("free");
  const [posts, setPosts] = useState<Post[]>([]);
  const [analysisMap, setAnalysisMap] = useState<Record<string, Pick<PostAnalysis, "summary">>>({});
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FeedFilter>("all");

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth/login"); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("tier, display_name")
        .eq("id", user.id)
        .single();

      const tier: UserTier = (profile?.tier as UserTier) ?? "free";
      if (!cancelled) setUserTier(tier);

      const { data: postsData } = await supabase
        .from("posts")
        .select("*")
        .eq("status", "published")
        .order("post_date", { ascending: false });

      const fetchedPosts = (postsData ?? []) as Post[];
      if (!cancelled) setPosts(fetchedPosts);

      const postIds = fetchedPosts.map((p) => p.id);
      if (postIds.length > 0) {
        const { data: analyses } = await supabase
          .from("post_analysis")
          .select("post_id, summary")
          .in("post_id", postIds);

        const map: Record<string, Pick<PostAnalysis, "summary">> = {};
        for (const a of analyses ?? []) {
          map[a.post_id] = { summary: a.summary };
        }
        if (!cancelled) setAnalysisMap(map);
      }

      if (!cancelled) setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [navigate]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    navigate("/auth/login");
  }

  // Derive which filter tabs to show based on what post types exist in the feed
  const availableFilters = useMemo<FeedFilter[]>(() => {
    const types = new Set(posts.map((p) => p.post_type ?? "post"));
    const filters: FeedFilter[] = ["all"];
    (["post", "reply", "quote_repost", "retweet"] as PostType[]).forEach((t) => {
      if (types.has(t)) filters.push(t);
    });
    return filters;
  }, [posts]);

  const filteredPosts = useMemo(
    () =>
      activeFilter === "all"
        ? posts
        : posts.filter((p) => (p.post_type ?? "post") === activeFilter),
    [posts, activeFilter],
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-400">
        載入中…
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="font-bold text-[#01696f] text-lg">IdolLearn</h1>
          <div className="flex items-center gap-3">
            {userTier === "admin" && (
              <Button asChild variant="outline" size="sm">
                <Link href="/admin">管理</Link>
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              登出
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {userTier === "free" && (
          <div className="mb-6 rounded-xl bg-[#01696f]/5 border border-[#01696f]/20 p-4 flex items-center justify-between gap-4">
            <p className="text-sm text-gray-700">
              🔓 升級解鎖詞彙、文化與文法完整解析
            </p>
            <Button asChild size="sm">
              <Link href="/upgrade">了解更多</Link>
            </Button>
          </div>
        )}

        {/* Post-type filter tabs — only shown when there are 2+ filter options */}
        {availableFilters.length > 1 && (
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
            {availableFilters.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                  activeFilter === filter
                    ? "bg-[#01696f] text-white border-[#01696f]"
                    : "bg-white text-gray-600 border-gray-300 hover:border-[#01696f] hover:text-[#01696f]"
                }`}
              >
                {FILTER_LABELS[filter]}
              </button>
            ))}
          </div>
        )}

        {filteredPosts.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg">尚無貼文</p>
            <p className="text-sm mt-1">
              {activeFilter === "all" ? "管理員發佈後將在此顯示" : "此分類暫無貼文"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                analysis={analysisMap[post.id] ?? null}
                userTier={userTier}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import PostCard from "@/components/PostCard";
import { Button } from "@/components/ui/button";
import type { Post, PostAnalysis, UserTier } from "@/types";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("tier, display_name")
    .eq("id", user.id)
    .single();

  const userTier: UserTier = (profile?.tier as UserTier) ?? "free";

  const { data: posts } = await supabase
    .from("posts")
    .select("*")
    .eq("status", "published")
    .order("post_date", { ascending: false });

  const postIds = (posts ?? []).map((p: Post) => p.id);
  const { data: analyses } = postIds.length
    ? await supabase
        .from("post_analysis")
        .select("post_id, summary")
        .in("post_id", postIds)
    : { data: [] };

  const analysisMap = Object.fromEntries(
    (analyses ?? []).map((a: Pick<PostAnalysis, "post_id" | "summary">) => [
      a.post_id,
      a,
    ])
  );

  async function handleSignOut() {
    "use server";
    const sb = await createServerClient();
    await sb.auth.signOut();
    redirect("/auth/login");
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="font-bold text-[#01696f] text-lg">IdolLearn</h1>
          <div className="flex items-center gap-3">
            {userTier === "admin" && (
              <Button asChild variant="outline" size="sm">
                <Link href="/admin">管理</Link>
              </Button>
            )}
            <form action={handleSignOut}>
              <Button variant="ghost" size="sm" type="submit">
                登出
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Feed */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {userTier === "free" && (
          <div className="mb-6 rounded-xl bg-[#01696f]/5 border border-[#01696f]/20 p-4 flex items-center justify-between gap-4">
            <p className="text-sm text-gray-700">
              🔓 升級解鎖詞彙、文化與文法完整解析
            </p>
            <Button asChild size="sm">
              <Link href="/post/upgrade">了解更多</Link>
            </Button>
          </div>
        )}

        {!posts || posts.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg">尚無貼文</p>
            <p className="text-sm mt-1">管理員發佈後將在此顯示</p>
          </div>
        ) : (
          <div className="space-y-4">
            {(posts as Post[]).map((post) => (
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

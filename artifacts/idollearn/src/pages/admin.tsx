import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import AdminPostForm from "@/components/AdminPostForm";
import type { Post } from "@/types";

export default function AdminPage() {
  const [, navigate] = useLocation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  function fetchPosts() {
    setTick((t) => t + 1);
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/posts").then(async (res) => {
      if (cancelled) return;
      if (res.status === 401 || res.status === 403) {
        navigate("/feed");
        return;
      }
      const data = await res.json();
      if (!cancelled) {
        setPosts(data.posts ?? []);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

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
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="font-bold text-[#01696f] text-lg">管理後台</h1>
          <a href="/feed" className="text-sm text-gray-500 hover:underline">
            返回動態
          </a>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-6">
        <AdminPostForm posts={posts} onRefresh={fetchPosts} />
      </main>
    </div>
  );
}

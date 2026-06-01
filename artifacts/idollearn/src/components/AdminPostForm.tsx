import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { Post, PostStatus } from "@/types";

interface AdminPostFormProps {
  posts: Post[];
  onRefresh: () => void;
}

export default function AdminPostForm({ posts, onRefresh }: AdminPostFormProps) {
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [form, setForm] = useState({
    original_text: "",
    source_platform: "x" as "x" | "instagram",
    source_url: "",
    post_date: "",
    image_url: "",
  });
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Import failed");
      setMessage({ type: "success", text: "文章已匯入，正在處理 AI 分析…" });
      setForm({ original_text: "", source_platform: "x", source_url: "", post_date: "", image_url: "" });
      onRefresh();
    } catch {
      setMessage({ type: "error", text: "匯入失敗，請重試。" });
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(postId: string, action: "process" | "publish" | "unpublish") {
    setActionLoading(postId + action);
    try {
      if (action === "process") {
        await fetch("/api/process-post", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postId }),
        });
      } else {
        const status = action === "publish" ? "published" : "processed";
        await fetch("/api/admin/posts", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postId, status }),
        });
      }
      onRefresh();
    } finally {
      setActionLoading(null);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const statusVariant: Record<PostStatus, "pending" | "processed" | "published"> = {
    pending: "pending",
    processed: "processed",
    published: "published",
  };

  return (
    <div className="space-y-8">
      {/* Import form */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="font-semibold text-lg mb-4">匯入新貼文</h2>
        <form onSubmit={handleImport} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="original_text">日文原文 *</Label>
            <Textarea
              id="original_text"
              required
              rows={5}
              placeholder="貼上武田航平的原文…"
              value={form.original_text}
              onChange={(e) => setForm({ ...form, original_text: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="source_platform">來源平台</Label>
              <select
                id="source_platform"
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#01696f]"
                value={form.source_platform}
                onChange={(e) =>
                  setForm({ ...form, source_platform: e.target.value as "x" | "instagram" })
                }
              >
                <option value="x">𝕏 (Twitter)</option>
                <option value="instagram">Instagram</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="post_date">發文日期</Label>
              <Input
                id="post_date"
                type="datetime-local"
                value={form.post_date}
                onChange={(e) => setForm({ ...form, post_date: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="source_url">原文連結</Label>
              <Input
                id="source_url"
                type="url"
                placeholder="https://…"
                value={form.source_url}
                onChange={(e) => setForm({ ...form, source_url: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="image_url">圖片連結</Label>
              <Input
                id="image_url"
                type="url"
                placeholder="https://…"
                value={form.image_url}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              />
            </div>
          </div>
          {message && (
            <p className={`text-sm ${message.type === "success" ? "text-green-600" : "text-red-600"}`}>
              {message.text}
            </p>
          )}
          <Button type="submit" disabled={loading}>
            {loading ? "處理中…" : "匯入並分析"}
          </Button>
        </form>
      </div>

      {/* Posts table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="font-semibold text-lg">所有貼文</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-500">日期</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">原文（節錄）</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">平台</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">狀態</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody>
              {posts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-400">
                    尚無貼文
                  </td>
                </tr>
              ) : (
                posts.map((post) => (
                  <tr key={post.id} className="border-b last:border-0 hover:bg-gray-50/50">
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500 text-xs">
                      {formatDate(post.post_date ?? post.created_at)}
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="truncate font-japanese text-gray-800">
                        {post.original_text.slice(0, 60)}…
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs">
                        {post.source_platform === "x" ? "𝕏" : "Instagram"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{post.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {post.status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={actionLoading === post.id + "process"}
                            onClick={() => handleAction(post.id, "process")}
                          >
                            AI 分析
                          </Button>
                        )}
                        {post.status === "processed" && (
                          <Button
                            size="sm"
                            disabled={actionLoading === post.id + "publish"}
                            onClick={() => handleAction(post.id, "publish")}
                          >
                            發佈
                          </Button>
                        )}
                        {post.status === "published" && (
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={actionLoading === post.id + "unpublish"}
                            onClick={() => handleAction(post.id, "unpublish")}
                          >
                            下架
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

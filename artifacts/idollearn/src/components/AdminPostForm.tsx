import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { authedFetch } from "@/lib/api";
import type { IngestResult, Post, PostStatus, PostType } from "@/types";

interface AdminPostFormProps {
  posts: Post[];
  onRefresh: () => void;
}

const POST_TYPE_LABELS: Record<PostType, string> = {
  post: "原文貼文",
  reply: "回覆",
  retweet: "轉發（純轉）",
  quote_repost: "引用轉發",
};

export default function AdminPostForm({ posts, onRefresh }: AdminPostFormProps) {
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionErrors, setActionErrors] = useState<Record<string, string>>({});
  const [ingestLoading, setIngestLoading] = useState(false);
  const [ingestResult, setIngestResult] = useState<IngestResult | null>(null);
  const [ingestError, setIngestError] = useState<string | null>(null);
  const [form, setForm] = useState({
    original_text: "",
    source_platform: "x" as "x" | "instagram",
    post_type: "post" as PostType,
    source_url: "",
    post_date: "",
    image_url: "",
    retweeted_text: "",
    retweeted_author: "",
    retweeted_url: "",
  });
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const isRetweet = form.post_type === "retweet";
  const isQuoteRepost = form.post_type === "quote_repost";
  const showRetweetedFields = isRetweet || isQuoteRepost;

  async function handleIngest() {
    setIngestLoading(true);
    setIngestResult(null);
    setIngestError(null);
    try {
      const res = await authedFetch("/api/ingest/x", { method: "POST" });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? "Ingest failed");
      }
      const data = await res.json() as IngestResult & { ok: boolean };
      setIngestResult(data);
      onRefresh();
    } catch (err) {
      setIngestError(err instanceof Error ? err.message : "未知錯誤");
    } finally {
      setIngestLoading(false);
    }
  }

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const body: Record<string, string> = {
        source_platform: form.source_platform,
        post_type: form.post_type,
      };
      if (form.original_text) body.original_text = form.original_text;
      if (form.source_url) body.source_url = form.source_url;
      if (form.post_date) body.post_date = form.post_date;
      if (form.image_url) body.image_url = form.image_url;
      if (showRetweetedFields) {
        if (form.retweeted_text) body.retweeted_text = form.retweeted_text;
        if (form.retweeted_author) body.retweeted_author = form.retweeted_author;
        if (form.retweeted_url) body.retweeted_url = form.retweeted_url;
      }

      const res = await authedFetch("/api/admin/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Import failed");
      const successMsg = isRetweet
        ? "轉發已匯入，請在列表中點擊「AI 分析」以生成中文翻譯，再發佈。"
        : "文章已匯入，正在處理 AI 分析…";
      setMessage({ type: "success", text: successMsg });
      setForm({
        original_text: "",
        source_platform: "x",
        post_type: "post",
        source_url: "",
        post_date: "",
        image_url: "",
        retweeted_text: "",
        retweeted_author: "",
        retweeted_url: "",
      });
      onRefresh();
    } catch {
      setMessage({ type: "error", text: "匯入失敗，請重試。" });
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(postId: string, action: "process" | "publish" | "unpublish") {
    setActionLoading(postId + action);
    setActionErrors((prev) => { const next = { ...prev }; delete next[postId]; return next; });
    try {
      if (action === "process") {
        const res = await authedFetch("/api/process-post", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postId }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({})) as { error?: string };
          setActionErrors((prev) => ({
            ...prev,
            [postId]: data.error ?? `AI 分析失敗（${res.status}）`,
          }));
          return;
        }
      } else {
        const status = action === "publish" ? "published" : "processed";
        const res = await authedFetch("/api/admin/posts", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postId, status }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({})) as { error?: string };
          setActionErrors((prev) => ({
            ...prev,
            [postId]: data.error ?? `操作失敗（${res.status}）`,
          }));
          return;
        }
      }
      onRefresh();
    } catch (err) {
      setActionErrors((prev) => ({
        ...prev,
        [postId]: err instanceof Error ? err.message : "網路錯誤，請重試",
      }));
    } finally {
      setActionLoading(null);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const statusVariant: Record<PostStatus, "pending" | "processed" | "published"> = {
    pending: "pending",
    processed: "processed",
    published: "published",
    skipped: "pending",
  };

  return (
    <div className="space-y-8">
      {/* X Auto-ingest section (admin only) */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-6">
        <h2 className="font-semibold text-lg mb-1">從 X 匯入最新貼文</h2>
        <p className="text-sm text-gray-500 mb-4">
          觸發伺服器從 X（前 Twitter）抓取偶像最新貼文，並放入審核佇列。相同貼文不會重複匯入。
        </p>
        <Button
          type="button"
          onClick={handleIngest}
          disabled={ingestLoading}
          className="bg-[#01696f] hover:bg-[#015a5f] text-white"
        >
          {ingestLoading ? "匯入中…" : "從 X 匯入最新貼文"}
        </Button>

        {ingestError && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            ❌ 匯入失敗：{ingestError}
          </div>
        )}

        {ingestResult && (
          <div className="mt-4 rounded-lg border border-green-200 bg-white p-4 text-sm space-y-1">
            <p className="font-medium text-green-700 mb-2">✅ 匯入完成</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-gray-700">
              <span className="text-gray-500">抓取總數</span>
              <span className="font-semibold">{ingestResult.total}</span>
              <span className="text-gray-500">新匯入</span>
              <span className="font-semibold text-green-600">{ingestResult.newly_imported}</span>
              <span className="text-gray-500">已略過（重複）</span>
              <span className="font-semibold text-yellow-600">{ingestResult.duplicates_skipped}</span>
              <span className="text-gray-500">失敗 / 略過</span>
              <span className="font-semibold text-red-600">{ingestResult.failed}</span>
            </div>
            {ingestResult.newly_imported > 0 && (
              <p className="text-xs text-gray-400 mt-2">新貼文已進入審核佇列，請在下方審核後發布。</p>
            )}
          </div>
        )}
      </div>

      {/* Import form */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="font-semibold text-lg mb-4">匯入新貼文</h2>
        <form onSubmit={handleImport} className="space-y-4">
          {/* Post type + platform row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="post_type">貼文類型 *</Label>
              <select
                id="post_type"
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#01696f]"
                value={form.post_type}
                onChange={(e) => setForm({ ...form, post_type: e.target.value as PostType })}
              >
                <option value="post">原文貼文</option>
                <option value="reply">回覆（Reply）</option>
                <option value="retweet">純轉發（Retweet / Repost）</option>
                <option value="quote_repost">引用轉發（Quote Repost）</option>
              </select>
            </div>
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
          </div>

          {/* Idol's own text — not shown for pure retweets */}
          {!isRetweet && (
            <div className="space-y-1">
              <Label htmlFor="original_text">
                {isQuoteRepost ? "藝人自己的評論 *" : "日文原文 *"}
              </Label>
              <Textarea
                id="original_text"
                required={!isRetweet}
                rows={5}
                placeholder={
                  isQuoteRepost
                    ? "貼上武田航平對轉發貼文的評論…"
                    : "貼上武田航平的原文…"
                }
                value={form.original_text}
                onChange={(e) => setForm({ ...form, original_text: e.target.value })}
              />
            </div>
          )}

          {/* Retweeted content — shown for retweet & quote_repost */}
          {showRetweetedFields && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
              <p className="text-xs font-medium text-amber-700">
                {isRetweet ? "轉發來源" : "被引用的貼文"}
              </p>
              <div className="space-y-1">
                <Label htmlFor="retweeted_author">原作者（帳號或顯示名稱）</Label>
                <Input
                  id="retweeted_author"
                  placeholder="@username 或顯示名稱"
                  value={form.retweeted_author}
                  onChange={(e) => setForm({ ...form, retweeted_author: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="retweeted_text">被轉發的內容</Label>
                <Textarea
                  id="retweeted_text"
                  rows={4}
                  placeholder="貼上被轉發的原始貼文內容…"
                  value={form.retweeted_text}
                  onChange={(e) => setForm({ ...form, retweeted_text: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="retweeted_url">被轉發貼文的連結</Label>
                <Input
                  id="retweeted_url"
                  type="url"
                  placeholder="https://…"
                  value={form.retweeted_url}
                  onChange={(e) => setForm({ ...form, retweeted_url: e.target.value })}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="post_date">發文日期</Label>
              <Input
                id="post_date"
                type="datetime-local"
                value={form.post_date}
                onChange={(e) => setForm({ ...form, post_date: e.target.value })}
              />
            </div>
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

          {isRetweet && (
            <p className="text-xs text-amber-600 bg-amber-50 rounded-md px-3 py-2 border border-amber-200">
              純轉發不含藝人原創文字，匯入後需點擊「AI 分析」生成中文翻譯，再由管理員審核發佈。
            </p>
          )}

          {message && (
            <p className={`text-sm ${message.type === "success" ? "text-green-600" : "text-red-600"}`}>
              {message.text}
            </p>
          )}
          <Button type="submit" disabled={loading}>
            {loading ? "處理中…" : isRetweet ? "匯入轉發" : "匯入並分析"}
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
                <th className="text-left px-4 py-3 font-medium text-gray-500">類型</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">來源</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">狀態</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody>
              {posts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-400">
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
                        {post.original_text
                          ? post.original_text.slice(0, 60) + "…"
                          : post.retweeted_text
                          ? `[轉] ${post.retweeted_text.slice(0, 50)}…`
                          : "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge variant="outline" className="text-xs">
                        {POST_TYPE_LABELS[post.post_type ?? "post"]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-xs">
                          {post.source_platform === "x" ? "𝕏" : "Instagram"}
                        </Badge>
                        {post.source_url && (
                          <a
                            href={post.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[#01696f] hover:underline"
                            title={post.source_url}
                          >
                            原文↗
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{post.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex gap-2 flex-wrap">
                          {(post.status === "pending" || post.status === "skipped") && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={actionLoading === post.id + "process"}
                              onClick={() => handleAction(post.id, "process")}
                            >
                              {actionLoading === post.id + "process" ? "分析中…" : "AI 分析"}
                            </Button>
                          )}
                          {post.status === "processed" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                asChild
                              >
                                <Link href={`/admin/preview/${post.id}`}>預覽</Link>
                              </Button>
                              <Button
                                size="sm"
                                disabled={actionLoading === post.id + "publish"}
                                onClick={() => handleAction(post.id, "publish")}
                              >
                                {actionLoading === post.id + "publish" ? "發佈中…" : "發佈"}
                              </Button>
                            </>
                          )}
                          {post.status === "published" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                asChild
                              >
                                <Link href={`/admin/preview/${post.id}`}>預覽</Link>
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={actionLoading === post.id + "unpublish"}
                                onClick={() => handleAction(post.id, "unpublish")}
                              >
                                {actionLoading === post.id + "unpublish" ? "下架中…" : "下架"}
                              </Button>
                            </>
                          )}
                        </div>
                        {actionErrors[post.id] && (
                          <p className="text-xs text-red-600 max-w-[200px]">
                            ⚠ {actionErrors[post.id]}
                          </p>
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

import { Router } from "express";
import { createSupabaseClient } from "../lib/supabase";

const router = Router();

async function requireAdmin(authHeader: string | undefined) {
  const token = authHeader?.replace("Bearer ", "");
  const supabase = createSupabaseClient(token);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("tier")
    .eq("id", user.id)
    .single();

  return { supabase, user, profile };
}

// GET /api/admin/posts
router.get("/admin/posts", async (req, res) => {
  const { supabase, user, profile } = await requireAdmin(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (profile?.tier !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }

  const { data: posts, error } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ posts });
});

// POST /api/admin/posts
router.post("/admin/posts", async (req, res) => {
  const { supabase, user, profile } = await requireAdmin(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (profile?.tier !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }

  const {
    original_text,
    source_platform,
    source_url,
    post_date,
    image_url,
    post_type = "post",
    retweeted_text,
    retweeted_author,
    retweeted_url,
  } = req.body;

  const validPostTypes = ["post", "reply", "retweet", "quote_repost"];
  if (!source_platform) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  if (!validPostTypes.includes(post_type)) {
    res.status(400).json({ error: "Invalid post_type" });
    return;
  }
  // Pure retweets with no idol commentary are allowed (no original_text required)
  if (post_type !== "retweet" && !original_text) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  // Pure retweets are auto-skipped — no learnable idol language to analyse
  const initialStatus = post_type === "retweet" ? "skipped" : "pending";

  const { data: post, error } = await supabase
    .from("posts")
    .insert({
      original_text: original_text || null,
      source_platform,
      source_url: source_url || null,
      post_date: post_date || null,
      image_url: image_url || null,
      post_type,
      retweeted_text: retweeted_text || null,
      retweeted_author: retweeted_author || null,
      retweeted_url: retweeted_url || null,
      imported_by: user.id,
      status: initialStatus,
    })
    .select()
    .single();

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.status(201).json({ post });
});

// PATCH /api/admin/posts
router.patch("/admin/posts", async (req, res) => {
  const { supabase, user, profile } = await requireAdmin(req.headers.authorization);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (profile?.tier !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }

  const { postId, status } = req.body;
  if (!postId || !status) {
    res.status(400).json({ error: "Missing postId or status" });
    return;
  }

  const { error } = await supabase
    .from("posts")
    .update({ status })
    .eq("id", postId);

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ ok: true });
});

export default router;

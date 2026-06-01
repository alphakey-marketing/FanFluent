import { Router } from "express";
import { createSupabaseClient } from "../lib/supabase";

const router = Router();

// GET /api/post-analysis/:id
router.get("/post-analysis/:id", async (req, res) => {
  const { id } = req.params;
  const token = req.headers.authorization?.replace("Bearer ", "");
  const supabase = createSupabaseClient(token);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { data: profile } = await supabase
    .from("profiles")
    .select("tier")
    .eq("id", user.id)
    .single();

  const { data: analysis, error } = await supabase
    .from("post_analysis")
    .select("*")
    .eq("post_id", id)
    .single();

  if (error || !analysis) { res.status(404).json({ error: "Not found" }); return; }

  if (profile?.tier === "free") {
    res.json({ summary: analysis.summary });
    return;
  }

  res.json(analysis);
});

export default router;

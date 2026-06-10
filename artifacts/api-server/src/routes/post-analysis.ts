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
    // Return teaser: summary + first sentence of translation + first 2 vocab items
    const teaserTranslation = analysis.full_translation
      ? (analysis.full_translation.split("。")[0] ?? "") + "。\u2026"
      : null;
    const teaserVocab = Array.isArray(analysis.vocab_breakdown)
      ? analysis.vocab_breakdown.slice(0, 2)
      : null;
    res.json({
      summary: analysis.summary,
      is_preview: true,
      full_translation: teaserTranslation,
      vocab_breakdown: teaserVocab,
    });
    return;
  }

  res.json(analysis);
});

export default router;

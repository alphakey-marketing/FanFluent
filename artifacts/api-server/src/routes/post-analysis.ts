import { Router } from "express";
import { createSupabaseClient } from "../lib/supabase";

const router = Router();

/** Returns the first `maxChars` characters of a string, ending at a sentence boundary if possible. */
function teaserSlice(text: string | null, maxChars = 120): string | null {
  if (!text) return null;
  if (text.length <= maxChars) return text;
  // Try to break at a sentence-ending punctuation within the limit
  const cut = text.slice(0, maxChars);
  const lastBreak = Math.max(
    cut.lastIndexOf("。"),
    cut.lastIndexOf("."),
    cut.lastIndexOf("\n"),
  );
  return lastBreak > 20 ? text.slice(0, lastBreak + 1) : cut;
}

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
    // Teaser payload for free tier:
    // - summary: full
    // - full_translation: first sentence only
    // - vocab_breakdown: ALL items (shown fully as a hook)
    // - culture_notes: first ~120 chars (partially mosaiced on frontend)
    // - grammar_notes: first ~120 chars (partially mosaiced on frontend)
    // - language_origin: first ~120 chars (partially mosaiced on frontend)
    const teaserTranslation = analysis.full_translation
      ? (analysis.full_translation.split("。")[0] ?? "") + "。…"
      : null;

    res.json({
      summary: analysis.summary,
      is_preview: true,
      full_translation: teaserTranslation,
      vocab_breakdown: analysis.vocab_breakdown ?? null,
      culture_notes: teaserSlice(analysis.culture_notes),
      grammar_notes: teaserSlice(analysis.grammar_notes),
      language_origin: teaserSlice(analysis.language_origin),
    });
    return;
  }

  res.json(analysis);
});

export default router;

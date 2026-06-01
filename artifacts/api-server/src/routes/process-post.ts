import { Router } from "express";
import { createSupabaseClient } from "../lib/supabase";

const router = Router();

async function callOpenRouter(prompt: string, model = "openai/gpt-4o"): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + process.env["OPENROUTER_API_KEY"],
      "Content-Type": "application/json",
      "HTTP-Referer": process.env["APP_URL"] ?? "",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${errorText}`);
  }

  const data = await res.json() as { choices: Array<{ message: { content: string } }> };
  return data.choices[0].message.content;
}

function buildSummaryPrompt(originalText: string): string {
  return `You are a Japanese language assistant. 
Read the following Japanese social media post by a Japanese actor.
Return ONLY a JSON object in this format:
{
  "summary": "A 1-2 sentence plain-language summary in Traditional Chinese (繁體中文)"
}

Post:
"""
${originalText}
"""`;
}

function buildFullAnalysisPrompt(originalText: string): string {
  return `You are a Japanese language and culture expert. 
Analyse the following Japanese social media post.
Return ONLY a JSON object with these fields:
{
  "full_translation": "Natural, readable Traditional Chinese translation",
  "vocab_breakdown": [
    {
      "word": "Japanese word or phrase",
      "reading": "hiragana reading",
      "romaji": "romanised reading",
      "meaning_zh": "Traditional Chinese meaning",
      "meaning_en": "English meaning",
      "word_type": "noun/verb/slang/etc",
      "origin": "Etymology or origin note if interesting",
      "usage_note": "Cultural or contextual usage note",
      "example_sentence": "Example sentence in Japanese"
    }
  ],
  "culture_notes": "Cultural background relevant to this post (Traditional Chinese)",
  "grammar_notes": "1-2 notable grammar patterns used, with explanation (Traditional Chinese)",
  "language_origin": "Any interesting kanji origins or language etymology (Traditional Chinese)"
}

Post:
"""
${originalText}
"""`;
}

// POST /api/process-post
router.post("/process-post", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const supabase = createSupabaseClient(token);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { data: profile } = await supabase
    .from("profiles")
    .select("tier")
    .eq("id", user.id)
    .single();

  if (profile?.tier !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }

  const { postId } = req.body;
  if (!postId) { res.status(400).json({ error: "Missing postId" }); return; }

  const { data: post } = await supabase
    .from("posts")
    .select("original_text")
    .eq("id", postId)
    .single();

  if (!post) { res.status(404).json({ error: "Post not found" }); return; }

  try {
    const [summaryRaw, fullAnalysisRaw] = await Promise.all([
      callOpenRouter(buildSummaryPrompt(post.original_text)),
      callOpenRouter(buildFullAnalysisPrompt(post.original_text)),
    ]);

    const summaryObj = JSON.parse(summaryRaw);
    const fullAnalysis = JSON.parse(fullAnalysisRaw);

    const { error: upsertError } = await supabase.from("post_analysis").upsert({
      post_id: postId,
      summary: summaryObj.summary,
      ...fullAnalysis,
      model_used: "openai/gpt-4o",
    });

    if (upsertError) { res.status(500).json({ error: upsertError.message }); return; }

    await supabase.from("posts").update({ status: "processed" }).eq("id", postId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;

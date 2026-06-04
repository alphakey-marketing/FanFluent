import { Router } from "express";
import { createSupabaseClient } from "../lib/supabase";

const router = Router();

const OPENROUTER_TIMEOUT_MS = 90_000;

async function callOpenRouter(prompt: string, model = "openai/gpt-4o"): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OPENROUTER_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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
      signal: controller.signal,
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new Error(`OpenRouter request timed out after ${OPENROUTER_TIMEOUT_MS / 1000}s`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${errorText}`);
  }

  const data = await res.json() as { choices: Array<{ message: { content: string } }> };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenRouter returned an empty response");
  return content;
}

type PostRow = {
  original_text: string | null;
  post_type: string;
  retweeted_text: string | null;
  retweeted_author: string | null;
};

function buildSummaryPrompt(post: PostRow): string {
  if (post.post_type === "quote_repost") {
    return `You are a Japanese language assistant.
The following is a quote repost by a Japanese actor (武田航平).
The actor's own comment is shown first, followed by the post they are quoting.
Read only the actor's comment and summarise it.

Return ONLY a JSON object in this format:
{
  "summary": "A 1-2 sentence plain-language summary of the actor's comment in Traditional Chinese (繁體中文)"
}

Actor's comment:
"""
${post.original_text ?? ""}
"""

Quoted post${post.retweeted_author ? ` (by ${post.retweeted_author})` : ""}:
"""
${post.retweeted_text ?? ""}
"""`;
  }

  if (post.post_type === "reply") {
    return `You are a Japanese language assistant.
The following is a reply posted by a Japanese actor (武田航平) on social media.
Read the reply and summarise it.

Return ONLY a JSON object in this format:
{
  "summary": "A 1-2 sentence plain-language summary in Traditional Chinese (繁體中文)"
}

Reply:
"""
${post.original_text ?? ""}
"""`;
  }

  // Default: original post
  return `You are a Japanese language assistant.
Read the following Japanese social media post by a Japanese actor.
Return ONLY a JSON object in this format:
{
  "summary": "A 1-2 sentence plain-language summary in Traditional Chinese (繁體中文)"
}

Post:
"""
${post.original_text ?? ""}
"""`;
}

function buildFullAnalysisPrompt(post: PostRow): string {
  const analysisShape = `{
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
}`;

  if (post.post_type === "quote_repost") {
    return `You are a Japanese language and culture expert.
The following is a quote repost by a Japanese actor (武田航平).
Analyse ONLY the actor's own comment (not the quoted post).
Use the quoted post as context only — do not include vocabulary or grammar from the quoted post.

Return ONLY a JSON object with these fields:
${analysisShape}

Actor's comment:
"""
${post.original_text ?? ""}
"""

Quoted post${post.retweeted_author ? ` (by ${post.retweeted_author})` : ""} — for context only:
"""
${post.retweeted_text ?? ""}
"""`;
  }

  if (post.post_type === "reply") {
    return `You are a Japanese language and culture expert.
Analyse the following reply posted by a Japanese actor (武田航平) on social media.

Return ONLY a JSON object with these fields:
${analysisShape}

Reply:
"""
${post.original_text ?? ""}
"""`;
  }

  // Default: original post
  return `You are a Japanese language and culture expert.
Analyse the following Japanese social media post.
Return ONLY a JSON object with these fields:
${analysisShape}

Post:
"""
${post.original_text ?? ""}
"""`;
}

function buildRetweetedTranslationPrompt(post: PostRow): string {
  return `You are a Japanese language assistant.
Translate the following Japanese social media post into Traditional Chinese (繁體中文).
Provide a natural, readable translation so the reader can understand what the post is about.

Return ONLY a JSON object in this format:
{
  "translation": "Natural Traditional Chinese translation of the post"
}

Post${post.retweeted_author ? ` (by ${post.retweeted_author})` : ""}:
"""
${post.retweeted_text ?? ""}
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
    .select("original_text, post_type, retweeted_text, retweeted_author")
    .eq("id", postId)
    .single();

  if (!post) { res.status(404).json({ error: "Post not found" }); return; }

  try {
    // Pure retweets: translate the retweeted content into Traditional Chinese so users
    // understand the repost, but do NOT generate vocabulary/grammar/culture analysis
    // (the idol added no original commentary to learn from).
    if (post.post_type === "retweet") {
      const translationRaw = await callOpenRouter(buildRetweetedTranslationPrompt(post));
      const translationObj = JSON.parse(translationRaw);
      await supabase
        .from("posts")
        .update({ status: "processed", retweeted_translation: translationObj.translation ?? null })
        .eq("id", postId);
      res.json({ ok: true, retweet_translated: true });
      return;
    }

    const aiCalls: [Promise<string>, Promise<string>, Promise<string | null>] = [
      callOpenRouter(buildSummaryPrompt(post)),
      callOpenRouter(buildFullAnalysisPrompt(post)),
      // For quote reposts, also translate the quoted source post
      post.post_type === "quote_repost" && post.retweeted_text
        ? callOpenRouter(buildRetweetedTranslationPrompt(post))
        : Promise.resolve(null),
    ];

    const [summaryRaw, fullAnalysisRaw, retweetedTranslationRaw] = await Promise.all(aiCalls);

    const summaryObj = JSON.parse(summaryRaw);
    const fullAnalysis = JSON.parse(fullAnalysisRaw);

    const { error: upsertError } = await supabase.from("post_analysis").upsert({
      post_id: postId,
      summary: summaryObj.summary,
      ...fullAnalysis,
      model_used: "openai/gpt-4o",
    });

    if (upsertError) { res.status(500).json({ error: upsertError.message }); return; }

    const retweetedTranslation = retweetedTranslationRaw
      ? (JSON.parse(retweetedTranslationRaw) as { translation?: string }).translation ?? null
      : null;

    await supabase.from("posts").update({
      status: "processed",
      ...(retweetedTranslation !== null ? { retweeted_translation: retweetedTranslation } : {}),
    }).eq("id", postId);

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;


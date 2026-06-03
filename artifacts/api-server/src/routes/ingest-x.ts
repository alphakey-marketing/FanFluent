/**
 * Phase 2: Automated X (Twitter) timeline ingestion
 *
 * POST /api/ingest/x
 * Admin-only endpoint that fetches the idol's latest tweets from the X v2 API,
 * maps each tweet's `referenced_tweets` type to a FanFluent `post_type`, and
 * upserts them into the `posts` table.
 *
 * Required environment variables:
 *   X_BEARER_TOKEN        — X API v2 bearer token (read-only app token)
 *   X_IDOL_USER_ID        — numeric user ID of the idol account to ingest
 *   X_MAX_RESULTS         — optional, defaults to 20 (max 100)
 *
 * The endpoint is idempotent: it uses the tweet's `source_url` as a unique key
 * via upsert (conflict on source_url). Run it on a schedule (e.g., every 15 min)
 * or trigger it manually from the admin panel.
 */

import { Router } from "express";
import { createSupabaseClient } from "../lib/supabase";

const router = Router();

// ── X API v2 types (minimal subset) ────────────────────────────────────────

interface XTweet {
  id: string;
  text: string;
  created_at?: string;
  referenced_tweets?: Array<{
    type: "retweeted" | "quoted" | "replied_to";
    id: string;
  }>;
  attachments?: {
    media_keys?: string[];
  };
}

interface XMedia {
  media_key: string;
  type: string;
  url?: string;           // photo URL (present for type: photo)
  preview_image_url?: string;
}

interface XTimelineResponse {
  data?: XTweet[];
  includes?: {
    tweets?: XTweet[];   // expanded referenced tweets
    media?: XMedia[];
  };
  meta?: {
    newest_id?: string;
    oldest_id?: string;
    result_count?: number;
  };
  errors?: Array<{ message: string }>;
}

// ── X post_type mapping ─────────────────────────────────────────────────────

type FanFluentPostType = "post" | "reply" | "retweet" | "quote_repost";

function resolvePostType(tweet: XTweet): FanFluentPostType {
  if (!tweet.referenced_tweets || tweet.referenced_tweets.length === 0) {
    return "post";
  }
  const types = tweet.referenced_tweets.map((r) => r.type);
  if (types.includes("retweeted")) return "retweet";
  if (types.includes("quoted")) return "quote_repost";
  if (types.includes("replied_to")) return "reply";
  return "post";
}

// Strip the "RT @handle: " prefix that X prepends to retweeted text
function stripRetweetPrefix(text: string): string {
  return text.replace(/^RT @[^:]+: /, "");
}

// ── Fetch helpers ───────────────────────────────────────────────────────────

async function fetchXTimeline(userId: string, maxResults = 20): Promise<XTimelineResponse> {
  const params = new URLSearchParams({
    max_results: String(Math.min(maxResults, 100)),
    "tweet.fields": "created_at,referenced_tweets,attachments",
    expansions: "referenced_tweets.id,attachments.media_keys",
    "media.fields": "url,preview_image_url,type",
  });

  const res = await fetch(
    `https://api.twitter.com/2/users/${userId}/tweets?${params}`,
    {
      headers: {
        Authorization: "Bearer " + process.env["X_BEARER_TOKEN"],
      },
    },
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`X API error ${res.status}: ${body}`);
  }

  return res.json() as Promise<XTimelineResponse>;
}

// ── Route ──────────────────────────────────────────────────────────────────

// POST /api/ingest/x
router.post("/ingest/x", async (req, res) => {
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

  const idolUserId = process.env["X_IDOL_USER_ID"];
  if (!idolUserId) {
    res.status(500).json({ error: "X_IDOL_USER_ID env var not configured" });
    return;
  }

  const bearerToken = process.env["X_BEARER_TOKEN"];
  if (!bearerToken) {
    res.status(500).json({ error: "X_BEARER_TOKEN env var not configured" });
    return;
  }

  const maxResults = Number(process.env["X_MAX_RESULTS"] ?? "20");

  try {
    const timeline = await fetchXTimeline(idolUserId, maxResults);

    if (timeline.errors?.length) {
      res.status(502).json({ error: "X API returned errors", details: timeline.errors });
      return;
    }

    const tweets = timeline.data ?? [];
    const referencedTweetMap = new Map<string, XTweet>(
      (timeline.includes?.tweets ?? []).map((t) => [t.id, t]),
    );
    const mediaMap = new Map<string, XMedia>(
      (timeline.includes?.media ?? []).map((m) => [m.media_key, m]),
    );

    let inserted = 0;
    let skipped = 0;

    for (const tweet of tweets) {
      const postType = resolvePostType(tweet);
      const tweetUrl = `https://x.com/i/web/status/${tweet.id}`;

      // Resolve retweeted content for reposts / quote reposts
      let retweetedText: string | null = null;
      let retweetedAuthor: string | null = null;
      let retweetedUrl: string | null = null;

      const refEntry = tweet.referenced_tweets?.[0];
      if (refEntry && (postType === "retweet" || postType === "quote_repost")) {
        const refTweet = referencedTweetMap.get(refEntry.id);
        if (refTweet) {
          retweetedText = refTweet.text;
          retweetedUrl = `https://x.com/i/web/status/${refEntry.id}`;
          // Note: author handle is not available without user expansions in this query.
          // Add expansions=author_id and user.fields to fetch it if needed.
          retweetedAuthor = null;
        }
      }

      // For pure retweets, X duplicates the retweeted text into tweet.text with "RT @…:" prefix.
      // Use only the idol's added commentary (empty for pure RTs).
      const originalText =
        postType === "retweet"
          ? null
          : postType === "quote_repost"
          ? tweet.text.replace(/\s+https:\/\/t\.co\/\S+$/, "").trim() // strip trailing t.co link
          : tweet.text;

      // Resolve first image if present
      const firstMediaKey = tweet.attachments?.media_keys?.[0];
      const media = firstMediaKey ? mediaMap.get(firstMediaKey) : undefined;
      const imageUrl = media?.url ?? media?.preview_image_url ?? null;

      // Pure retweets are auto-skipped (no idol language to analyse)
      const status = postType === "retweet" ? "skipped" : "pending";

      const { error: upsertError } = await supabase
        .from("posts")
        .upsert(
          {
            source_platform: "x",
            source_url: tweetUrl,
            original_text: originalText,
            post_date: tweet.created_at ?? null,
            image_url: imageUrl,
            post_type: postType,
            retweeted_text: retweetedText ? stripRetweetPrefix(retweetedText) : null,
            retweeted_author: retweetedAuthor,
            retweeted_url: retweetedUrl,
            status,
            imported_by: user.id,
          },
          { onConflict: "source_url", ignoreDuplicates: true },
        );

      if (upsertError) {
        // Log and continue rather than aborting the entire batch
        console.error(`Failed to upsert tweet ${tweet.id}:`, upsertError.message);
        skipped++;
      } else {
        inserted++;
      }
    }

    res.json({ ok: true, inserted, skipped, total: tweets.length });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;

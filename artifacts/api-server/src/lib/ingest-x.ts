/**
 * Shared X (Twitter) ingestion logic used by both the admin HTTP route
 * (POST /api/ingest/x) and the server-side scheduler.
 *
 * The ingest logic is broken out here so the scheduler can run without
 * needing a user bearer token — it uses the Supabase admin client
 * (service role key) instead.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

// ── X API v2 types (minimal subset) ─────────────────────────────────────────

export interface XTweet {
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

export interface XMedia {
  media_key: string;
  type: string;
  url?: string;           // photo URL (present for type: photo)
  preview_image_url?: string;
}

export interface XTimelineResponse {
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

export interface IngestResult {
  total: number;
  newly_imported: number;
  duplicates_skipped: number;
  failed: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

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

export async function fetchXTimeline(userId: string, maxResults = 20): Promise<XTimelineResponse> {
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

/**
 * Core ingest function. Accepts any Supabase client (user-scoped or admin/service-role).
 * When called from the scheduler, pass `createAdminClient()` so the run is not tied to
 * a specific user login session.  In that case `importedBy` should be `null`.
 */
export async function runXIngest(
  supabase: SupabaseClient,
  importedBy: string | null,
): Promise<IngestResult> {
  const idolUserId = process.env["X_IDOL_USER_ID"];
  if (!idolUserId) throw new Error("X_IDOL_USER_ID env var not configured");

  const bearerToken = process.env["X_BEARER_TOKEN"];
  if (!bearerToken) throw new Error("X_BEARER_TOKEN env var not configured");

  const maxResults = Number(process.env["X_MAX_RESULTS"] ?? "20");

  const timeline = await fetchXTimeline(idolUserId, maxResults);

  if (timeline.errors?.length) {
    throw new Error("X API returned errors: " + JSON.stringify(timeline.errors));
  }

  const tweets = timeline.data ?? [];
  const referencedTweetMap = new Map<string, XTweet>(
    (timeline.includes?.tweets ?? []).map((t) => [t.id, t]),
  );
  const mediaMap = new Map<string, XMedia>(
    (timeline.includes?.media ?? []).map((m) => [m.media_key, m]),
  );

  let newly_imported = 0;
  let duplicates_skipped = 0;
  let failed = 0;

  for (const tweet of tweets) {
    const postType = resolvePostType(tweet);
    const tweetUrl = `https://x.com/i/web/status/${tweet.id}`;

    // Idempotency check: skip if this tweet URL already exists
    const { data: existing, error: lookupError } = await supabase
      .from("posts")
      .select("id")
      .eq("source_url", tweetUrl)
      .maybeSingle();

    if (lookupError) {
      console.error(`[ingest-x] Failed to check duplicate for tweet ${tweet.id}:`, lookupError.message);
      failed++;
      continue;
    }

    if (existing) {
      duplicates_skipped++;
      continue;
    }

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

    // All post types start as "pending" — awaiting admin review & AI processing before publish
    const { error: insertError } = await supabase
      .from("posts")
      .insert({
        source_platform: "x",
        source_url: tweetUrl,
        original_text: originalText,
        post_date: tweet.created_at ?? null,
        image_url: imageUrl,
        post_type: postType,
        retweeted_text: retweetedText ? stripRetweetPrefix(retweetedText) : null,
        retweeted_author: retweetedAuthor,
        retweeted_url: retweetedUrl,
        status: "pending",
        imported_by: importedBy,
      });

    if (insertError) {
      console.error(`[ingest-x] Failed to insert tweet ${tweet.id}:`, insertError.message);
      failed++;
    } else {
      newly_imported++;
    }
  }

  return { total: tweets.length, newly_imported, duplicates_skipped, failed };
}

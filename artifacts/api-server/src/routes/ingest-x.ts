/**
 * Phase 2: Automated X (Twitter) timeline ingestion
 *
 * POST /api/ingest/x
 * Admin-only endpoint that fetches the idol's latest tweets from the X v2 API,
 * maps each tweet's `referenced_tweets` type to a FanFluent `post_type`, and
 * inserts new ones into the `posts` table (duplicates are skipped by source_url check).
 *
 * Required environment variables:
 *   X_BEARER_TOKEN        — X API v2 bearer token (read-only app token)
 *   X_IDOL_USER_ID        — numeric user ID of the idol account to ingest
 *   X_MAX_RESULTS         — optional, defaults to 20 (max 100)
 *
 * The endpoint is idempotent. Run it on a schedule (e.g., every 15 min)
 * or trigger it manually from the admin panel.
 */

import { Router } from "express";
import { createSupabaseClient } from "../lib/supabase";
import { runXIngest } from "../lib/ingest-x";

const router = Router();

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

  try {
    const result = await runXIngest(supabase, user.id);
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;

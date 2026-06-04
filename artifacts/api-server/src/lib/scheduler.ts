// Server-side X ingest scheduler
/**
 * Server-side X ingest scheduler
 *
 * Runs the X timeline ingest automatically at a defined interval.
 * Uses the Supabase service-role (admin) client so the job is NOT tied
 * to any user's browser login session.
 *
 * Required environment variables:
 *   X_BEARER_TOKEN          — X API v2 bearer token
 *   X_IDOL_USER_ID          — numeric user ID of the idol account
 *   X_INGEST_INTERVAL_MS    — scheduler interval in milliseconds
 *                             (default: 900000 = 15 minutes)
 *                             Set to 0 to disable the scheduler.
 *
 * Ingested posts are inserted with status "pending" so they wait in the
 * admin review queue before being published.  Duplicate source_urls are
 * skipped so repeated runs are safe.
 */

import { createAdminClient } from "./supabase";
import { runXIngest } from "./ingest-x";
import { logger } from "./logger";

const DEFAULT_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

export function startScheduler(): void {
  const intervalMs = Number(
    process.env["X_INGEST_INTERVAL_MS"] ?? String(DEFAULT_INTERVAL_MS),
  );

  if (intervalMs <= 0) {
    logger.info("[scheduler] X ingest scheduler disabled (X_INGEST_INTERVAL_MS=0)");
    return;
  }

  const idolUserId = process.env["X_IDOL_USER_ID"];
  const bearerToken = process.env["X_BEARER_TOKEN"];

  if (!idolUserId || !bearerToken) {
    logger.warn(
      "[scheduler] X_IDOL_USER_ID or X_BEARER_TOKEN not set — scheduler will not run",
    );
    return;
  }

  logger.info(
    { intervalMs },
    `[scheduler] X ingest scheduler started (interval: ${intervalMs / 1000}s)`,
  );

  const tick = async () => {
    try {
      const supabase = createAdminClient();
      const result = await runXIngest(supabase, null);
      logger.info(result, "[scheduler] X ingest completed");
    } catch (err) {
      logger.error({ err }, "[scheduler] X ingest failed");
    }
  };

  setInterval(tick, intervalMs);
}

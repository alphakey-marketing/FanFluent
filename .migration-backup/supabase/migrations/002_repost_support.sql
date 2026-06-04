-- IdolLearn — Retweet/Repost Support
-- Phase 1: Add post type classification and retweeted content fields to posts
-- Run these SQL statements in the Supabase SQL Editor

-- ============================================================
-- 1. ADD post_type COLUMN
--    'post'        — original post by the idol
--    'reply'       — the idol replying to another post
--    'retweet'     — a pure repost with no added commentary
--    'quote_repost'— a repost with the idol's own commentary added
-- ============================================================
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS post_type TEXT NOT NULL DEFAULT 'post';

-- ============================================================
-- 2. ADD retweeted content COLUMNS
--    retweeted_text   — the body of the quoted/retweeted post
--    retweeted_author — handle or display name of the original author
--    retweeted_url    — direct URL to the original retweeted post
-- ============================================================
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS retweeted_text TEXT;

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS retweeted_author TEXT;

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS retweeted_url TEXT;

-- ============================================================
-- 3. ADD 'skipped' to the status vocabulary
--    Pure retweets with no idol commentary are auto-skipped
--    during AI processing (no learnable idol language present)
-- ============================================================
-- No constraint change needed — status is a free-text column.

-- ============================================================
-- 4. BACKFILL — all existing rows default to 'post', which is correct
--    (they were imported as original posts before this feature existed)
-- ============================================================
UPDATE posts SET post_type = 'post' WHERE post_type IS NULL;

-- ============================================================
-- 5. OPTIONAL INDEX for feed filtering by post_type
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_posts_post_type ON posts (post_type);
CREATE INDEX IF NOT EXISTS idx_posts_status_post_type ON posts (status, post_type);

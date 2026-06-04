-- IdolLearn — Retweeted Content Translation
-- Phase 3: Add AI-generated Traditional Chinese translation for retweeted content
-- Run these SQL statements in the Supabase SQL Editor

-- ============================================================
-- 1. ADD retweeted_translation COLUMN
--    Stores the AI-generated Traditional Chinese translation of
--    the retweeted or quoted post, so users can understand the
--    context of a retweet or quote repost.
-- ============================================================
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS retweeted_translation TEXT;

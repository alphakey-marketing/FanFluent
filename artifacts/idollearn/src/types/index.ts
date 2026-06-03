export type UserTier = "free" | "paid" | "admin";

export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  tier: UserTier;
  ls_customer_id: string | null;
  ls_order_id: string | null;
  created_at: string;
}

export type SourcePlatform = "x" | "instagram";
export type PostStatus = "pending" | "processed" | "published" | "skipped";
export type PostType = "post" | "reply" | "retweet" | "quote_repost";

export interface Post {
  id: string;
  idol_id: string;
  source_platform: SourcePlatform;
  source_url: string | null;
  original_text: string;
  post_date: string | null;
  image_url: string | null;
  tags: string[] | null;
  status: PostStatus;
  post_type: PostType;
  retweeted_text: string | null;
  retweeted_author: string | null;
  retweeted_url: string | null;
  created_at: string;
  imported_by: string | null;
}

export interface VocabItem {
  word: string;
  reading: string;
  romaji: string;
  meaning_zh: string;
  meaning_en: string;
  word_type: string;
  origin: string;
  usage_note: string;
  example_sentence: string;
}

export interface PostAnalysis {
  id: string;
  post_id: string;
  summary: string;
  full_translation: string | null;
  vocab_breakdown: VocabItem[] | null;
  culture_notes: string | null;
  grammar_notes: string | null;
  language_origin: string | null;
  model_used: string | null;
  created_at: string;
}

export interface FreeAnalysis {
  summary: string;
}

export type AnalysisResponse = PostAnalysis | FreeAnalysis;

export interface PostWithAnalysis extends Post {
  post_analysis?: PostAnalysis | null;
}

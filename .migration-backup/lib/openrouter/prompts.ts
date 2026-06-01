export const buildSummaryPrompt = (originalText: string): string => `
You are a Japanese language assistant. 
Read the following Japanese social media post by a Japanese actor.
Return ONLY a JSON object in this format:
{
  "summary": "A 1-2 sentence plain-language summary in Traditional Chinese (繁體中文)"
}

Post:
"""
${originalText}
"""
`;

export const buildFullAnalysisPrompt = (originalText: string): string => `
You are a Japanese language and culture expert. 
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
"""
`;

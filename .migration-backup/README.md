# Idol Language Learning App — MVP Technical Specification
**Version:** 0.1 (Phase 1 Private Beta)
**Test Idol:** 武田航平 (Takeda Kouhei)
**Stack:** Next.js 15 + TypeScript + Supabase + OpenRouter + Lemon Squeezy + shadcn/ui + Tailwind v4

***

## 1. Overview

A Progressive Web App (PWA) that extracts social media posts from a single idol account (武田航平 on X/Instagram), runs them through an AI pipeline, and delivers free summaries and paid vocabulary/culture breakdowns to a closed group of fans. Phase 1 is entirely manually operated — no automated scraping — and distributed via a private invite link.

***

## 2. Tech Stack Summary

| Layer | Choice | Rationale |
|---|---|---|
| Framework | Next.js 15 (App Router) + TypeScript | Team already knows React/TS; SSR + API Routes in one repo |
| Styling | Tailwind v4 + shadcn/ui | Fast component scaffolding, full ownership of generated code |
| Database + Auth | Supabase (Postgres + Auth) | Free tier, Row-Level Security for free/paid gating, built-in auth |
| AI Layer | OpenRouter.ai | Already familiar; model-agnostic, one API key for all LLMs |
| Payments | Lemon Squeezy | Simple checkout links, handles tax, no backend complexity at MVP |
| Hosting | Vercel | Free tier, one-click deploy from GitHub, Next.js native |
| PWA | next-pwa / built-in Next.js PWA | Installable via browser, no App Store submission needed |

***

## 3. Project Folder Structure

```
idol-learn-app/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout (fonts, PWA meta, theme provider)
│   ├── page.tsx                  # Landing / login gate
│   ├── feed/
│   │   └── page.tsx              # Post feed (free tier)
│   ├── post/
│   │   └── [id]/
│   │       └── page.tsx          # Individual post deep-dive (paid)
│   ├── auth/
│   │   ├── login/page.tsx
│   │   └── callback/route.ts     # Supabase OAuth callback
│   ├── admin/
│   │   └── page.tsx              # Manual post import panel (content team only)
│   └── api/
│       ├── process-post/route.ts # Triggers OpenRouter AI pipeline
│       └── webhook/
│           └── lemonsqueezy/route.ts  # Payment webhook → upgrade user tier
├── components/
│   ├── ui/                       # shadcn/ui auto-generated components
│   ├── PostCard.tsx              # Free summary card component
│   ├── VocabBreakdown.tsx        # Paid: word-by-word breakdown table
│   ├── CultureNote.tsx           # Paid: cultural context panel
│   ├── GrammarHighlight.tsx      # Paid: grammar pattern annotations
│   ├── PaywallBanner.tsx         # Upgrade CTA shown to free users
│   └── AdminPostForm.tsx         # Manual import form (admin only)
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser Supabase client
│   │   └── server.ts             # Server Supabase client (API routes)
│   ├── openrouter/
│   │   ├── client.ts             # OpenRouter fetch wrapper
│   │   └── prompts.ts            # All AI prompt templates
│   ├── lemonsqueezy/
│   │   └── client.ts             # Checkout URL generator + webhook verifier
│   └── utils.ts                  # Shared helpers
├── types/
│   └── index.ts                  # Shared TypeScript interfaces
├── public/
│   ├── manifest.json             # PWA manifest
│   ├── icons/                    # PWA icons (192x192, 512x512)
│   └── sw.js                     # Service worker (offline support)
├── middleware.ts                 # Route protection (auth + paid gating)
├── .env.local                    # Environment variables (never commit)
└── next.config.ts                # Next.js + PWA config
```

***

## 4. Supabase Database Schema

### Table: `profiles`
Extends Supabase `auth.users`. Created automatically on user sign-up via a trigger.

```sql
CREATE TABLE profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        TEXT,
  display_name TEXT,
  tier         TEXT NOT NULL DEFAULT 'free',  -- 'free' | 'paid'
  ls_customer_id TEXT,                        -- Lemon Squeezy customer ID
  ls_order_id    TEXT,                        -- Lemon Squeezy order ID (for buyout)
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Row-Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
```

### Table: `posts`
Stores manually imported idol posts.

```sql
CREATE TABLE posts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idol_id         TEXT NOT NULL DEFAULT 'takeda_kouhei',
  source_platform TEXT NOT NULL,              -- 'x' | 'instagram'
  source_url      TEXT,
  original_text   TEXT NOT NULL,
  post_date       TIMESTAMPTZ,
  image_url       TEXT,
  tags            TEXT[],                     -- e.g. ['daily_life', 'work']
  status          TEXT DEFAULT 'pending',     -- 'pending' | 'processed' | 'published'
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  imported_by     UUID REFERENCES profiles(id)
);

-- Public posts readable by all authenticated users
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read published posts" ON posts
  FOR SELECT USING (auth.role() = 'authenticated' AND status = 'published');
CREATE POLICY "Admin can do everything" ON posts
  USING (auth.jwt() ->> 'role' = 'admin');
```

### Table: `post_analysis`
Stores AI-generated content per post. Free users see only `summary`. Paid users see all fields.

```sql
CREATE TABLE post_analysis (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id         UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  summary         TEXT NOT NULL,             -- FREE tier: 1-2 sentence summary
  full_translation TEXT,                     -- PAID: full natural translation
  vocab_breakdown JSONB,                     -- PAID: array of vocab items (see below)
  culture_notes   TEXT,                      -- PAID: cultural context
  grammar_notes   TEXT,                      -- PAID: grammar patterns
  language_origin TEXT,                      -- PAID: etymology highlights
  model_used      TEXT,                      -- e.g. 'openai/gpt-4o'
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: free users can only select summary column
-- This is enforced at the API layer (not column-level RLS — Postgres doesn't support that)
-- API route checks user tier before returning full analysis object

ALTER TABLE post_analysis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read analysis" ON post_analysis
  FOR SELECT USING (auth.role() = 'authenticated');
```

#### `vocab_breakdown` JSONB structure
```json
[
  {
    "word": "ゆるふわ",
    "reading": "ゆるふわ",
    "romaji": "yurufuwa",
    "meaning_zh": "慵懶輕柔（形容髮型或態度）",
    "meaning_en": "soft and loose (used for hair or attitude)",
    "word_type": "adjective / slang",
    "origin": "Compound of ゆるい (loose/relaxed) + ふわふわ (fluffy)",
    "usage_note": "Popular Japanese beauty/lifestyle slang since ~2010s",
    "example_sentence": "ゆるふわヘアが流行っています。"
  }
]
```

***

## 5. OpenRouter AI Pipeline

### Environment Variable
```
OPENROUTER_API_KEY=sk-or-...
```

### `lib/openrouter/client.ts`
```typescript
export async function callOpenRouter(
  prompt: string,
  model: string = "openai/gpt-4o"
): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `******
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }, // enforce JSON output
    }),
  });
  const data = await res.json();
  return data.choices[0].message.content;
}
```

### `lib/openrouter/prompts.ts`

#### Free Tier — Summary Prompt
```typescript
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
```

#### Paid Tier — Full Analysis Prompt
```typescript
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
```

### `app/api/process-post/route.ts`
```typescript
import { createServerClient } from "@/lib/supabase/server";
import { callOpenRouter } from "@/lib/openrouter/client";
import { buildSummaryPrompt, buildFullAnalysisPrompt } from "@/lib/openrouter/prompts";

export async function POST(req: Request) {
  const supabase = createServerClient();
  const { postId } = await req.json();

  // Auth check: admin only
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // Fetch post
  const { data: post } = await supabase
    .from("posts")
    .select("original_text")
    .eq("id", postId)
    .single();

  if (!post) return Response.json({ error: "Post not found" }, { status: 404 });

  // Run both prompts in parallel
  const [summaryRaw, fullAnalysisRaw] = await Promise.all([
    callOpenRouter(buildSummaryPrompt(post.original_text)),
    callOpenRouter(buildFullAnalysisPrompt(post.original_text)),
  ]);

  const summary = JSON.parse(summaryRaw);
  const fullAnalysis = JSON.parse(fullAnalysisRaw);

  // Save to post_analysis
  await supabase.from("post_analysis").upsert({
    post_id: postId,
    summary: summary.summary,
    ...fullAnalysis,
    model_used: "openai/gpt-4o",
  });

  // Update post status to 'processed'
  await supabase.from("posts").update({ status: "processed" }).eq("id", postId);

  return Response.json({ ok: true });
}
```

***

## 6. Free vs. Paid Gating

Gating is enforced at the **API layer**, not the DB. The API route checks the user's `tier` before returning the full `post_analysis` object.

### Middleware — Route Protection (`middleware.ts`)
```typescript
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const { data: { session } } = await supabase.auth.getSession();

  // Protect /feed and /post/* routes — must be logged in
  if (!session && req.nextUrl.pathname.startsWith("/feed")) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  // Protect /admin route
  if (req.nextUrl.pathname.startsWith("/admin")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("tier")
      .eq("id", session?.user.id)
      .single();
    if (profile?.tier !== "admin") {
      return NextResponse.redirect(new URL("/feed", req.url));
    }
  }

  return res;
}

export const config = {
  matcher: ["/feed/:path*", "/post/:path*", "/admin/:path*"],
};
```

### API Route — Tier Check Pattern
```typescript
// In /app/api/post-analysis/[id]/route.ts
const { data: profile } = await supabase
  .from("profiles")
  .select("tier")
  .eq("id", user.id)
  .single();

const analysis = await supabase
  .from("post_analysis")
  .select("*")
  .eq("post_id", params.id)
  .single();

if (profile.tier === "free") {
  // Return only summary
  return Response.json({ summary: analysis.data.summary });
} else {
  // Return full object
  return Response.json(analysis.data);
}
```

***

## 7. Lemon Squeezy Integration

### Setup
1. Create a Lemon Squeezy store
2. Create two products:
   - **Monthly subscription** (e.g. HKD 38/month)
   - **Lifetime buyout** (e.g. HKD 188 one-time)
3. Set webhook URL to: `https://your-app.vercel.app/api/webhook/lemonsqueezy`

### Environment Variables
```
LEMONSQUEEZY_SIGNING_SECRET=your_webhook_secret
LEMONSQUEEZY_MONTHLY_VARIANT_ID=xxxx
LEMONSQUEEZY_LIFETIME_VARIANT_ID=xxxx
```

### Webhook Handler (`app/api/webhook/lemonsqueezy/route.ts`)
```typescript
import { createServerClient } from "@/lib/supabase/server";
import crypto from "crypto";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("x-signature");

  // Verify webhook signature
  const hash = crypto
    .createHmac("sha256", process.env.LEMONSQUEEZY_SIGNING_SECRET!)
    .update(body)
    .digest("hex");

  if (hash !== signature) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(body);
  const supabase = createServerClient();

  if (
    event.meta.event_name === "order_created" ||
    event.meta.event_name === "subscription_created"
  ) {
    const customerEmail = event.data.attributes.user_email;

    // Find user by email and upgrade tier
    const { data: user } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", customerEmail)
      .single();

    if (user) {
      await supabase
        .from("profiles")
        .update({
          tier: "paid",
          ls_customer_id: event.data.attributes.customer_id?.toString(),
          ls_order_id: event.data.id?.toString(),
        })
        .eq("id", user.id);
    }
  }

  return Response.json({ ok: true });
}
```

***

## 8. PWA Configuration

### `public/manifest.json`
```json
{
  "name": "IdolLearn",
  "short_name": "IdolLearn",
  "description": "Learn Japanese through your favourite idol's posts",
  "start_url": "/feed",
  "display": "standalone",
  "background_color": "#f7f6f2",
  "theme_color": "#01696f",
  "orientation": "portrait",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

### `app/layout.tsx` — PWA Meta Tags
```typescript
export const metadata = {
  title: "IdolLearn",
  description: "Learn Japanese through idol posts",
  manifest: "/manifest.json",
  themeColor: "#01696f",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "IdolLearn",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1, // prevents iOS zoom on input focus
  },
};
```

***

## 9. Key UI Components

### PostCard (Free Tier)
- Shows: idol avatar, original Japanese text, post date, platform badge (X / Instagram)
- Shows: AI summary in Traditional Chinese (1-2 sentences)
- Shows: "🔒 View full breakdown" CTA → triggers paywall or navigates to `/post/[id]`

### Post Detail Page `/post/[id]` (Paid Tier)
Sections rendered in order:
1. **Original Post** — raw Japanese text with furigana (rendered via `ruby` HTML tags)
2. **Full Translation** — natural Chinese translation
3. **Vocab Breakdown** — table: word | reading | meaning | origin | usage note
4. **Culture Notes** — expandable panel
5. **Grammar Highlights** — expandable panel
6. **Language Origin** — expandable panel
7. **Flashcard Export** (future) — "Save to flashcard deck" button

### Admin Post Import Panel `/admin`
- Text area: paste raw Japanese post text
- Fields: source platform (dropdown), source URL, post date, image URL
- Button: "Import & Process" → POST to `/api/process-post`
- Table: list of all posts with status badges (pending / processed / published)
- Per-row actions: Process, Publish, Unpublish

***

## 10. Environment Variables Reference

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxx
SUPABASE_SERVICE_ROLE_KEY=xxxx   # server-side only, never expose to client

# OpenRouter
OPENROUTER_API_KEY=sk-or-xxxx
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app

# Lemon Squeezy
LEMONSQUEEZY_SIGNING_SECRET=xxxx
LEMONSQUEEZY_MONTHLY_VARIANT_ID=xxxx
LEMONSQUEEZY_LIFETIME_VARIANT_ID=xxxx
```

***

## 11. Phase 1 MVP — What Is and Is NOT in Scope

### In Scope
- Manual post import by content team (no scraping)
- One idol: 武田航平
- AI-generated summary (free) + full analysis (paid)
- Free vs. paid tier toggle via Lemon Squeezy payment
- Auth: email/password via Supabase Auth
- Private beta: share link only, no public signup page
- PWA installable on iOS/Android via browser

### Out of Scope (Phase 2+)
- Automated X/Instagram API post extraction
- Multiple idols
- Flashcard deck / spaced repetition
- Push notifications
- Anime / doujin content
- Public marketing funnel / traffic acquisition
- Native iOS / Android apps

***

## 12. Phase 1 Launch Checklist

- [ ] Supabase project created, tables + RLS policies set up
- [ ] Vercel project linked to GitHub repo, env vars added
- [ ] OpenRouter API key added, prompts tested on 3–5 sample posts
- [ ] Lemon Squeezy store created, products + webhook configured
- [ ] PWA manifest + icons added, tested on iOS Safari "Add to Home Screen"
- [ ] Admin panel working: import → process → publish flow end-to-end
- [ ] Free vs. paid gating verified: free user sees only summary
- [ ] Payment flow tested: checkout → webhook → tier upgrade
- [ ] 3–5 posts published, app shared with closed fan group
- [ ] Feedback collection method ready (e.g. Google Form or Notion)

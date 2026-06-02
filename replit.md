# IdolLearn (FanFluent)

A Japanese language learning platform where users study through real social media posts from idol 武田航平. Users log in, read posts with AI-powered analysis, and upgrade to Pro or MAX membership for full breakdowns.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/idollearn run dev` — run the frontend (port 21337)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages

## Required Secrets

| Secret | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL (frontend) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key (frontend) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (API server, webhooks) |
| `OPENROUTER_API_KEY` | OpenRouter API key for AI post analysis |
| `LEMONSQUEEZY_SIGNING_SECRET` | LemonSqueezy webhook signing secret |
| `VITE_LEMONSQUEEZY_MONTHLY_VARIANT_ID` | Pro Membership variant ID (frontend checkout URL) |
| `VITE_LEMONSQUEEZY_LIFETIME_VARIANT_ID` | MAX Membership variant ID (frontend checkout URL) |

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS v4, wouter (routing)
- API: Express 5 (port 8080)
- Auth + DB: Supabase (@supabase/ssr + @supabase/supabase-js)
- Payments: LemonSqueezy (checkout links + webhook)
- AI analysis: OpenRouter API
- Build: esbuild (CJS bundle for API server)

## Where things live

- `artifacts/idollearn/src/pages/` — all page components (home, login, feed, post-detail, admin, auth-callback)
- `artifacts/idollearn/src/components/` — PaywallBanner, PostCard, VocabBreakdown, GrammarHighlight, CultureNote, AdminPostForm
- `artifacts/idollearn/src/lib/supabase/client.ts` — Supabase browser client
- `artifacts/api-server/src/routes/` — admin-posts, process-post, post-analysis, webhook-lemonsqueezy
- `artifacts/api-server/src/lib/supabase.ts` — Supabase server client (service role)

## Architecture decisions

- Wouter replaces Next.js router; all `next/link` and `next/navigation` replaced with wouter equivalents
- Supabase handles auth entirely (no custom sessions); `@supabase/ssr` used for SSR-compatible cookie handling
- LemonSqueezy checkout URLs built client-side from `VITE_LEMONSQUEEZY_*` env vars (variant IDs are not sensitive)
- Express API server is separate artifact on port 8080; frontend proxies `/api/*` to it via Vite config
- AI post analysis runs server-side via OpenRouter to keep the API key off the client

## Product

- **Home** — marketing landing with login CTA
- **Login** — Supabase email/password auth
- **Feed** — paginated list of published posts (authenticated)
- **Post detail** — full post with free AI summary; Pro/MAX members see full translation, vocab, grammar, culture notes
- **Paywall** — two upgrade tiers: Pro Membership (monthly) and MAX Membership (lifetime)
- **Admin** — import posts, trigger AI analysis, publish/unpublish

## LemonSqueezy products

- **Pro Membership** (monthly variant) — unlimited fan-powered lessons, expanded vocab packs, ad-free learning
- **MAX Membership** (lifetime variant) — everything in Pro + early access, advanced grammar deep-dives, community challenges, native speaker sessions

## User preferences

- Brand color: `#01696f` (teal), background: `#f7f6f2` (off-white)
- UI language: Traditional Chinese (zh-TW) for user-facing text; English for product tier names

## Gotchas

- Vite only exposes env vars prefixed with `VITE_` to the browser — LemonSqueezy variant IDs must use `VITE_LEMONSQUEEZY_*` names
- API server reads `VITE_SUPABASE_URL` (falls back to `SUPABASE_URL`) — same secret works for both artifacts
- `postcss.config.mjs` must NOT exist alongside `@tailwindcss/vite` (Tailwind v4 handles PostCSS internally)

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details

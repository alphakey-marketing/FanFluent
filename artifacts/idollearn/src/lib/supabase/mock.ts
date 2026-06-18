/**
 * Local-only mock of the Supabase client + API server, used when no real
 * Supabase credentials are configured. Lets you log in with ANY email/password
 * and browse the app (feed, post detail, paywall) with sample data.
 *
 * Tier is derived from the email you log in with:
 *   - admin@...  -> "admin" (sees 管理 button + full analysis)
 *   - free@...   -> "free"  (sees paywall / mosaic teaser)
 *   - anything else -> "paid" (sees full analysis)
 */
import type { Post, PostAnalysis, UserTier } from "@/types";

const STORAGE_KEY = "mock-auth-user";

interface MockUser {
  id: string;
  email: string;
  tier: UserTier;
}

function tierForEmail(email: string): UserTier {
  const e = email.toLowerCase();
  if (e.startsWith("admin@")) return "admin";
  if (e.startsWith("free@")) return "free";
  return "paid";
}

function loadUser(): MockUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MockUser) : null;
  } catch {
    return null;
  }
}

function saveUser(user: MockUser | null) {
  if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  else localStorage.removeItem(STORAGE_KEY);
}

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const POSTS: Post[] = [
  {
    id: "post-1",
    idol_id: "takeda",
    source_platform: "x",
    source_url: "https://x.com/takeda/status/1",
    original_text:
      "おはようございます！今日は朝から撮影でした。みんなも良い一日を過ごしてね😊 #武田航平",
    post_date: "2026-06-15T08:30:00Z",
    image_url: null,
    tags: ["朝", "撮影"],
    status: "published",
    post_type: "post",
    retweeted_text: null,
    retweeted_author: null,
    retweeted_url: null,
    retweeted_translation: null,
    created_at: "2026-06-15T08:30:00Z",
    imported_by: null,
  },
  {
    id: "post-2",
    idol_id: "takeda",
    source_platform: "instagram",
    source_url: "https://instagram.com/p/2",
    original_text:
      "舞台のお稽古、無事に終わりました。本番まであと少し、頑張ります！応援よろしくお願いします🔥",
    post_date: "2026-06-14T12:00:00Z",
    image_url: null,
    tags: ["舞台", "稽古"],
    status: "published",
    post_type: "post",
    retweeted_text: null,
    retweeted_author: null,
    retweeted_url: null,
    retweeted_translation: null,
    created_at: "2026-06-14T12:00:00Z",
    imported_by: null,
  },
  {
    id: "post-3",
    idol_id: "takeda",
    source_platform: "x",
    source_url: "https://x.com/takeda/status/3",
    original_text: "これ本当に嬉しいニュース！みんなありがとう🙏",
    post_date: "2026-06-13T19:45:00Z",
    image_url: null,
    tags: null,
    status: "published",
    post_type: "quote_repost",
    retweeted_text: "新作ドラマへの出演が決定しました！",
    retweeted_author: "@official_drama",
    retweeted_url: "https://x.com/official_drama/status/99",
    retweeted_translation: "新剧演出确定！",
    created_at: "2026-06-13T19:45:00Z",
    imported_by: null,
  },
];

const ANALYSES: Record<string, PostAnalysis> = {
  "post-1": {
    id: "an-1",
    post_id: "post-1",
    summary: "武田航平早上向粉丝问好，分享今天一早就在拍摄，并祝大家有美好的一天。",
    full_translation:
      "早安！今天从一早就开始拍摄了。大家也要度过美好的一天哦😊 #武田航平",
    vocab_breakdown: [
      {
        word: "おはようございます",
        reading: "おはようございます",
        romaji: "ohayō gozaimasu",
        meaning_zh: "早安（礼貌说法）",
        meaning_en: "Good morning (polite)",
        word_type: "寒暄语",
        origin: "和语",
        usage_note: "上午见面时使用的礼貌问候语。",
        example_sentence: "先生、おはようございます。",
      },
      {
        word: "撮影",
        reading: "さつえい",
        romaji: "satsuei",
        meaning_zh: "拍摄、摄影",
        meaning_en: "filming / shooting",
        word_type: "名词",
        origin: "汉语",
        usage_note: "常用于影视、写真的拍摄场景。",
        example_sentence: "今日は映画の撮影があります。",
      },
      {
        word: "過ごす",
        reading: "すごす",
        romaji: "sugosu",
        meaning_zh: "度过（时间）",
        meaning_en: "to spend (time)",
        word_type: "动词（五段）",
        origin: "和语",
        usage_note: "表达如何度过一段时间。",
        example_sentence: "良い週末を過ごしてください。",
      },
    ],
    culture_notes:
      "日本艺人习惯每天向粉丝问候，营造亲近感。「良い一日を」是常见的祝福语，源自日常礼仪文化，体现了对他人的关怀。",
    grammar_notes:
      "「〜てね」是「〜てください」的口语化亲昵形式，用于对熟悉的人提出温和请求或叮咛。例如「気をつけてね」=要小心哦。",
    language_origin: "标准日语（敬体与口语混合），带有偶像与粉丝互动的亲切语气。",
    model_used: "mock",
    created_at: "2026-06-15T08:31:00Z",
  },
  "post-2": {
    id: "an-2",
    post_id: "post-2",
    summary: "武田航平表示舞台排练顺利结束，距离正式演出不远，会继续努力，并请大家多多支持。",
    full_translation:
      "舞台的排练顺利结束了。距离正式演出还有一点时间，我会加油的！请大家多多支持🔥",
    vocab_breakdown: [
      {
        word: "お稽古",
        reading: "おけいこ",
        romaji: "okeiko",
        meaning_zh: "练习、排练",
        meaning_en: "practice / rehearsal",
        word_type: "名词",
        origin: "和语",
        usage_note: "多用于才艺、舞台等的训练，带「お」更显礼貌。",
        example_sentence: "毎日お稽古に通っています。",
      },
      {
        word: "本番",
        reading: "ほんばん",
        romaji: "honban",
        meaning_zh: "正式演出、正式上场",
        meaning_en: "the real performance / showtime",
        word_type: "名词",
        origin: "汉语",
        usage_note: "与排练相对，指真正的演出或考验。",
        example_sentence: "いよいよ本番です。",
      },
    ],
    culture_notes:
      "「よろしくお願いします」是日本文化中极为重要的表达，含有「请多关照」之意，几乎贯穿所有社交场合。",
    grammar_notes:
      "「あと少し」表示「还差一点点」，「あと＋数量／程度」用于表达距离某目标还剩多少。",
    language_origin: "敬体日语，语气积极正面，常见于偶像的舞台动态分享。",
    model_used: "mock",
    created_at: "2026-06-14T12:01:00Z",
  },
};

function teaser(a: PostAnalysis) {
  const cut = (s: string | null, n: number) => (s ? s.slice(0, n) : null);
  const tr = a.full_translation;
  return {
    summary: a.summary,
    is_preview: true as const,
    full_translation: tr ? tr.slice(0, Math.max(12, Math.ceil(tr.length * 0.6))) : null,
    vocab_breakdown: a.vocab_breakdown ? a.vocab_breakdown.slice(0, 3) : null,
    culture_notes: cut(a.culture_notes, 120),
    grammar_notes: cut(a.grammar_notes, 120),
    language_origin: cut(a.language_origin, 120),
  };
}

// ---------------------------------------------------------------------------
// Mock query builder — supports the chains used by feed.tsx / post-detail.tsx
// ---------------------------------------------------------------------------

function queryBuilder(table: string) {
  const filters: Record<string, unknown> = {};
  let inFilter: { col: string; values: unknown[] } | null = null;

  function resolve(single: boolean) {
    let rows: any[] = [];
    if (table === "profiles") {
      const user = loadUser();
      rows = user
        ? [{ id: user.id, email: user.email, display_name: user.email.split("@")[0], tier: user.tier }]
        : [];
    } else if (table === "posts") {
      rows = POSTS.filter((p) => {
        if (filters.status && p.status !== filters.status) return false;
        if (filters.id && p.id !== filters.id) return false;
        return true;
      });
    } else if (table === "post_analysis") {
      const ids = inFilter?.col === "post_id" ? (inFilter.values as string[]) : Object.keys(ANALYSES);
      rows = ids
        .filter((id) => ANALYSES[id])
        .map((id) => ({ post_id: id, summary: ANALYSES[id].summary }));
    }
    if (single) return Promise.resolve({ data: rows[0] ?? null, error: null });
    return Promise.resolve({ data: rows, error: null });
  }

  const builder: any = {
    select() {
      return builder;
    },
    eq(col: string, val: unknown) {
      filters[col] = val;
      return builder;
    },
    in(col: string, values: unknown[]) {
      inFilter = { col, values };
      return builder;
    },
    order() {
      return builder;
    },
    single() {
      return resolve(true);
    },
    then(onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) {
      return resolve(false).then(onFulfilled, onRejected);
    },
  };
  return builder;
}

// ---------------------------------------------------------------------------
// Mock Supabase client
// ---------------------------------------------------------------------------

export function createMockClient() {
  return {
    auth: {
      async signInWithPassword({ email, password }: { email: string; password: string }) {
        if (!email || !password) {
          return { data: { user: null }, error: { message: "請輸入電子郵件與密碼" } };
        }
        const user: MockUser = { id: `mock-${email}`, email, tier: tierForEmail(email) };
        saveUser(user);
        return { data: { user }, error: null };
      },
      async signUp({ email, password }: { email: string; password: string }) {
        if (!email || !password) {
          return { data: { user: null }, error: { message: "請輸入電子郵件與密碼" } };
        }
        // Auto-confirm in mock mode
        const user: MockUser = { id: `mock-${email}`, email, tier: tierForEmail(email) };
        saveUser(user);
        return { data: { user }, error: null };
      },
      async getUser() {
        const user = loadUser();
        return { data: { user: user ? { id: user.id, email: user.email } : null }, error: null };
      },
      async getSession() {
        const user = loadUser();
        return {
          data: { session: user ? { access_token: `mock-token-${user.id}`, user } : null },
          error: null,
        };
      },
      async signOut() {
        saveUser(null);
        return { error: null };
      },
    },
    from(table: string) {
      return queryBuilder(table);
    },
  };
}

// ---------------------------------------------------------------------------
// Mock /api/* — patches window.fetch for the endpoints the frontend calls
// ---------------------------------------------------------------------------

let apiPatched = false;

export function installMockApi() {
  if (apiPatched || typeof window === "undefined") return;
  apiPatched = true;
  const realFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

    if (url.includes("/api/checkout-links")) {
      return new Response(
        JSON.stringify({ pro: "https://example.com/checkout/pro", max: "https://example.com/checkout/max" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    const m = url.match(/\/api\/post-analysis\/([^/?]+)/);
    if (m) {
      const id = m[1];
      const analysis = ANALYSES[id];
      if (!analysis) {
        return new Response(JSON.stringify({ error: "not found" }), { status: 404 });
      }
      const user = loadUser();
      const isPaid = user?.tier === "paid" || user?.tier === "admin";
      const body = isPaid ? analysis : teaser(analysis);
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return realFetch(input as any, init);
  };
}

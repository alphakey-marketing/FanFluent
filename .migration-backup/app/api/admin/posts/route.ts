import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function requireAdmin() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("tier")
    .eq("id", user.id)
    .single();

  return { supabase, user, profile };
}

export async function GET() {
  const { supabase, user, profile } = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (profile?.tier !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: posts, error } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ posts });
}

export async function POST(req: Request) {
  const { supabase, user, profile } = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (profile?.tier !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { original_text, source_platform, source_url, post_date, image_url } = body;

  if (!original_text || !source_platform) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { data: post, error } = await supabase
    .from("posts")
    .insert({
      original_text,
      source_platform,
      source_url: source_url || null,
      post_date: post_date || null,
      image_url: image_url || null,
      imported_by: user.id,
      status: "pending",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ post }, { status: 201 });
}

export async function PATCH(req: Request) {
  const { supabase, user, profile } = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (profile?.tier !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { postId, status } = await req.json();
  if (!postId || !status) {
    return NextResponse.json({ error: "Missing postId or status" }, { status: 400 });
  }

  const { error } = await supabase
    .from("posts")
    .update({ status })
    .eq("id", postId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

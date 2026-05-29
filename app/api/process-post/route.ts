import { createServerClient } from "@/lib/supabase/server";
import { callOpenRouter } from "@/lib/openrouter/client";
import {
  buildSummaryPrompt,
  buildFullAnalysisPrompt,
} from "@/lib/openrouter/prompts";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("tier")
    .eq("id", user.id)
    .single();

  if (profile?.tier !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { postId } = await req.json();
  if (!postId) {
    return NextResponse.json({ error: "Missing postId" }, { status: 400 });
  }

  const { data: post } = await supabase
    .from("posts")
    .select("original_text")
    .eq("id", postId)
    .single();

  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  const [summaryRaw, fullAnalysisRaw] = await Promise.all([
    callOpenRouter(buildSummaryPrompt(post.original_text)),
    callOpenRouter(buildFullAnalysisPrompt(post.original_text)),
  ]);

  const summaryObj = JSON.parse(summaryRaw);
  const fullAnalysis = JSON.parse(fullAnalysisRaw);

  const { error: upsertError } = await supabase.from("post_analysis").upsert({
    post_id: postId,
    summary: summaryObj.summary,
    ...fullAnalysis,
    model_used: "openai/gpt-4o",
  });

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  await supabase.from("posts").update({ status: "processed" }).eq("id", postId);

  return NextResponse.json({ ok: true });
}

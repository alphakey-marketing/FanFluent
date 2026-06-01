import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("x-signature");

  if (!process.env.LEMONSQUEEZY_SIGNING_SECRET) {
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  const hash = crypto
    .createHmac("sha256", process.env.LEMONSQUEEZY_SIGNING_SECRET)
    .update(body)
    .digest("hex");

  if (hash !== signature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(body);
  const supabase = await createAdminClient();

  if (
    event.meta.event_name === "order_created" ||
    event.meta.event_name === "subscription_created"
  ) {
    const customerEmail = event.data.attributes.user_email as string;

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", customerEmail)
      .single();

    if (profile) {
      await supabase
        .from("profiles")
        .update({
          tier: "paid",
          ls_customer_id: String(event.data.attributes.customer_id ?? ""),
          ls_order_id: String(event.data.id ?? ""),
        })
        .eq("id", profile.id);
    }
  }

  return NextResponse.json({ ok: true });
}

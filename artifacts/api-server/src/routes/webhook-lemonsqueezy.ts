import { Router } from "express";
import { createAdminClient } from "../lib/supabase";
import crypto from "crypto";

const router = Router();

// POST /api/webhook/lemonsqueezy
router.post("/webhook/lemonsqueezy", async (req, res) => {
  const body = JSON.stringify(req.body);
  const signature = req.headers["x-signature"] as string | undefined;

  if (!process.env["LEMONSQUEEZY_SIGNING_SECRET"]) {
    res.status(500).json({ error: "Webhook secret not configured" });
    return;
  }

  const hash = crypto
    .createHmac("sha256", process.env["LEMONSQUEEZY_SIGNING_SECRET"])
    .update(body)
    .digest("hex");

  if (hash !== signature) {
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  const event = req.body;
  const supabase = createAdminClient();

  if (
    event.meta?.event_name === "order_created" ||
    event.meta?.event_name === "subscription_created"
  ) {
    const customerEmail = event.data?.attributes?.user_email as string;

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
          ls_customer_id: String(event.data?.attributes?.customer_id ?? ""),
          ls_order_id: String(event.data?.id ?? ""),
        })
        .eq("id", profile.id);
    }
  }

  res.json({ ok: true });
});

export default router;

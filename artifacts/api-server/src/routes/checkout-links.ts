import { Router } from "express";

const router = Router();

const BASE = "https://fanfluent.lemonsqueezy.com/checkout/buy/";

// GET /api/checkout-links — returns LemonSqueezy checkout URLs from server-side env
router.get("/checkout-links", (_req, res) => {
  const proId = process.env["LEMONSQUEEZY_PRO_VARIANT_ID"];
  const maxId = process.env["LEMONSQUEEZY_MAX_VARIANT_ID"];

  res.json({
    pro: proId ? BASE + proId : null,
    max: maxId ? BASE + maxId : null,
  });
});

export default router;

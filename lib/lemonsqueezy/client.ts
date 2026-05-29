export function getLemonSqueezyCheckoutUrl(variantId: string): string {
  const base = "https://fanfluent.lemonsqueezy.com/checkout/buy";
  return `${base}/${variantId}`;
}

export function getMonthlyCheckoutUrl(): string {
  return getLemonSqueezyCheckoutUrl(
    process.env.LEMONSQUEEZY_MONTHLY_VARIANT_ID!
  );
}

export function getLifetimeCheckoutUrl(): string {
  return getLemonSqueezyCheckoutUrl(
    process.env.LEMONSQUEEZY_LIFETIME_VARIANT_ID!
  );
}

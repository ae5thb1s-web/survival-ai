import { origin, stripe, stripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";

// Startet die Bezahlung bei Stripe und gibt die Checkout-URL zurück.
export async function POST(req: Request) {
  if (!stripeConfigured()) return new Response("Das Abo ist noch nicht eingerichtet.", { status: 503 });
  const base = origin(req);
  try {
    const s = await stripe("POST", "/checkout/sessions", {
      mode: "subscription",
      "line_items[0][price]": process.env.STRIPE_PRICE_ID,
      "line_items[0][quantity]": 1,
      success_url: base + "/api/checkout/success?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: base + "/#premium",
      locale: "auto",
      allow_promotion_codes: true,
      billing_address_collection: "auto",
    });
    return Response.json({ url: s.url });
  } catch (e) {
    console.error("Checkout-Fehler:", e);
    return new Response("Die Bezahlung konnte nicht gestartet werden. Bitte versuch es später erneut.", { status: 502 });
  }
}

import { origin, setCookie, signAccess, stripe, stripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Stripe leitet nach erfolgreicher Zahlung hierher. Wir prüfen die Zahlung und schalten Premium frei.
export async function GET(req: Request) {
  const base = origin(req);
  const id = new URL(req.url).searchParams.get("session_id");
  if (!id || !stripeConfigured()) return Response.redirect(base + "/#premium", 303);
  try {
    const s = await stripe("GET", "/checkout/sessions/" + encodeURIComponent(id));
    if (s.status !== "complete" || !s.subscription || !s.customer) throw new Error("nicht abgeschlossen");
    const token = signAccess({ c: String(s.customer), s: String(s.subscription) });
    return new Response(null, { status: 303, headers: { Location: base + "/?willkommen=1#premium", "Set-Cookie": setCookie(token) } });
  } catch (e) {
    console.error("Checkout-Bestätigung fehlgeschlagen:", e);
    return Response.redirect(base + "/?fehler=zahlung#premium", 303);
  }
}

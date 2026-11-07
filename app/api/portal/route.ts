import { cookieFrom, origin, readAccess, stripe, stripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Öffnet das Stripe-Kundenportal (Zahlungsdaten ändern, Rechnungen, kündigen).
export async function GET(req: Request) {
  const base = origin(req);
  const a = readAccess(cookieFrom(req));
  if (stripeConfigured() && a) {
    try {
      const p = await stripe("POST", "/billing_portal/sessions", { customer: a.c, return_url: base + "/#premium" });
      return Response.redirect(p.url, 303);
    } catch (e) {
      console.error("Portal-Fehler:", e);
    }
  }
  return Response.redirect(process.env.STRIPE_PORTAL_LOGIN_URL || base + "/#kuendigen", 303);
}

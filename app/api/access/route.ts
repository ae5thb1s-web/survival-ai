import { cookieFrom, premiumFrom, priceLabel, readAccess, setCookie, stripeConfigured, subscriptionActive } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Status: Ist das Abo eingerichtet? Hat dieser Besucher Premium?
export async function GET(req: Request) {
  const a = await premiumFrom(req);
  return Response.json(
    { configured: stripeConfigured(), premium: !!a, price: await priceLabel(), code: a ? cookieFrom(req) : null },
    { headers: { "Cache-Control": "no-store" } },
  );
}

// Zugangscode auf einem anderen Gerät eingeben
export async function POST(req: Request) {
  let code = "";
  try { code = String((await req.json())?.code || "").trim(); } catch {}
  const a = readAccess(code);
  if (!a || !stripeConfigured() || !(await subscriptionActive(a.s))) {
    return new Response("Der Code ist ungültig oder das Abo ist nicht mehr aktiv.", { status: 400 });
  }
  return Response.json({ premium: true }, { headers: { "Set-Cookie": setCookie(code) } });
}

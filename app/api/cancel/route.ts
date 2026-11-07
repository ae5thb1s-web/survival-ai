import { stripe, stripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";

// Kündigungsbutton nach § 312k BGB: Kündigung ohne Login über Name + E-Mail.
// Das Abo wird zum Ende des bezahlten Zeitraums beendet.
const tries = new Map<string, { n: number; reset: number }>();

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const t = tries.get(ip);
  if (t && t.reset > Date.now() && t.n >= 10) return new Response("Zu viele Versuche. Bitte später erneut.", { status: 429 });
  tries.set(ip, t && t.reset > Date.now() ? { n: t.n + 1, reset: t.reset } : { n: 1, reset: Date.now() + 3600_000 });

  let name = "", email = "", kind = "ordentlich";
  try {
    const b = await req.json();
    name = String(b?.name || "").trim().slice(0, 200);
    email = String(b?.email || "").trim().toLowerCase().slice(0, 200);
    kind = b?.kind === "ausserordentlich" ? "außerordentlich" : "ordentlich";
  } catch {}
  if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return new Response("Bitte gib deinen Namen und die E-Mail-Adresse deines Abos an.", { status: 400 });
  }
  const received = new Date().toLocaleString("de-DE", { timeZone: "Europe/Berlin" });
  let ends: string[] = [];
  if (stripeConfigured()) {
    try {
      const customers = await stripe("GET", "/customers", { email, limit: 10 });
      for (const c of customers.data || []) {
        const subs = await stripe("GET", "/subscriptions", { customer: c.id, status: "active", limit: 20 });
        for (const s of subs.data || []) {
          const upd = await stripe("POST", "/subscriptions/" + s.id, {
            cancel_at_period_end: true,
            "metadata[kuendigung]": `${kind} am ${received} durch ${name}`,
          });
          const end = upd.cancel_at || upd.current_period_end || upd.items?.data?.[0]?.current_period_end;
          if (end) ends.push(new Date(end * 1000).toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" }));
        }
      }
    } catch (e) {
      console.error("Kündigungs-Fehler:", e);
    }
  }
  console.log(`Kündigung eingegangen: ${kind}, ${received}, ${name}, ${email}, gefunden: ${ends.length}`);
  // Aus Datenschutzgründen sagen wir nicht, ob zu dieser E-Mail ein Abo existiert.
  return Response.json({ received, kind, ends });
}

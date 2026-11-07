// Kleine Stripe-Anbindung über die REST-API (kein zusätzliches Paket nötig).
// Benötigte Umgebungsvariablen in Hostinger:
//   STRIPE_SECRET_KEY  (sk_live_... bzw. zum Testen sk_test_...)
//   STRIPE_PRICE_ID    (price_... des Abo-Preises)
// Optional: STRIPE_PORTAL_LOGIN_URL (Kundenportal-Link aus Stripe), ACCESS_SECRET
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const stripeConfigured = () =>
  !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID);

type Params = Record<string, string | number | boolean | undefined>;

export async function stripe<T = any>(
  method: "GET" | "POST" | "DELETE",
  path: string,
  params: Params = {},
): Promise<T> {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined) body.append(k, String(v));
  const qs = method === "GET" && body.toString() ? "?" + body.toString() : "";
  const res = await fetch("https://api.stripe.com/v1" + path + qs, {
    method,
    headers: {
      Authorization: "Bearer " + process.env.STRIPE_SECRET_KEY,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: method === "GET" ? undefined : body,
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || "Stripe-Fehler " + res.status);
  return json as T;
}

// ---------- Zugangs-Token (signiert, im Cookie gespeichert) ----------
const secret = () =>
  process.env.ACCESS_SECRET ||
  createHash("sha256").update("survival-ai-access:" + (process.env.STRIPE_SECRET_KEY || "") + (process.env.ANTHROPIC_API_KEY || "")).digest("hex");

export type Access = { c: string; s: string };

export function signAccess(a: Access): string {
  const payload = Buffer.from(JSON.stringify(a)).toString("base64url");
  const sig = createHmac("sha256", secret()).update(payload).digest("base64url");
  return payload + "." + sig;
}

export function readAccess(token: string | undefined | null): Access | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expect = createHmac("sha256", secret()).update(payload).digest("base64url");
  const a = Buffer.from(sig), b = Buffer.from(expect);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const v = JSON.parse(Buffer.from(payload, "base64url").toString());
    return typeof v?.c === "string" && typeof v?.s === "string" ? v : null;
  } catch {
    return null;
  }
}

export const COOKIE = "sai_access";

export function cookieFrom(req: Request): string | null {
  const raw = req.headers.get("cookie") || "";
  const m = raw.match(/(?:^|;\s*)sai_access=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export const setCookie = (token: string) =>
  `${COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax`;

// ---------- Abo-Status (30 Minuten zwischengespeichert) ----------
const subCache = new Map<string, { ok: boolean; until: number }>();

export async function subscriptionActive(subId: string): Promise<boolean> {
  const hit = subCache.get(subId);
  if (hit && hit.until > Date.now()) return hit.ok;
  let ok = false;
  try {
    const sub = await stripe("GET", "/subscriptions/" + encodeURIComponent(subId));
    ok = sub.status === "active" || sub.status === "trialing";
  } catch {
    ok = hit?.ok ?? false; // bei Stripe-Störung letzten Stand nutzen
  }
  subCache.set(subId, { ok, until: Date.now() + 30 * 60 * 1000 });
  return ok;
}

export async function premiumFrom(req: Request): Promise<Access | null> {
  if (!stripeConfigured()) return null;
  const a = readAccess(cookieFrom(req));
  if (!a) return null;
  return (await subscriptionActive(a.s)) ? a : null;
}

export function origin(req: Request): string {
  const h = req.headers;
  const host = h.get("x-forwarded-host") || h.get("host");
  const proto = h.get("x-forwarded-proto") || "https";
  return host ? `${proto.split(",")[0]}://${host.split(",")[0]}` : new URL(req.url).origin;
}

// ---------- Preis für die Anzeige ----------
let priceCache: { label: string; until: number } | null = null;
export async function priceLabel(): Promise<string | null> {
  if (!stripeConfigured()) return null;
  if (priceCache && priceCache.until > Date.now()) return priceCache.label;
  try {
    const p = await stripe("GET", "/prices/" + encodeURIComponent(process.env.STRIPE_PRICE_ID!));
    const amount = new Intl.NumberFormat("de-DE", { style: "currency", currency: p.currency.toUpperCase() }).format(p.unit_amount / 100);
    const per = { day: "Tag", week: "Woche", month: "Monat", year: "Jahr" }[p.recurring?.interval as string] || "";
    const label = per ? `${amount} / ${per}` : amount;
    priceCache = { label, until: Date.now() + 60 * 60 * 1000 };
    return label;
  } catch {
    return null;
  }
}

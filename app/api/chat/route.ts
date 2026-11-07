import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "@/lib/systemPrompt";
import { premiumFrom } from "@/lib/stripe";

export const runtime = "nodejs";
export const maxDuration = 60;

const client = new Anthropic(); // liest ANTHROPIC_API_KEY aus der Umgebung

type ChatMessage = { role: "user" | "assistant"; content: string };

const MAX_MESSAGES = 30;
const MAX_CHARS = 4000;

// Einfaches Rate-Limit pro IP (im Speicher, reicht für den Start)
const hits = new Map<string, { count: number; reset: number }>();
const LIMIT = 30; // Anfragen
const WINDOW_MS = 10 * 60 * 1000; // pro 10 Minuten

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || entry.reset < now) {
    hits.set(ip, { count: 1, reset: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > LIMIT;
}

function validate(body: unknown): ChatMessage[] | null {
  if (!body || typeof body !== "object") return null;
  const msgs = (body as { messages?: unknown }).messages;
  if (!Array.isArray(msgs) || msgs.length === 0) return null;
  const clean: ChatMessage[] = [];
  for (const m of msgs.slice(-MAX_MESSAGES)) {
    if (
      !m ||
      (m.role !== "user" && m.role !== "assistant") ||
      typeof m.content !== "string" ||
      !m.content.trim()
    )
      return null;
    clean.push({ role: m.role, content: m.content.slice(0, MAX_CHARS) });
  }
  // Muss mit einer Nutzernachricht beginnen und enden
  while (clean.length && clean[0].role !== "user") clean.shift();
  if (!clean.length || clean[clean.length - 1].role !== "user") return null;
  return clean;
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      "Der Server ist noch nicht eingerichtet: ANTHROPIC_API_KEY fehlt.",
      { status: 500 },
    );
  }

  // Die KI ist nur mit aktivem Abo nutzbar (schützt dein API-Guthaben).
  if (!(await premiumFrom(req))) {
    return new Response("PREMIUM_REQUIRED", { status: 402 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (rateLimited(ip)) {
    return new Response(
      "Zu viele Anfragen. Bitte warte ein paar Minuten. Bei einem echten Notfall: 112 anrufen!",
      { status: 429 },
    );
  }

  let messages: ChatMessage[] | null = null;
  try {
    messages = validate(await req.json());
  } catch {
    /* ungültiges JSON */
  }
  if (!messages) return new Response("Ungültige Anfrage.", { status: 400 });
  const lang = /^[a-z]{2}$/.test(new URL(req.url).searchParams.get("lang") || "") ? new URL(req.url).searchParams.get("lang")! : "de";

  const stream = client.beta.messages.stream({
    model: "claude-opus-5-5",
    max_tokens: 4000,
    output_config: { effort: "low" }, // schnelle Antworten für den Chat
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system:
      SYSTEM_PROMPT +
      (lang !== "de"
        ? `\n\nThe user has chosen the website language "${lang}". Answer in that language unless they write in another one. Use the local emergency number (112 in the EU, 911 in USA/Canada, 999 in the UK) where it fits.`
        : ""),
    messages,
  });

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") {
          controller.enqueue(
            encoder.encode(
              "\n\nDazu kann ich leider keine Antwort geben. Bei einem Notfall: **112** anrufen.",
            ),
          );
        }
      } catch (err) {
        console.error("Claude API Fehler:", err);
        controller.enqueue(
          encoder.encode(
            "\n\n⚠️ Verbindung zur KI fehlgeschlagen. Bitte versuche es erneut. Bei einem echten Notfall: **112** anrufen.",
          ),
        );
      } finally {
        controller.close();
      }
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}

# Survival AI 🌲

Eine Website, auf der Nutzer eine KI fragen können, wie sie in einer Survival-Situation überleben.
Gebaut mit **Next.js 15** und der **Claude API** (Modell `claude-opus-5-5`).

## Funktionen
- Seitenleiste mit Startseite, AI-Chat, Wissensdatenbank, Survival Map (Übungskarte), Erste Hilfe, Notfall-Plan und Profil
- Hell/Dunkel-Umschalter
- AI-Chat mit Live-Antworten (Streaming), Notfall-Plan-Generator mit KI
- Checkliste „Vor jeder Tour“ und Notfallkarte im Profil (nur lokal im Browser gespeichert)
- Sicherheitsregeln im System-Prompt (`lib/systemPrompt.ts`): Notruf 112 bei Notfällen, keine erfundenen Infos zu Erste Hilfe, Giftpflanzen/Pilzen und Wasseraufbereitung
- Notruf-Hinweis (112) auf jeder Seite
- Einfaches Rate-Limit pro IP (20 Anfragen / 10 Minuten), damit dein API-Guthaben geschützt ist

## Lokal starten
```bash
npm install
cp .env.example .env.local   # dann deinen Schlüssel eintragen
npm run dev
```
Dann http://localhost:3000 öffnen.

Den API-Schlüssel bekommst du unter https://console.anthropic.com/ (Settings → API Keys).

## Online stellen mit Vercel (kostenlos)
1. Lege auf GitHub ein neues Repository an und lade diesen Ordner hoch.
2. Gehe auf https://vercel.com → **Add New → Project** → Repository auswählen.
3. Unter **Environment Variables** `ANTHROPIC_API_KEY` mit deinem Schlüssel eintragen.
4. **Deploy** klicken. Fertig – du bekommst eine Adresse wie `survival-ai.vercel.app`.

## Aufbau
- `site/site.html`: die komplette Oberfläche (HTML, CSS, JavaScript). Beim Start/Build wird daraus automatisch `public/index.html` erzeugt (`npm run site`).
- `app/api/chat/route.ts`: Server-Route, die mit der Claude API spricht (dein Schlüssel bleibt auf dem Server).
- `lib/systemPrompt.ts`: Verhalten und Sicherheitsregeln der KI.

## Anpassen
- Texte, Themen, Wissensartikel, Erste-Hilfe-Inhalte, Karte: Abschnitt „Daten“ im Skript von `site/site.html`
- Farben: Block `:root` oben in `site/site.html`
- Modell / Antwortlänge: `app/api/chat/route.ts`

## Geld verdienen und Pflichtangaben

Oben im `<script>` von `site/site.html` steht `CONFIG`:

- `amazonTag`: deine Amazon-PartnerNet-ID (z. B. `deinname-21`). Dann bekommen alle Links auf der Seite „Ausrüstung“ deine Provision, und der Werbehinweis erscheint automatisch.
- `impressum`: Name, Straße, PLZ/Ort, E-Mail (Pflicht in Deutschland). Sie erscheinen im Impressum und in der Datenschutzerklärung.

Google-Optimierung (Titel, Beschreibung, Vorschaubild `public/og.png`, `robots.txt`, `sitemap.xml`, App-Icons) erzeugt `site/build.mjs`.

## Premium-Abo (Stripe)

Der KI-Chat und der Notfall-Plan funktionieren nur mit aktivem Abo. Ohne Stripe-Einstellungen ist die KI gesperrt (kein API-Guthaben wird verbraucht).

Umgebungsvariablen in Hostinger (Web-App → Einstellungen → Umgebungsvariablen):

- `STRIPE_SECRET_KEY`: geheimer Schlüssel aus Stripe (Entwickler → API-Schlüssel)
- `STRIPE_PRICE_ID`: ID des monatlichen Preises (`price_...`) deines Produkts „Survival AI Premium“
- optional `STRIPE_PORTAL_LOGIN_URL`: Link zum Stripe-Kundenportal

Routen: `/api/access` (Status, Zugangscode), `/api/checkout` (+ `/success`), `/api/portal`, `/api/cancel` (Kündigungsbutton nach § 312k BGB).

## Sprachen

Übersetzungen liegen in `public/i18n/<sprache>.json` (deutscher Text → Übersetzung). Fehlt ein Eintrag, bleibt Deutsch stehen.

// Baut public/index.html aus site/site.html (gleiche Datei wie die Claude-Vorschau)
// und ergänzt alles, was Google, soziale Netzwerke und Handys brauchen.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const SITE = "https://survivalai.de";
const TITLE = "Survival AI – Dein KI-Überlebens-Guide für Wildnis und Notfall";
const DESC = "Kostenloser KI-Survival-Guide: Frag die KI, wie du Feuer machst, Wasser findest, einen Unterschlupf baust und Erste Hilfe leistest. Mit Notfall-Plan, Wissensdatenbank und Ausrüstungs-Tipps.";

const src = readFileSync(new URL("./site.html", import.meta.url), "utf8");
const cut = src.indexOf("<!-- icon sprite -->");
// Kopfteil (Fonts, CSS) gehört in <head>; <title> und die Vorschau-Meta ersetzen wir.
const headPart = src.slice(0, cut).replace(/<title>.*?<\/title>\s*/s, "").replace(/<meta name="claude:[^>]*>\s*/g, "");
const body = src.slice(cut);

const ld = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebSite", "@id": SITE + "/#website", url: SITE + "/", name: "Survival AI", inLanguage: "de-DE", description: DESC },
    { "@type": "WebApplication", name: "Survival AI", url: SITE + "/", applicationCategory: "LifestyleApplication", operatingSystem: "Alle", inLanguage: "de-DE",
      offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" }, description: DESC },
  ],
};

const html = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${TITLE}</title>
<meta name="description" content="${DESC}">
<meta name="keywords" content="Survival, KI, Überleben, Outdoor, Erste Hilfe, Notfall, Wildnis, Feuer machen, Wasser filtern, Unterschlupf, Notvorrat">
<link rel="canonical" href="${SITE}/">
<meta name="robots" content="index,follow">
<meta name="theme-color" content="#0c100e">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
<meta property="og:type" content="website">
<meta property="og:locale" content="de_DE">
<meta property="og:site_name" content="Survival AI">
<meta property="og:url" content="${SITE}/">
<meta property="og:title" content="${TITLE}">
<meta property="og:description" content="${DESC}">
<meta property="og:image" content="${SITE}/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${TITLE}">
<meta name="twitter:description" content="${DESC}">
<meta name="twitter:image" content="${SITE}/og.png">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
${headPart.trim()}
</head>
<body>
<noscript><h1>Survival AI – Dein KI-Überlebens-Guide</h1><p>${DESC}</p><p>Bitte aktiviere JavaScript, um den KI-Chat zu nutzen. Im Notfall: Notruf 112.</p></noscript>
${body}
</body>
</html>
`;
mkdirSync(new URL("../public/", import.meta.url), { recursive: true });
writeFileSync(new URL("../public/index.html", import.meta.url), html);
console.log("public/index.html geschrieben");

// Baut public/index.html aus site/site.html (gleiche Datei wie die Claude-Vorschau)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const body = readFileSync(new URL("./site.html", import.meta.url), "utf8");
const html = `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#0c100e"><meta name="description" content="Survival AI: dein intelligenter Überlebens-Guide mit KI-Chat, Wissensdatenbank, Erster Hilfe und Notfall-Plan."></head>
<body>
${body}
</body></html>
`;
mkdirSync(new URL("../public/", import.meta.url), { recursive: true });
writeFileSync(new URL("../public/index.html", import.meta.url), html);
console.log("public/index.html geschrieben");

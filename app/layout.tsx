// Die Oberfläche liegt als statische Seite in public/index.html (Quelle: site/site.html).
// Dieses Layout wird nur für Next.js-interne Seiten (z. B. 404) gebraucht.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body style={{ background: "#0c100e", color: "#e9efe9", fontFamily: "system-ui" }}>{children}</body>
    </html>
  );
}

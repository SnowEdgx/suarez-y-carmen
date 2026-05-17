import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: {
    default: "Suárez y Carmen | Academia Online de Bachata",
    template: "%s | Suárez y Carmen",
  },
  description: "La academia online para dominar estilo, sensualidad y musicalidad en bachata con Suárez y Carmen.",
  applicationName: "Suárez y Carmen",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Suárez y Carmen | Academia Online de Bachata",
    description: "Cursos online, clases presenciales y agenda profesional de Suárez y Carmen.",
    type: "website",
    locale: "es_ES",
    siteName: "Suárez y Carmen",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-neutral-950 text-white font-sans">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-red-600 focus:px-5 focus:py-3 focus:text-sm focus:font-semibold focus:text-white focus:shadow-xl"
        >
          Saltar al contenido
        </a>
        {children}
      </body>
    </html>
  );
}

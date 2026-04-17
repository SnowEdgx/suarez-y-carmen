import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Suárez y Carmen | Academia Online de Bachata",
  description: "La academia online definitiva para dominar el estilo, la sensualidad y la musicalidad de la bachata con Suárez y Carmen.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-neutral-950 text-white font-sans">{children}</body>
    </html>
  );
}

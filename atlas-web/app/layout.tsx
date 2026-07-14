import type { Metadata } from "next";
import { Archivo, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-archivo",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-inter",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title:
    "Atlas Soluciones Tecnológicas — Desarrollo web y sistemas a medida para PyMEs y ONGs en Argentina",
  description:
    "Tiendas online sin comisiones, portales de socios, sistemas de turnos y de gestión. Desarrollo a medida para PyMEs y ONGs en Argentina. Precios claros desde USD 300.",
  icons: { icon: "/logo.png" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className="scroll-smooth">
      <body
        className={`${archivo.variable} ${inter.variable} ${jetbrains.variable} bg-bg font-sans text-ink antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

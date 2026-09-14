import type { Metadata } from "next";
import { NavegacionPrincipal } from "@/components/NavegacionPrincipal";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgroRiego — Gestión de riego",
  description:
    "Panel para administrar parcelas, programar riegos y llevar el registro del agua aplicada.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen antialiased">
        <NavegacionPrincipal />
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
        <footer className="texto-suave mx-auto w-full max-w-6xl px-4 pb-8 text-xs sm:px-6">
          AgroRiego · MVP de gestión de riego
        </footer>
      </body>
    </html>
  );
}

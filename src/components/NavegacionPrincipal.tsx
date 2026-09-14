"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ENLACES = [
  { href: "/", etiqueta: "Panel" },
  { href: "/parcelas", etiqueta: "Parcelas" },
  { href: "/riegos", etiqueta: "Riegos" },
  { href: "/historial", etiqueta: "Historial" },
];

export function NavegacionPrincipal() {
  const ruta = usePathname();

  return (
    <header
      className="sticky top-0 z-10 border-b backdrop-blur"
      style={{ borderColor: "var(--borde)", background: "color-mix(in srgb, var(--superficie) 88%, transparent)" }}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-lg bg-campo-600 text-lg">💧</span>
          <span>
            <span className="block text-base font-bold leading-tight">AgroRiego</span>
            <span className="texto-suave block text-xs leading-tight">Gestión de riego</span>
          </span>
        </Link>

        <nav className="-mx-1 flex items-center gap-1 overflow-x-auto">
          {ENLACES.map((enlace) => {
            const activo =
              enlace.href === "/" ? ruta === "/" : ruta.startsWith(enlace.href);
            return (
              <Link
                key={enlace.href}
                href={enlace.href}
                aria-current={activo ? "page" : undefined}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  activo ? "bg-campo-600 text-white" : "texto-suave hover:bg-campo-50 hover:text-campo-800"
                }`}
              >
                {enlace.etiqueta}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

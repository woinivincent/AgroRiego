import Image from "next/image";
import { WA_GENERIC } from "@/lib/site";

const links = [
  { href: "#servicios", label: "Servicios" },
  { href: "#proyectos", label: "Proyectos" },
  { href: "#mantenimiento", label: "Mantenimiento" },
  { href: "#faq", label: "Preguntas" },
];

export default function Nav() {
  return (
    <nav className="sticky top-0 z-50 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-4 px-6 py-3">
        <a href="#inicio" className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="Logo de Atlas Soluciones Tecnológicas" width={36} height={36} />
          <span className="flex flex-col leading-tight">
            <span className="font-display text-[19px] font-extrabold tracking-[0.06em]">
              ATLAS
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-blue">
              Soluciones Tecnológicas
            </span>
          </span>
        </a>
        <div className="flex items-center gap-5">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="hidden font-display text-sm text-mute hover:text-ink md:block"
            >
              {l.label}
            </a>
          ))}
          <a
            href={WA_GENERIC}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-blue px-[18px] py-2.5 font-display text-sm font-semibold text-dark transition hover:bg-blue-hover"
          >
            Hablemos →
          </a>
        </div>
      </div>
    </nav>
  );
}

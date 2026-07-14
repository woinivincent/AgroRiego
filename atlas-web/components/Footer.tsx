import Image from "next/image";
import { SITE } from "@/lib/site";

export default function Footer() {
  return (
    <footer className="border-t border-line bg-deep">
      <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-3 px-6 py-7">
        <span className="flex items-center gap-2.5 font-display font-bold tracking-[0.06em]">
          <Image src="/logo.png" alt="" width={24} height={24} className="opacity-85" />
          ATLAS{" "}
          <small className="text-xs font-normal text-blue">
            Soluciones Tecnológicas
          </small>
        </span>
        <span className="font-mono text-[13px] text-mute">
          {SITE.domain} · Argentina · © {new Date().getFullYear()}
        </span>
      </div>
    </footer>
  );
}

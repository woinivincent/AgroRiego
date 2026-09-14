"use client";

import { useFormStatus } from "react-dom";

export function BotonEnvio({
  children,
  className = "boton-primario",
  textoPendiente = "Guardando…",
}: {
  children: React.ReactNode;
  className?: string;
  textoPendiente?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? textoPendiente : children}
    </button>
  );
}

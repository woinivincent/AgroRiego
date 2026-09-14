"use client";

import { useCallback, useState } from "react";
import { FormularioParcela } from "@/components/FormularioParcela";

export function NuevaParcela({ abiertoPorDefecto = false }: { abiertoPorDefecto?: boolean }) {
  const [abierto, setAbierto] = useState(abiertoPorDefecto);
  const cerrar = useCallback(() => setAbierto(false), []);

  if (!abierto) {
    return (
      <button type="button" className="boton-primario" onClick={() => setAbierto(true)}>
        + Nueva parcela
      </button>
    );
  }

  return (
    <div className="tarjeta">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Nueva parcela</h2>
        <button type="button" className="boton-secundario" onClick={cerrar}>
          Cancelar
        </button>
      </div>
      <FormularioParcela alGuardar={cerrar} />
    </div>
  );
}

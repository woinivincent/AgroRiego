"use client";

import { useState, useTransition } from "react";
import { buscarCoordenadas } from "@/lib/acciones";
import type { Localidad } from "@/lib/clima";

/**
 * Carga de coordenadas sin librería de mapas: GPS del dispositivo, búsqueda por
 * localidad o tipeo a mano. Renderiza los inputs del formulario que lo contiene,
 * así que no abre un <form> propio.
 */
export function SelectorUbicacion({
  latitud,
  longitud,
}: {
  latitud?: number | null;
  longitud?: number | null;
}) {
  const [lat, setLat] = useState(latitud?.toString() ?? "");
  const [lon, setLon] = useState(longitud?.toString() ?? "");
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState<Localidad[]>([]);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  function usarMiUbicacion() {
    if (!navigator.geolocation) {
      setMensaje("Este navegador no permite obtener la ubicación.");
      return;
    }
    setMensaje(null);
    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        setLat(posicion.coords.latitude.toFixed(5));
        setLon(posicion.coords.longitude.toFixed(5));
        setResultados([]);
      },
      (error) => setMensaje(`No se pudo obtener la ubicación: ${error.message}`),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  function buscar() {
    setMensaje(null);
    iniciar(async () => {
      const datos = new FormData();
      datos.set("localidad", busqueda);
      const respuesta = await buscarCoordenadas({}, datos);
      setResultados(respuesta.localidades ?? []);
      if (respuesta.error) setMensaje(respuesta.error);
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="etiqueta" htmlFor="latitud">
            Latitud
          </label>
          <input
            id="latitud"
            name="latitud"
            type="number"
            step="any"
            min="-90"
            max="90"
            className="campo"
            value={lat}
            onChange={(evento) => setLat(evento.target.value)}
            placeholder="-33.0300"
          />
        </div>
        <div>
          <label className="etiqueta" htmlFor="longitud">
            Longitud
          </label>
          <input
            id="longitud"
            name="longitud"
            type="number"
            step="any"
            min="-180"
            max="180"
            className="campo"
            value={lon}
            onChange={(evento) => setLon(evento.target.value)}
            placeholder="-68.8800"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <button type="button" className="boton-secundario" onClick={usarMiUbicacion}>
          Usar mi ubicación
        </button>
        <div className="min-w-48 flex-1">
          <label className="etiqueta" htmlFor="localidad">
            o buscar por localidad
          </label>
          <input
            id="localidad"
            className="campo"
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
            onKeyDown={(evento) => {
              // Enter buscaría la localidad y además enviaría la parcela entera
              if (evento.key !== "Enter") return;
              evento.preventDefault();
              buscar();
            }}
            placeholder="San Rafael, Mendoza"
          />
        </div>
        <button type="button" className="boton-secundario" onClick={buscar} disabled={pendiente}>
          {pendiente ? "Buscando…" : "Buscar"}
        </button>
      </div>

      {resultados.length > 0 && (
        <ul className="grid gap-1">
          {resultados.map((localidad) => (
            <li key={`${localidad.latitud},${localidad.longitud}`}>
              <button
                type="button"
                className="boton-secundario w-full justify-start text-left"
                onClick={() => {
                  setLat(localidad.latitud.toFixed(5));
                  setLon(localidad.longitud.toFixed(5));
                  setResultados([]);
                }}
              >
                {[localidad.nombre, localidad.region, localidad.pais].filter(Boolean).join(", ")}
              </button>
            </li>
          ))}
        </ul>
      )}

      {mensaje && <p className="text-sm text-amber-600">{mensaje}</p>}

      <p className="texto-suave text-xs">
        Sin coordenadas la calculadora usa la ETo de referencia de configuración en lugar del clima
        real de la parcela.
      </p>
    </div>
  );
}

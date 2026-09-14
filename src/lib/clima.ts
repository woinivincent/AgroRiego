// Cliente de Open-Meteo: evapotranspiración de referencia (ETo) y lluvia diaria.
//
// Open-Meteo resuelve la ETo con Penman-Monteith FAO-56 del lado del servidor y
// no pide API key. La respuesta se valida antes de usarse: si la API cambia de
// forma o devuelve algo inesperado, preferimos un error claro a datos mudos.
//
// Límites de la API: la ventana de consulta va de unos 92 días hacia atrás a 16
// hacia adelante. Fuera de eso hay que ir al endpoint de archivo.

const URL_PRONOSTICO = "https://api.open-meteo.com/v1/forecast";
const URL_GEOCODIFICACION = "https://geocoding-api.open-meteo.com/v1/search";

const DIAS_MAX_ATRAS = 92;
const DIAS_MAX_ADELANTE = 16;
const TIEMPO_LIMITE_MS = 15_000;

export type DiaClimaApi = { fecha: string; etoMm: number; lluviaMm: number };

export type Localidad = {
  nombre: string;
  region: string;
  pais: string;
  latitud: number;
  longitud: number;
};

export class ErrorClima extends Error {}

function aFechaISO(fecha: Date) {
  return fecha.toISOString().slice(0, 10);
}

function acotarRango(desde: Date, hasta: Date) {
  const hoy = new Date();
  const minimo = new Date(hoy.getTime() - DIAS_MAX_ATRAS * 86_400_000);
  const maximo = new Date(hoy.getTime() + DIAS_MAX_ADELANTE * 86_400_000);
  return {
    desde: desde < minimo ? minimo : desde,
    hasta: hasta > maximo ? maximo : hasta,
  };
}

async function pedirJson(url: string): Promise<unknown> {
  let respuesta: Response;
  try {
    respuesta = await fetch(url, {
      signal: AbortSignal.timeout(TIEMPO_LIMITE_MS),
      headers: { accept: "application/json" },
    });
  } catch (error) {
    const detalle = error instanceof Error ? error.message : String(error);
    throw new ErrorClima(`No se pudo contactar el servicio de clima: ${detalle}`);
  }

  if (!respuesta.ok) {
    // Open-Meteo devuelve el motivo en el cuerpo incluso con status de error
    const cuerpo = await respuesta.text().catch(() => "");
    const razon = cuerpo.slice(0, 200) || respuesta.statusText;
    throw new ErrorClima(`El servicio de clima respondió ${respuesta.status}: ${razon}`);
  }

  try {
    return await respuesta.json();
  } catch {
    throw new ErrorClima("El servicio de clima devolvió una respuesta que no es JSON.");
  }
}

function esArregloDeNumeros(valor: unknown): valor is (number | null)[] {
  return Array.isArray(valor) && valor.every((x) => x === null || typeof x === "number");
}

/**
 * Devuelve la ETo y la lluvia diarias del rango pedido.
 * Los días que la API deja en null (todavía sin dato) se descartan.
 */
export async function consultarClima(
  latitud: number,
  longitud: number,
  desde: Date,
  hasta: Date,
): Promise<DiaClimaApi[]> {
  if (!Number.isFinite(latitud) || !Number.isFinite(longitud)) {
    throw new ErrorClima("La parcela no tiene coordenadas cargadas.");
  }

  const rango = acotarRango(desde, hasta);
  if (rango.desde > rango.hasta) return [];

  const parametros = new URLSearchParams({
    latitude: String(latitud),
    longitude: String(longitud),
    daily: "et0_fao_evapotranspiration,precipitation_sum",
    timezone: "auto",
    start_date: aFechaISO(rango.desde),
    end_date: aFechaISO(rango.hasta),
  });

  const datos = await pedirJson(`${URL_PRONOSTICO}?${parametros}`);
  if (typeof datos !== "object" || datos === null || !("daily" in datos)) {
    throw new ErrorClima("La respuesta del servicio de clima no trae datos diarios.");
  }

  const diario = (datos as { daily: unknown }).daily;
  if (typeof diario !== "object" || diario === null) {
    throw new ErrorClima("La respuesta del servicio de clima no trae datos diarios.");
  }

  const { time, et0_fao_evapotranspiration: eto, precipitation_sum: lluvia } = diario as Record<
    string,
    unknown
  >;

  if (!Array.isArray(time) || !esArregloDeNumeros(eto)) {
    throw new ErrorClima(
      "El servicio de clima no devolvió la evapotranspiración esperada (et0_fao_evapotranspiration).",
    );
  }

  const lluviaPorDia = esArregloDeNumeros(lluvia) ? lluvia : [];

  const resultado: DiaClimaApi[] = [];
  for (const [indice, fecha] of time.entries()) {
    const etoDia = eto[indice];
    if (typeof fecha !== "string" || typeof etoDia !== "number") continue;
    resultado.push({
      fecha,
      etoMm: etoDia,
      lluviaMm: typeof lluviaPorDia[indice] === "number" ? (lluviaPorDia[indice] as number) : 0,
    });
  }

  return resultado;
}

/** Busca coordenadas por nombre de localidad, para no tener que tipearlas a mano. */
export async function buscarLocalidad(nombre: string): Promise<Localidad[]> {
  const termino = nombre.trim();
  if (termino.length < 2) return [];

  const parametros = new URLSearchParams({
    name: termino,
    count: "5",
    language: "es",
    format: "json",
  });

  const datos = await pedirJson(`${URL_GEOCODIFICACION}?${parametros}`);
  const resultados = (datos as { results?: unknown })?.results;
  if (!Array.isArray(resultados)) return [];

  return resultados.flatMap((cruda): Localidad[] => {
    const item = cruda as Record<string, unknown>;
    if (typeof item.latitude !== "number" || typeof item.longitude !== "number") return [];
    return [
      {
        nombre: typeof item.name === "string" ? item.name : "",
        region: typeof item.admin1 === "string" ? item.admin1 : "",
        pais: typeof item.country === "string" ? item.country : "",
        latitud: item.latitude,
        longitud: item.longitude,
      },
    ];
  });
}

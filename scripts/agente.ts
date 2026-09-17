#!/usr/bin/env tsx
/**
 * Agente de contacto de AgroRiego.
 *
 * Toma la lista de clientes prospectados (el export de Vibe Prospecting),
 * la segmenta, redacta un mensaje por prospecto y lo deja en una bandeja para
 * que una persona lo apruebe. No envía nada: el último paso es humano.
 *
 *   npm run agente -- importar prospectos.csv
 *   npm run agente -- redactar --canal email
 *   npm run agente -- listar --estado BORRADOR
 *   npm run agente -- ver 4f2a
 *   npm run agente -- aprobar 4f2a
 *   npm run agente -- exportar --estado APROBADO --formato md
 */

import { readFileSync } from "node:fs";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  type Bandeja,
  type Entrada,
  type EstadoContacto,
  ESTADOS_CONTACTO,
  ETIQUETA_ESTADO_CONTACTO,
  cambiarEstado,
  filtrar,
  guardarBandeja,
  guardarMensaje,
  importar,
  leerBandeja,
  resolverId,
  resumen,
} from "../src/lib/bandeja";
import {
  CANALES,
  type Canal,
  type Remitente,
  REMITENTE_VACIO,
  redactarMensaje,
} from "../src/lib/mensajes";
import {
  type Prioridad,
  PRIORIDADES,
  type Segmento,
  SEGMENTOS,
  leerProspectos,
  ordenarParaRevision,
} from "../src/lib/prospectos";

const RAIZ = resolve(import.meta.dirname, "..");
const CONFIG_POR_DEFECTO = resolve(RAIZ, "agente.config.json");

type Config = {
  remitente: Remitente;
  bandeja: string;
  canalPorDefecto: Canal;
};

function leerConfig(ruta: string): Config {
  let datos: Partial<Config> = {};
  try {
    datos = JSON.parse(readFileSync(ruta, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    console.error(`Aviso: no encontré ${ruta}; uso valores por defecto sin remitente.`);
  }
  return {
    remitente: { ...REMITENTE_VACIO, ...(datos.remitente ?? {}) },
    bandeja: datos.bandeja ?? "datos/bandeja.json",
    canalPorDefecto: datos.canalPorDefecto ?? "email",
  };
}

// --- argumentos ------------------------------------------------------------

type Opciones = { posicionales: string[]; banderas: Record<string, string | true> };

function parsearArgumentos(argv: string[]): Opciones {
  const posicionales: string[] = [];
  const banderas: Record<string, string | true> = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      posicionales.push(arg);
      continue;
    }
    const [clave, valorPegado] = arg.slice(2).split("=");
    if (valorPegado !== undefined) {
      banderas[clave] = valorPegado;
    } else if (argv[i + 1] && !argv[i + 1].startsWith("--")) {
      banderas[clave] = argv[++i];
    } else {
      banderas[clave] = true;
    }
  }
  return { posicionales, banderas };
}

function textoBandera(opciones: Opciones, clave: string) {
  const valor = opciones.banderas[clave];
  return typeof valor === "string" ? valor : undefined;
}

function opcionDe<T extends string>(valor: string | undefined, validos: readonly T[], etiqueta: string) {
  if (valor === undefined) return undefined;
  const normalizado = valor.toUpperCase();
  const encontrado = validos.find((v) => v.toUpperCase() === normalizado);
  if (!encontrado) {
    throw new Error(`${etiqueta} inválido: ${valor}. Opciones: ${validos.join(", ")}`);
  }
  return encontrado;
}

// --- presentación ----------------------------------------------------------

function recortar(texto: string, largo: number) {
  if (texto.length <= largo) return texto.padEnd(largo);
  return `${texto.slice(0, largo - 1)}…`;
}

function lineaEntrada(entrada: Entrada) {
  const { prospecto, estado, mensaje } = entrada;
  const marca = mensaje?.advertencias.length ? "!" : " ";
  return [
    prospecto.id,
    recortar(prospecto.nombreCompleto || "(sin nombre)", 24),
    recortar(prospecto.empresa || "—", 22),
    recortar(prospecto.segmento, 13),
    recortar(prospecto.prioridad, 5),
    recortar(ETIQUETA_ESTADO_CONTACTO[estado], 10),
    marca,
  ].join("  ");
}

function imprimirTabla(entradas: Entrada[]) {
  if (entradas.length === 0) {
    console.log("No hay prospectos que cumplan ese filtro.");
    return;
  }
  console.log(
    ["id".padEnd(10), "nombre".padEnd(24), "empresa".padEnd(22), "segmento".padEnd(13), "prio".padEnd(5), "estado".padEnd(10), ""].join("  "),
  );
  console.log("-".repeat(94));
  for (const entrada of entradas) console.log(lineaEntrada(entrada));
  console.log(`\n${entradas.length} prospecto(s). El "!" marca mensajes con advertencias.`);
}

function entradasOrdenadas(bandeja: Bandeja, opciones: Opciones) {
  const entradas = filtrar(bandeja, {
    estado: opcionDe(textoBandera(opciones, "estado"), ESTADOS_CONTACTO, "Estado"),
    segmento: opcionDe(textoBandera(opciones, "segmento"), SEGMENTOS, "Segmento") as Segmento | undefined,
    prioridad: opcionDe(textoBandera(opciones, "prioridad"), PRIORIDADES, "Prioridad") as Prioridad | undefined,
    busqueda: textoBandera(opciones, "buscar"),
  });
  const orden = ordenarParaRevision(entradas.map((e) => e.prospecto));
  const porId = new Map(entradas.map((e) => [e.prospecto.id, e]));
  return orden.map((p) => porId.get(p.id)!);
}

// --- comandos --------------------------------------------------------------

function comandoImportar(config: Config, opciones: Opciones) {
  const archivo = opciones.posicionales[0];
  if (!archivo) throw new Error("Falta el archivo: npm run agente -- importar prospectos.csv");

  const contenido = readFileSync(resolve(process.cwd(), archivo), "utf8");
  const prospectos = leerProspectos(contenido, textoBandera(opciones, "origen") ?? archivo);
  if (prospectos.length === 0) throw new Error(`${archivo} no tiene filas con datos`);

  const previa = leerBandeja(config.bandeja);
  const { bandeja, resultado } = importar(previa, prospectos);
  guardarBandeja(config.bandeja, bandeja);

  console.log(`Leí ${prospectos.length} prospecto(s) únicos de ${archivo}.`);
  console.log(`  nuevos:        ${resultado.nuevos}`);
  console.log(`  actualizados:  ${resultado.actualizados}`);
  console.log(`  ya gestionados: ${resultado.intactos} (aprobados, enviados o descartados: no se tocan)`);

  const sinContacto = prospectos.filter((p) => !p.email && !p.telefono && !p.linkedin).length;
  if (sinContacto > 0) {
    console.log(`\nOjo: ${sinContacto} prospecto(s) no tienen email, teléfono ni LinkedIn.`);
  }
  console.log(`\nSiguiente paso: npm run agente -- redactar`);
}

function comandoRedactar(config: Config, opciones: Opciones) {
  const canal = (opcionDe(textoBandera(opciones, "canal"), CANALES, "Canal") ?? config.canalPorDefecto) as Canal;
  const limite = Number(textoBandera(opciones, "limite") ?? Number.POSITIVE_INFINITY);
  const rehacer = Boolean(opciones.banderas.rehacer);

  let bandeja = leerBandeja(config.bandeja);
  const pendientes = entradasOrdenadas(bandeja, opciones)
    .filter((entrada) => entrada.estado === "BORRADOR")
    .filter((entrada) => rehacer || !entrada.mensaje)
    .slice(0, limite);

  if (pendientes.length === 0) {
    console.log("No hay borradores para redactar. Probá con --rehacer o importá más prospectos.");
    return;
  }

  let conAdvertencias = 0;
  for (const entrada of pendientes) {
    const mensaje = redactarMensaje({ prospecto: entrada.prospecto, remitente: config.remitente, canal });
    bandeja = guardarMensaje(bandeja, entrada.prospecto.id, mensaje);
    if (mensaje.advertencias.length) conAdvertencias++;
  }
  guardarBandeja(config.bandeja, bandeja);

  console.log(`Redacté ${pendientes.length} mensaje(s) para ${canal}.`);
  if (conAdvertencias > 0) {
    console.log(`${conAdvertencias} tienen advertencias y no se pueden aprobar sin --forzar.`);
  }
  console.log(`\nRevisalos con: npm run agente -- listar --estado BORRADOR`);
}

function comandoListar(config: Config, opciones: Opciones) {
  imprimirTabla(entradasOrdenadas(leerBandeja(config.bandeja), opciones));
}

function comandoVer(config: Config, opciones: Opciones) {
  const bandeja = leerBandeja(config.bandeja);
  const referencia = opciones.posicionales[0];
  if (!referencia) throw new Error("Falta el id: npm run agente -- ver 4f2a");
  const entrada = bandeja.entradas[resolverId(bandeja, referencia)];
  const { prospecto, mensaje } = entrada;

  console.log(`${prospecto.nombreCompleto || "(sin nombre)"}  [${prospecto.id}]`);
  console.log(`${prospecto.cargo || "sin cargo"} — ${prospecto.empresa || "sin empresa"}`);
  console.log(
    [prospecto.ciudad, prospecto.region, prospecto.pais].filter(Boolean).join(", ") || "sin ubicación",
  );
  console.log(`rubro: ${prospecto.rubro || "—"}   tamaño: ${prospecto.tamanioEmpresa || "—"}`);
  console.log(`email: ${prospecto.email || "—"}   tel: ${prospecto.telefono || "—"}`);
  console.log(`linkedin: ${prospecto.linkedin || "—"}`);
  console.log(`origen: ${prospecto.origen}`);
  console.log(`\nsegmento ${prospecto.segmento} · prioridad ${prospecto.prioridad} · estado ${ETIQUETA_ESTADO_CONTACTO[entrada.estado]}`);
  for (const motivo of prospecto.motivos) console.log(`  · ${motivo}`);

  if (!mensaje) {
    console.log("\nTodavía no tiene mensaje: npm run agente -- redactar");
    return;
  }

  console.log(`\n${"─".repeat(70)}`);
  console.log(`canal: ${mensaje.canal}   variante: ${mensaje.variante}   caracteres: ${mensaje.caracteres}`);
  if (mensaje.asunto) console.log(`asunto: ${mensaje.asunto}`);
  console.log(`${"─".repeat(70)}\n${mensaje.cuerpo}\n${"─".repeat(70)}`);

  if (mensaje.advertencias.length) {
    console.log("\nAdvertencias:");
    for (const advertencia of mensaje.advertencias) console.log(`  ! ${advertencia}`);
  }
  console.log(`\nAprobar: npm run agente -- aprobar ${prospecto.id}`);
}

function idsObjetivo(bandeja: Bandeja, opciones: Opciones, estadoOrigen: EstadoContacto) {
  if (opciones.banderas.todos) {
    return filtrar(bandeja, {
      estado: estadoOrigen,
      segmento: opcionDe(textoBandera(opciones, "segmento"), SEGMENTOS, "Segmento") as Segmento | undefined,
      prioridad: opcionDe(textoBandera(opciones, "prioridad"), PRIORIDADES, "Prioridad") as Prioridad | undefined,
    }).map((entrada) => entrada.prospecto.id);
  }
  if (opciones.posicionales.length === 0) {
    throw new Error("Pasá uno o más ids, o --todos");
  }
  return opciones.posicionales.map((referencia) => resolverId(bandeja, referencia));
}

function comandoTransicion(
  config: Config,
  opciones: Opciones,
  estadoOrigen: EstadoContacto,
  estadoDestino: EstadoContacto,
) {
  let bandeja = leerBandeja(config.bandeja);
  const ids = idsObjetivo(bandeja, opciones, estadoOrigen);
  const forzar = Boolean(opciones.banderas.forzar);
  const nota = textoBandera(opciones, "motivo");

  let aplicados = 0;
  const saltados: string[] = [];

  for (const id of ids) {
    const entrada = bandeja.entradas[id];
    const advertencias = entrada.mensaje?.advertencias ?? [];
    // Aprobar es el paso que compromete: con advertencias hay que forzarlo
    if (estadoDestino === "APROBADO" && advertencias.length > 0 && !forzar) {
      saltados.push(`${id} ${entrada.prospecto.nombreCompleto}: ${advertencias[0]}`);
      continue;
    }
    try {
      bandeja = cambiarEstado(bandeja, id, estadoDestino, { nota });
      aplicados++;
    } catch (error) {
      saltados.push(`${id}: ${(error as Error).message}`);
    }
  }

  guardarBandeja(config.bandeja, bandeja);
  console.log(`${aplicados} prospecto(s) pasaron a ${ETIQUETA_ESTADO_CONTACTO[estadoDestino]}.`);
  if (saltados.length) {
    console.log(`\nSin cambios (${saltados.length}):`);
    for (const linea of saltados) console.log(`  - ${linea}`);
    if (estadoDestino === "APROBADO") console.log("\nPara aprobarlos igual: --forzar");
  }
}

function comandoExportar(config: Config, opciones: Opciones) {
  const bandeja = leerBandeja(config.bandeja);
  const formato = (textoBandera(opciones, "formato") ?? "md").toLowerCase();
  const entradas = entradasOrdenadas(bandeja, {
    ...opciones,
    banderas: { estado: "APROBADO", ...opciones.banderas },
  }).filter((entrada) => entrada.mensaje);

  if (entradas.length === 0) {
    console.log("No hay mensajes para exportar con ese filtro.");
    return;
  }

  const contenido =
    formato === "csv" ? exportarCsv(entradas) : formato === "txt" ? exportarTxt(entradas) : exportarMd(entradas);
  const salida = textoBandera(opciones, "salida");

  if (!salida) {
    console.log(contenido);
    return;
  }
  const ruta = resolve(process.cwd(), salida);
  mkdirSync(dirname(ruta), { recursive: true });
  writeFileSync(ruta, contenido, "utf8");
  console.log(`${entradas.length} mensaje(s) en ${salida}`);
}

function exportarMd(entradas: Entrada[]) {
  return entradas
    .map((entrada) => {
      const { prospecto, mensaje } = entrada;
      const destino = [prospecto.email, prospecto.telefono, prospecto.linkedin].filter(Boolean).join(" · ");
      return [
        `## ${prospecto.nombreCompleto || prospecto.id} — ${prospecto.empresa || "sin empresa"}`,
        "",
        `- **id:** ${prospecto.id}`,
        `- **contacto:** ${destino || "sin datos de contacto"}`,
        `- **canal:** ${mensaje!.canal}`,
        ...(mensaje!.asunto ? [`- **asunto:** ${mensaje!.asunto}`] : []),
        "",
        "```",
        mensaje!.cuerpo,
        "```",
        "",
      ].join("\n");
    })
    .join("\n");
}

function exportarTxt(entradas: Entrada[]) {
  return entradas
    .map((entrada) =>
      [
        `${"=".repeat(70)}`,
        `${entrada.prospecto.nombreCompleto} — ${entrada.prospecto.email || entrada.prospecto.telefono || entrada.prospecto.linkedin}`,
        entrada.mensaje!.asunto ? `Asunto: ${entrada.mensaje!.asunto}` : "",
        "",
        entrada.mensaje!.cuerpo,
        "",
      ]
        .filter((linea) => linea !== "")
        .join("\n"),
    )
    .join("\n");
}

function celdaCsv(valor: string) {
  return `"${valor.replace(/"/g, '""')}"`;
}

function exportarCsv(entradas: Entrada[]) {
  const encabezado = [
    "id",
    "nombre",
    "empresa",
    "cargo",
    "email",
    "telefono",
    "linkedin",
    "segmento",
    "prioridad",
    "canal",
    "asunto",
    "mensaje",
  ];
  const filas = entradas.map((entrada) => {
    const { prospecto, mensaje } = entrada;
    return [
      prospecto.id,
      prospecto.nombreCompleto,
      prospecto.empresa,
      prospecto.cargo,
      prospecto.email,
      prospecto.telefono,
      prospecto.linkedin,
      prospecto.segmento,
      prospecto.prioridad,
      mensaje!.canal,
      mensaje!.asunto,
      mensaje!.cuerpo,
    ].map(celdaCsv);
  });
  return [encabezado.join(","), ...filas.map((fila) => fila.join(","))].join("\n");
}

function comandoEstado(config: Config) {
  const bandeja = leerBandeja(config.bandeja);
  const datos = resumen(bandeja);

  console.log(`Bandeja: ${config.bandeja}`);
  console.log(`Prospectos: ${datos.total}\n`);
  for (const estado of ESTADOS_CONTACTO) {
    console.log(`  ${ETIQUETA_ESTADO_CONTACTO[estado].padEnd(11)} ${datos.conteo[estado]}`);
  }
  if (datos.sinRedactar) console.log(`\n${datos.sinRedactar} borrador(es) sin mensaje: npm run agente -- redactar`);
  if (datos.conAdvertencias) console.log(`${datos.conAdvertencias} mensaje(s) con advertencias.`);
  if (!config.remitente.nombre) {
    console.log("\nFalta cargar el remitente en agente.config.json.");
  }
}

const AYUDA = `Agente de contacto de AgroRiego — redacta, nunca envía.

  npm run agente -- <comando> [opciones]

Comandos
  importar <archivo>      Carga el export de prospectos (.csv o .json)
  redactar                Escribe el mensaje de cada borrador
  listar                  Muestra la bandeja
  ver <id>                Ficha del prospecto y su mensaje completo
  aprobar <id...>         Marca mensajes listos para enviar
  descartar <id...>       Saca prospectos de la cola
  marcar-enviado <id...>  Registra los que ya mandaste a mano
  reabrir <id...>         Devuelve un descartado a borrador
  exportar                Vuelca los mensajes aprobados (md, txt o csv)
  estado                  Resumen de la bandeja

Opciones
  --canal email|whatsapp|linkedin   Formato del mensaje (default: el de la config)
  --estado, --segmento, --prioridad, --buscar   Filtros
  --limite N          Cuántos redactar de una
  --rehacer           Reescribe mensajes ya redactados
  --todos             Aplica a todos los que pasan el filtro
  --forzar            Aprueba aunque el mensaje tenga advertencias
  --motivo "texto"    Nota del movimiento
  --formato md|txt|csv, --salida archivo   Para exportar
  --config archivo    Otra configuración (default: agente.config.json)
`;

function principal() {
  const [comando, ...resto] = process.argv.slice(2);
  const opciones = parsearArgumentos(resto);
  const config = leerConfig(resolve(process.cwd(), textoBandera(opciones, "config") ?? CONFIG_POR_DEFECTO));

  switch (comando) {
    case "importar":
      return comandoImportar(config, opciones);
    case "redactar":
      return comandoRedactar(config, opciones);
    case "listar":
      return comandoListar(config, opciones);
    case "ver":
      return comandoVer(config, opciones);
    case "aprobar":
      return comandoTransicion(config, opciones, "BORRADOR", "APROBADO");
    case "descartar":
      return comandoTransicion(config, opciones, "BORRADOR", "DESCARTADO");
    case "marcar-enviado":
      return comandoTransicion(config, opciones, "APROBADO", "ENVIADO");
    case "reabrir":
      return comandoTransicion(config, opciones, "DESCARTADO", "BORRADOR");
    case "exportar":
      return comandoExportar(config, opciones);
    case "estado":
      return comandoEstado(config);
    case undefined:
    case "ayuda":
    case "--help":
    case "-h":
      return console.log(AYUDA);
    default:
      throw new Error(`Comando desconocido: ${comando}\n\n${AYUDA}`);
  }
}

try {
  principal();
} catch (error) {
  console.error(`Error: ${(error as Error).message}`);
  process.exitCode = 1;
}

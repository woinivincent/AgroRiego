// Prospectos: ingesta y normalización de la lista de clientes prospectados.
//
// La fuente es el export de Vibe Prospecting (CSV o JSON), pero las columnas
// cambian según qué enriquecimientos se hayan pedido, así que acá nada se
// asume: se mapea por alias y lo que no se reconoce queda en `crudo`.

import { createHash } from "node:crypto";

export const SEGMENTOS = ["PRODUCTOR", "RIEGO", "AGROINDUSTRIA", "OTRO"] as const;
export type Segmento = (typeof SEGMENTOS)[number];

export const PRIORIDADES = ["ALTA", "MEDIA", "BAJA"] as const;
export type Prioridad = (typeof PRIORIDADES)[number];

export type Prospecto = {
  // Identificador estable: el mismo prospecto reimportado cae en la misma fila
  id: string;
  nombre: string;
  apellido: string;
  nombreCompleto: string;
  cargo: string;
  empresa: string;
  sitioWeb: string;
  email: string;
  telefono: string;
  linkedin: string;
  pais: string;
  region: string;
  ciudad: string;
  rubro: string;
  tamanioEmpresa: string;
  departamento: string;
  nivel: string;
  origen: string;
  segmento: Segmento;
  prioridad: Prioridad;
  // Por qué quedó en ese segmento y esa prioridad: lo lee quien revisa
  motivos: string[];
  crudo: Record<string, string>;
};

// Alias de columnas: clave canónica -> nombres posibles, ya normalizados
const ALIAS: Record<string, string[]> = {
  nombre: ["first_name", "firstname", "given_name", "nombre"],
  apellido: ["last_name", "lastname", "surname", "family_name", "apellido"],
  nombreCompleto: ["full_name", "fullname", "name", "prospect_name", "nombre_completo"],
  cargo: ["job_title", "title", "position", "cargo", "puesto"],
  empresa: ["company_name", "company", "business_name", "organization", "empresa", "razon_social"],
  sitioWeb: ["company_website", "website", "domain", "company_domain", "web", "sitio_web", "url"],
  email: [
    "professional_email",
    "work_email",
    "email",
    "emails",
    "email_address",
    "correo",
    "correo_electronico",
  ],
  telefono: [
    "phone_number",
    "phone_numbers",
    "phone",
    "mobile_phone",
    "mobile",
    "telefono",
    "celular",
    "whatsapp",
  ],
  linkedin: ["linkedin", "linkedin_url", "linkedin_profile", "prospect_linkedin", "profile_url"],
  pais: ["prospect_country", "country_name", "country", "company_country", "pais"],
  region: [
    "prospect_region",
    "region_name",
    "region",
    "state",
    "company_region",
    "provincia",
    "estado",
  ],
  ciudad: ["prospect_city", "city_name", "city", "company_city", "ciudad", "localidad"],
  rubro: [
    "linkedin_category",
    "naics_description",
    "industry",
    "company_industry",
    "sector",
    "rubro",
  ],
  tamanioEmpresa: ["company_size", "employee_count", "number_of_employees", "size", "tamano"],
  departamento: ["job_department", "department", "departamento"],
  nivel: ["job_seniority_level", "job_level", "seniority", "nivel"],
};

// Rubro y cargo llegan en inglés o en español según la fuente: se buscan las dos
const PALABRAS_PRODUCTOR = [
  "farm",
  "agricultur",
  "agricola",
  "agropecuar",
  "agro",
  "crop",
  "grower",
  "ranch",
  "finca",
  "estancia",
  "chacra",
  "campo",
  "vineyard",
  "vinedo",
  "winer",
  "vitivin",
  "viticult",
  "bodega",
  "olive",
  "olivo",
  "orchard",
  "huerta",
  "greenhouse",
  "invernadero",
  "nursery",
  "vivero",
  "horticult",
  "fruit",
  "frutic",
];

const PALABRAS_RIEGO = [
  "irrigation",
  "riego",
  "sprinkler",
  "aspersion",
  "drip",
  "goteo",
  "pivot",
  "pivote",
  "bombeo",
  "pump",
  "water management",
  "hidraul",
];

const PALABRAS_AGROINDUSTRIA = [
  "food",
  "aliment",
  "packing",
  "empaque",
  "frigorific",
  "cooperativa",
  "agroindustri",
  "molino",
  "aceite",
  "juice",
  "jugo",
  "beverage",
  "exportador",
];

const PALABRAS_DECISOR = [
  "owner",
  "founder",
  "co-founder",
  "ceo",
  "president",
  "partner",
  "socio",
  "dueno",
  "propietario",
  "titular",
  "director",
  "gerente",
  "manager",
  "head",
  "jefe",
  "responsable",
  "encargado",
  "administrador",
  "agronom",
  "production",
  "produccion",
  "operations",
  "operaciones",
];

const NIVELES_DECISOR = [
  "owner",
  "founder",
  "c-suite",
  "president",
  "partner",
  "director",
  "manager",
  "senior manager",
  "vice president",
];

// Quita acentos y deja sólo minúsculas, dígitos y guiones bajos
export function normalizarClave(texto: string) {
  return sinAcentos(texto)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function sinAcentos(texto: string) {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/**
 * Parser CSV (RFC 4180): comillas dobles, comas y saltos de línea dentro del
 * campo, `""` como comilla escapada, BOM y CRLF. Devuelve una fila por registro,
 * con las claves de encabezado normalizadas.
 */
export function parsearCsv(texto: string): Record<string, string>[] {
  const filas = filasCsv(texto);
  if (filas.length === 0) return [];

  const encabezado = filas[0].map(normalizarClave);
  return filas.slice(1).flatMap((celdas) => {
    // Una fila totalmente vacía (el salto final del archivo) no es un registro
    if (celdas.every((celda) => celda.trim() === "")) return [];
    const fila: Record<string, string> = {};
    encabezado.forEach((clave, i) => {
      if (clave) fila[clave] = (celdas[i] ?? "").trim();
    });
    return [fila];
  });
}

function filasCsv(texto: string): string[][] {
  const limpio = texto.replace(/^﻿/, "");
  const filas: string[][] = [];
  let celdas: string[] = [];
  let celda = "";
  let entreComillas = false;

  for (let i = 0; i < limpio.length; i++) {
    const caracter = limpio[i];

    if (entreComillas) {
      if (caracter === '"') {
        if (limpio[i + 1] === '"') {
          celda += '"';
          i++;
        } else {
          entreComillas = false;
        }
      } else {
        celda += caracter;
      }
      continue;
    }

    if (caracter === '"') {
      entreComillas = true;
    } else if (caracter === ",") {
      celdas.push(celda);
      celda = "";
    } else if (caracter === "\n" || caracter === "\r") {
      if (caracter === "\r" && limpio[i + 1] === "\n") i++;
      celdas.push(celda);
      filas.push(celdas);
      celdas = [];
      celda = "";
    } else {
      celda += caracter;
    }
  }

  if (celda !== "" || celdas.length > 0) {
    celdas.push(celda);
    filas.push(celdas);
  }
  return filas;
}

/** Filas de un JSON exportado: arreglo suelto o envuelto en data/rows/results. */
export function filasDesdeJson(texto: string): Record<string, string>[] {
  const datos = JSON.parse(texto);
  const lista = Array.isArray(datos)
    ? datos
    : datos?.data ?? datos?.rows ?? datos?.results ?? datos?.prospects;
  if (!Array.isArray(lista)) {
    throw new Error("El JSON no tiene un arreglo de filas (ni en data, rows, results o prospects)");
  }
  return lista.map((item: unknown) => {
    const fila: Record<string, string> = {};
    for (const [clave, valor] of Object.entries(item as Record<string, unknown>)) {
      fila[normalizarClave(clave)] = valorPlano(valor);
    }
    return fila;
  });
}

function valorPlano(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  if (Array.isArray(valor)) return valor.map(valorPlano).filter(Boolean).join(", ");
  if (typeof valor === "object") return JSON.stringify(valor);
  return String(valor);
}

function campo(fila: Record<string, string>, clave: string) {
  for (const alias of ALIAS[clave] ?? []) {
    const valor = fila[alias];
    if (valor && valor.trim() && valor.trim().toLowerCase() !== "null") return valor.trim();
  }
  return "";
}

// Los campos multivalor llegan como "a@x.com, b@y.com" o como "['a@x.com']"
function primerValor(valor: string) {
  const limpio = valor.replace(/^[[\s]+|[\]\s]+$/g, "");
  const primero = limpio.split(/[,;|]/)[0] ?? "";
  return primero.replace(/^['"\s]+|['"\s]+$/g, "");
}

export function normalizarProspecto(
  fila: Record<string, string>,
  origen = "desconocido",
): Prospecto {
  const nombre = campo(fila, "nombre");
  const apellido = campo(fila, "apellido");
  const nombreCompleto = campo(fila, "nombreCompleto") || [nombre, apellido].filter(Boolean).join(" ");

  const base = {
    nombre: nombre || nombreCompleto.split(/\s+/)[0] || "",
    apellido,
    nombreCompleto,
    cargo: campo(fila, "cargo"),
    empresa: campo(fila, "empresa"),
    sitioWeb: primerValor(campo(fila, "sitioWeb")),
    email: primerValor(campo(fila, "email")).toLowerCase(),
    telefono: primerValor(campo(fila, "telefono")),
    linkedin: primerValor(campo(fila, "linkedin")),
    pais: campo(fila, "pais"),
    region: campo(fila, "region"),
    ciudad: campo(fila, "ciudad"),
    rubro: campo(fila, "rubro"),
    tamanioEmpresa: campo(fila, "tamanioEmpresa"),
    departamento: campo(fila, "departamento"),
    nivel: campo(fila, "nivel"),
    origen,
    crudo: fila,
  };

  const { segmento, prioridad, motivos } = evaluar(base);
  return { id: idProspecto(base), ...base, segmento, prioridad, motivos };
}

/**
 * Id estable y determinista: el email manda, después LinkedIn, y como último
 * recurso nombre + empresa. Reimportar el mismo export no duplica la bandeja.
 */
export function idProspecto(p: {
  email: string;
  linkedin: string;
  nombreCompleto: string;
  empresa: string;
}) {
  const clave = p.email
    ? `email:${p.email.toLowerCase()}`
    : p.linkedin
      ? `linkedin:${p.linkedin.toLowerCase().replace(/\/+$/, "")}`
      : `persona:${normalizarClave(p.nombreCompleto)}@${normalizarClave(p.empresa)}`;
  return createHash("sha1").update(clave).digest("hex").slice(0, 10);
}

type Evaluable = Pick<
  Prospecto,
  "cargo" | "empresa" | "rubro" | "nivel" | "departamento" | "email" | "telefono" | "linkedin"
>;

function contiene(texto: string, palabras: string[]) {
  const limpio = sinAcentos(texto).toLowerCase();
  return palabras.some((palabra) => limpio.includes(palabra));
}

export function tieneContacto(p: Pick<Prospecto, "email" | "telefono" | "linkedin">) {
  return Boolean(p.email || p.telefono || p.linkedin);
}

export function esDecisor(p: Pick<Prospecto, "cargo" | "nivel">) {
  return (
    contiene(p.cargo, PALABRAS_DECISOR) ||
    NIVELES_DECISOR.includes(sinAcentos(p.nivel).toLowerCase().trim())
  );
}

/**
 * Segmento y prioridad. El segmento decide qué mensaje se redacta; la prioridad
 * ordena la cola de revisión. Las empresas de riego no son clientes finales:
 * son canal, y por eso reciben otro mensaje.
 */
export function evaluar(p: Evaluable): {
  segmento: Segmento;
  prioridad: Prioridad;
  motivos: string[];
} {
  const contexto = `${p.rubro} ${p.empresa} ${p.cargo}`;
  const motivos: string[] = [];

  let segmento: Segmento = "OTRO";
  if (contiene(contexto, PALABRAS_RIEGO)) {
    segmento = "RIEGO";
    motivos.push("El rubro o la empresa hablan de riego: es canal, no cliente final");
  } else if (contiene(contexto, PALABRAS_PRODUCTOR)) {
    segmento = "PRODUCTOR";
    motivos.push("El rubro o la empresa son de producción agrícola");
  } else if (contiene(contexto, PALABRAS_AGROINDUSTRIA)) {
    segmento = "AGROINDUSTRIA";
    motivos.push("Agroindustria o cooperativa: puede tener campo propio o proveedores");
  } else {
    motivos.push("Sin señales agrícolas claras en el rubro ni en la empresa");
  }

  const decisor = esDecisor(p);
  if (decisor) motivos.push(`Cargo con decisión: ${p.cargo || p.nivel}`);

  const contacto = tieneContacto(p);
  if (!contacto) motivos.push("Sin email, teléfono ni LinkedIn: no hay por dónde escribirle");
  else if (!p.email) motivos.push("Sin email: queda WhatsApp o LinkedIn");

  const relevante = segmento === "PRODUCTOR" || segmento === "RIEGO";
  let prioridad: Prioridad = "BAJA";
  if (!contacto) prioridad = "BAJA";
  else if (relevante && decisor) prioridad = "ALTA";
  else if (relevante || (decisor && segmento === "AGROINDUSTRIA")) prioridad = "MEDIA";

  return { segmento, prioridad, motivos };
}

/** Deduplica por id conservando la fila con más datos cargados. */
export function deduplicar(prospectos: Prospecto[]) {
  const porId = new Map<string, Prospecto>();
  for (const prospecto of prospectos) {
    const previo = porId.get(prospecto.id);
    if (!previo || completitud(prospecto) > completitud(previo)) porId.set(prospecto.id, prospecto);
  }
  return [...porId.values()];
}

function completitud(p: Prospecto) {
  const campos = [
    p.nombre,
    p.apellido,
    p.cargo,
    p.empresa,
    p.email,
    p.telefono,
    p.linkedin,
    p.rubro,
    p.region,
    p.ciudad,
    p.sitioWeb,
  ];
  return campos.filter(Boolean).length;
}

const ORDEN_PRIORIDAD: Record<Prioridad, number> = { ALTA: 0, MEDIA: 1, BAJA: 2 };

/** Orden de revisión: primero lo que más conviene mirar. */
export function ordenarParaRevision(prospectos: Prospecto[]) {
  return [...prospectos].sort((a, b) => {
    const porPrioridad = ORDEN_PRIORIDAD[a.prioridad] - ORDEN_PRIORIDAD[b.prioridad];
    if (porPrioridad !== 0) return porPrioridad;
    return a.nombreCompleto.localeCompare(b.nombreCompleto, "es");
  });
}

/** Lee un export de Vibe Prospecting (.csv o .json) y devuelve prospectos únicos. */
export function leerProspectos(contenido: string, archivo: string): Prospecto[] {
  const esJson = archivo.toLowerCase().endsWith(".json") || contenido.trimStart().startsWith("[");
  const filas = esJson ? filasDesdeJson(contenido) : parsearCsv(contenido);
  const origen = archivo.split("/").pop() ?? archivo;
  return deduplicar(filas.map((fila) => normalizarProspecto(fila, origen)));
}

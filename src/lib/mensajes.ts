// Redacción de los mensajes de contacto.
//
// El agente no envía nada: deja un borrador por prospecto para que una persona
// lo lea y lo apruebe. Por eso todo lo que huele a mal mensaje —un dato que
// falta, un canal sin dirección, un texto que se pasa de largo— sale como
// advertencia, y `scripts/agente.ts` no deja aprobar un borrador con
// advertencias sin forzarlo a mano.

import type { Prospecto, Segmento } from "./prospectos";
import { sinAcentos } from "./prospectos";

export const CANALES = ["email", "whatsapp", "linkedin"] as const;
export type Canal = (typeof CANALES)[number];

export type Remitente = {
  nombre: string;
  rol: string;
  empresa: string;
  email: string;
  telefono: string;
  sitio: string;
  // Link a agenda o demo; si está vacío el CTA pide responder el mensaje
  enlaceDemo: string;
};

export type Mensaje = {
  canal: Canal;
  variante: number;
  asunto: string;
  cuerpo: string;
  caracteres: number;
  advertencias: string[];
};

// Tope de caracteres por canal: LinkedIn corta las invitaciones en 300
export const LIMITE_CARACTERES: Record<Canal, number> = {
  email: 1400,
  whatsapp: 900,
  linkedin: 300,
};

// Valores que vienen en agente.config.json sin completar
const PLACEHOLDERS = ["tu nombre", "tu empresa", "tu@empresa.com", "completar", "cambiar", ""];

const VARIANTES_POR_SEGMENTO = 2;

export const REMITENTE_VACIO: Remitente = {
  nombre: "",
  rol: "",
  empresa: "AgroRiego",
  email: "",
  telefono: "",
  sitio: "",
  enlaceDemo: "",
};

function esPlaceholder(valor: string) {
  return PLACEHOLDERS.includes(sinAcentos(valor).trim().toLowerCase());
}

function nombreDePila(prospecto: Prospecto) {
  const bruto = prospecto.nombre || prospecto.nombreCompleto.split(/\s+/)[0] || "";
  const limpio = bruto.trim();
  if (!limpio) return "";
  // Las listas suelen traer los nombres en mayúsculas: "JUAN" queda feo en un saludo
  return limpio
    .split(/\s+/)
    .map((parte) => parte[0].toUpperCase() + parte.slice(1).toLowerCase())
    .join(" ");
}

/** Variante determinista: el mismo prospecto recibe siempre el mismo texto. */
function varianteDe(prospecto: Prospecto) {
  const suma = [...prospecto.id].reduce((acc, caracter) => acc + caracter.charCodeAt(0), 0);
  return suma % VARIANTES_POR_SEGMENTO;
}

function asuntos(segmento: Segmento, empresa: string): [string, string] {
  const deEmpresa = empresa ? ` en ${empresa}` : "";
  switch (segmento) {
    case "PRODUCTOR":
      return [
        `Cuántos minutos regar cada lote${deEmpresa}`,
        "El riego de esta semana, en tres números",
      ];
    case "RIEGO":
      return [
        `Una herramienta para los clientes${deEmpresa}`,
        "Justificar el sistema de riego con números del lote",
      ];
    case "AGROINDUSTRIA":
      return [
        `Consumo de agua y energía de riego${deEmpresa}`,
        "Cuánta agua y energía se va en el riego",
      ];
    default:
      return ["Riego medido, no estimado a ojo", "Una consulta sobre riego agrícola"];
  }
}

// Qué hace el producto, en la voz que corresponde a cada segmento
function propuesta(segmento: Segmento): string {
  const motor =
    "AgroRiego toma la evapotranspiración y la lluvia del lote, le aplica el coeficiente del cultivo y lo que el suelo aguanta, y devuelve tres números: los milímetros que faltan, los minutos de bomba y lo que cuesta esa aplicación entre energía y agua.";

  switch (segmento) {
    case "PRODUCTOR":
      return `${motor} Con eso el riego se decide con un número, no a ojo.`;
    case "RIEGO":
      return `${motor} Para quien instala sistemas sirve de dos maneras: justifica la inversión con números del lote del cliente, y deja al productor usando bien lo que le instalaron.`;
    case "AGROINDUSTRIA":
      return `${motor} Sirve tanto para campo propio como para ordenar lo que se le pide a los productores que abastecen.`;
    default:
      return motor;
  }
}

function gancho(segmento: Segmento, variante: number): string {
  const porSegmento: Record<Segmento, [string, string]> = {
    PRODUCTOR: [
      "Un riego que se pasa de lámina percola por debajo de la raíz: esa agua y esa energía de bombeo no las usa el cultivo. Uno que queda corto deja al cultivo con estrés justo cuando más pide.",
      "La pregunta de todas las semanas es la misma: qué lote riego, cuántos minutos y cuánto me sale. Casi siempre se contesta de memoria.",
    ],
    RIEGO: [
      "El sistema que instalás rinde según cómo se opere: el mismo equipo de goteo puede trabajar al 90% o mucho menos si el turno de riego se fija a ojo.",
      "La objeción de siempre es cuánto ahorra el sistema. Contestarla con la ETo y el suelo del lote del cliente es distinto a contestarla con una tabla general.",
    ],
    AGROINDUSTRIA: [
      "El agua y la energía del riego suelen ser un costo que se mide recién en la factura, cuando ya no se puede cambiar nada.",
      "Cuando hay varios campos, cada uno riega con un criterio distinto y no hay forma de comparar el consumo entre ellos.",
    ],
    OTRO: [
      "Estamos hablando con gente vinculada al riego agrícola para entender cómo se decide hoy cuánto regar.",
      "Estamos mostrando AgroRiego a quienes trabajan cerca de la producción agrícola.",
    ],
  };
  return porSegmento[segmento][variante % 2];
}

function contexto(prospecto: Prospecto) {
  const lugar = prospecto.region || prospecto.ciudad || prospecto.pais;
  if (!lugar) return "";
  return ` Estamos arrancando con productores de ${lugar}, así que las tablas se ajustan con datos de la zona.`;
}

// "Finca La Esperanza, S.A." ya trae su punto: no le agregamos otro
function puntuar(texto: string) {
  return /[.!?]$/.test(texto.trim()) ? texto.trim() : `${texto.trim()}.`;
}

// A una empresa de riego no se le habla de "tu campo": el campo es del cliente
function sobreQue(segmento: Segmento) {
  return segmento === "RIEGO" ? "el lote de alguno de tus clientes" : "los datos de tu campo";
}

function cierre(remitente: Remitente, segmento: Segmento) {
  const objeto = sobreQue(segmento);
  if (remitente.enlaceDemo) {
    return `Si te sirve, en 15 minutos te lo muestro con ${objeto}: ${remitente.enlaceDemo}`;
  }
  return `Si te sirve, en 15 minutos te lo muestro con ${objeto}. ¿Te va bien esta semana?`;
}

function firma(remitente: Remitente) {
  const lineas = [remitente.nombre, [remitente.rol, remitente.empresa].filter(Boolean).join(" · ")];
  if (remitente.telefono) lineas.push(remitente.telefono);
  if (remitente.sitio) lineas.push(remitente.sitio);
  return lineas.filter(Boolean).join("\n");
}

const OPT_OUT = "Si no es para vos, respondeme y no te escribo más.";

function saludo(prospecto: Prospecto) {
  const nombre = nombreDePila(prospecto);
  return nombre ? `Hola ${nombre}:` : "Hola:";
}

function presentacion(prospecto: Prospecto, remitente: Remitente) {
  const quien = [remitente.nombre, remitente.rol].filter(Boolean).join(", ");
  const yo = quien ? `Soy ${quien} de ${remitente.empresa}` : `Te escribo de ${remitente.empresa}`;
  // Sólo se nombra la empresa del prospecto si está en los datos: no se inventa
  const vos = prospecto.empresa ? `, y te escribo por ${prospecto.empresa}` : "";
  return puntuar(`${yo}${vos}`);
}

function cuerpoEmail(prospecto: Prospecto, remitente: Remitente, variante: number) {
  return [
    saludo(prospecto),
    "",
    `${presentacion(prospecto, remitente)} ${gancho(prospecto.segmento, variante)}`,
    "",
    `${propuesta(prospecto.segmento)}${contexto(prospecto)}`,
    "",
    cierre(remitente, prospecto.segmento),
    "",
    OPT_OUT,
    "",
    firma(remitente),
  ].join("\n");
}

function cuerpoWhatsapp(prospecto: Prospecto, remitente: Remitente, variante: number) {
  const quien = remitente.nombre ? `Soy ${remitente.nombre}, de ${remitente.empresa}` : `Te escribo de ${remitente.empresa}`;
  const corto =
    prospecto.segmento === "RIEGO"
      ? "Calcula cuántos minutos hay que regar cada lote y cuánto cuesta esa aplicación, con la ETo y el suelo del campo del cliente."
      : "Calcula cuántos minutos hay que regar cada lote y cuánto cuesta esa aplicación, con la ETo, el cultivo y el suelo del campo.";
  return [
    `${saludo(prospecto)} ${quien}.`,
    "",
    `${gancho(prospecto.segmento, variante)} Armamos AgroRiego para eso: ${corto}`,
    "",
    remitente.enlaceDemo
      ? `¿Te muestro cómo queda con ${sobreQue(prospecto.segmento)}? ${remitente.enlaceDemo}`
      : `¿Te muestro cómo queda con ${sobreQue(prospecto.segmento)}? Son 15 minutos.`,
    "",
    OPT_OUT,
  ].join("\n");
}

function cuerpoLinkedin(prospecto: Prospecto, remitente: Remitente) {
  const nombre = nombreDePila(prospecto);
  const quien = remitente.nombre ? `soy ${remitente.nombre}` : "te escribo de AgroRiego";
  const destino =
    prospecto.segmento === "RIEGO"
      ? "el lote de alguno de tus clientes"
      : prospecto.empresa
        ? `los lotes de ${prospecto.empresa}`
        : "tus lotes";
  return `${nombre ? `Hola ${nombre}, ` : "Hola, "}${quien}. Armamos AgroRiego: calcula cuántos minutos regar cada lote según la ETo, el cultivo y el suelo, y lo que cuesta esa aplicación. ¿Te muestro cómo queda con ${destino}?`;
}

export function redactarMensaje({
  prospecto,
  remitente,
  canal = "email",
  variante,
}: {
  prospecto: Prospecto;
  remitente: Remitente;
  canal?: Canal;
  variante?: number;
}): Mensaje {
  const v = variante ?? varianteDe(prospecto);
  const cuerpo =
    canal === "email"
      ? cuerpoEmail(prospecto, remitente, v)
      : canal === "whatsapp"
        ? cuerpoWhatsapp(prospecto, remitente, v)
        : cuerpoLinkedin(prospecto, remitente);
  const asunto = canal === "email" ? asuntos(prospecto.segmento, prospecto.empresa)[v % 2] : "";

  return {
    canal,
    variante: v,
    asunto,
    cuerpo,
    caracteres: cuerpo.length,
    advertencias: revisar({ prospecto, remitente, canal, asunto, cuerpo }),
  };
}

/** Todo lo que haría dudar a quien revisa, antes de que lo mande. */
function revisar({
  prospecto,
  remitente,
  canal,
  asunto,
  cuerpo,
}: {
  prospecto: Prospecto;
  remitente: Remitente;
  canal: Canal;
  asunto: string;
  cuerpo: string;
}) {
  const advertencias: string[] = [];

  if (esPlaceholder(remitente.nombre)) {
    advertencias.push("El remitente no tiene nombre cargado en agente.config.json");
  }
  if (canal === "email" && esPlaceholder(remitente.email)) {
    advertencias.push("El remitente no tiene email cargado en agente.config.json");
  }
  if (!nombreDePila(prospecto)) {
    advertencias.push("El prospecto no tiene nombre de pila: el saludo queda genérico");
  }
  if (!prospecto.empresa) {
    advertencias.push("Sin empresa en los datos: el mensaje va sin esa referencia");
  }
  if (canal === "email" && !prospecto.email) {
    advertencias.push("Canal email pero el prospecto no tiene email");
  }
  if (canal === "whatsapp" && !prospecto.telefono) {
    advertencias.push("Canal whatsapp pero el prospecto no tiene teléfono");
  }
  if (canal === "linkedin" && !prospecto.linkedin) {
    advertencias.push("Canal linkedin pero el prospecto no tiene perfil");
  }
  if (prospecto.segmento === "OTRO") {
    advertencias.push("Segmento OTRO: no hay señales de que sea un cliente para AgroRiego");
  }
  if (cuerpo.length > LIMITE_CARACTERES[canal]) {
    advertencias.push(
      `El mensaje tiene ${cuerpo.length} caracteres y el límite de ${canal} es ${LIMITE_CARACTERES[canal]}`,
    );
  }
  // Red de seguridad: ninguna plantilla debería dejar una llave sin resolver
  if (/\{\{|\}\}|\{[a-zA-Z]/.test(`${asunto}\n${cuerpo}`)) {
    advertencias.push("Quedó un marcador sin reemplazar en el texto");
  }

  return advertencias;
}

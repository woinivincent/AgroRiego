import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LIMITE_CARACTERES, type Remitente, redactarMensaje } from "./mensajes";
import { normalizarProspecto } from "./prospectos";

const REMITENTE: Remitente = {
  nombre: "Vicente",
  rol: "fundador",
  empresa: "AgroRiego",
  email: "vicente@agroriego.com",
  telefono: "+54 9 261 555 5555",
  sitio: "agroriego.com",
  enlaceDemo: "",
};

const productor = () =>
  normalizarProspecto({
    first_name: "JUAN",
    last_name: "PÉREZ",
    job_title: "Owner",
    company_name: "Finca La Esperanza",
    professional_email: "juan@finca.com",
    linkedin_category: "Farming",
    region_name: "Mendoza",
    linkedin: "in/juanperez",
    phone: "+5492611111",
  });

describe("mensaje de email", () => {
  it("saluda por el nombre de pila, con mayúsculas arregladas", () => {
    const mensaje = redactarMensaje({ prospecto: productor(), remitente: REMITENTE });
    assert.ok(mensaje.cuerpo.startsWith("Hola Juan:"), mensaje.cuerpo.slice(0, 40));
  });

  it("nombra la empresa del prospecto y la zona que traen los datos", () => {
    const mensaje = redactarMensaje({ prospecto: productor(), remitente: REMITENTE });
    assert.ok(mensaje.cuerpo.includes("Finca La Esperanza"));
    assert.ok(mensaje.cuerpo.includes("Mendoza"));
  });

  it("nunca deja un marcador sin reemplazar", () => {
    const mensaje = redactarMensaje({ prospecto: productor(), remitente: REMITENTE });
    assert.doesNotMatch(`${mensaje.asunto}\n${mensaje.cuerpo}`, /\{|\}/);
    assert.deepEqual(mensaje.advertencias, []);
  });

  it("ofrece siempre una salida al que no quiere que le escriban", () => {
    const mensaje = redactarMensaje({ prospecto: productor(), remitente: REMITENTE });
    assert.ok(mensaje.cuerpo.includes("no te escribo más"));
  });

  it("no inventa la empresa cuando no está en los datos, y lo avisa", () => {
    const sinEmpresa = normalizarProspecto({ first_name: "Ana", email: "ana@x.com", linkedin_category: "Farming" });
    const mensaje = redactarMensaje({ prospecto: sinEmpresa, remitente: REMITENTE });
    assert.ok(mensaje.cuerpo.includes("Hola Ana:"));
    assert.ok(mensaje.advertencias.some((a) => a.includes("Sin empresa")));
  });

  it("no duplica el punto cuando la empresa ya termina en uno", () => {
    const sa = normalizarProspecto({
      first_name: "Juan",
      company_name: "Finca La Esperanza, S.A.",
      email: "juan@finca.com",
      linkedin_category: "Farming",
    });
    const mensaje = redactarMensaje({ prospecto: sa, remitente: REMITENTE });
    assert.ok(mensaje.cuerpo.includes("S.A. "), mensaje.cuerpo.slice(0, 200));
    assert.doesNotMatch(mensaje.cuerpo, /\.\./);
  });

  it("le habla distinto a una empresa de riego que a un productor", () => {
    const empresaRiego = normalizarProspecto({
      first_name: "Ana",
      company_name: "Riego del Valle",
      email: "ana@riego.com",
      job_title: "Gerente",
    });
    const mensaje = redactarMensaje({ prospecto: empresaRiego, remitente: REMITENTE });
    assert.equal(empresaRiego.segmento, "RIEGO");
    assert.ok(mensaje.cuerpo.includes("instala"));
    // Una empresa de riego no tiene campo propio: el lote es del cliente
    assert.ok(!mensaje.cuerpo.includes("tu campo"));
    assert.ok(mensaje.cuerpo.includes("alguno de tus clientes"));
  });
});

describe("mensajes cortos", () => {
  it("el de LinkedIn entra en el límite de la plataforma", () => {
    const mensaje = redactarMensaje({ prospecto: productor(), remitente: REMITENTE, canal: "linkedin" });
    assert.ok(mensaje.caracteres <= LIMITE_CARACTERES.linkedin, `${mensaje.caracteres} caracteres`);
    assert.deepEqual(mensaje.advertencias, []);
  });

  it("el de LinkedIn entra también con el texto más largo, el de canal", () => {
    const empresaRiego = normalizarProspecto({
      first_name: "Ana",
      company_name: "Riego del Valle",
      email: "ana@riego.com",
      linkedin: "in/ana",
      job_title: "Gerente",
    });
    const mensaje = redactarMensaje({ prospecto: empresaRiego, remitente: REMITENTE, canal: "linkedin" });
    assert.ok(mensaje.caracteres <= LIMITE_CARACTERES.linkedin, `${mensaje.caracteres} caracteres`);
  });

  it("el de WhatsApp también, y sin asunto", () => {
    const mensaje = redactarMensaje({ prospecto: productor(), remitente: REMITENTE, canal: "whatsapp" });
    assert.ok(mensaje.caracteres <= LIMITE_CARACTERES.whatsapp);
    assert.equal(mensaje.asunto, "");
  });
});

describe("advertencias antes de aprobar", () => {
  it("marca el canal que el prospecto no tiene", () => {
    const sinEmail = normalizarProspecto({ full_name: "Ana Díaz", linkedin: "in/ana", linkedin_category: "Farming" });
    const mensaje = redactarMensaje({ prospecto: sinEmail, remitente: REMITENTE, canal: "email" });
    assert.ok(mensaje.advertencias.some((a) => a.includes("no tiene email")));
  });

  it("avisa cuando el remitente quedó sin completar", () => {
    const vacio: Remitente = { ...REMITENTE, nombre: "", email: "" };
    const mensaje = redactarMensaje({ prospecto: productor(), remitente: vacio });
    assert.equal(mensaje.advertencias.length, 2);
    assert.ok(mensaje.advertencias.every((a) => a.includes("agente.config.json")));
  });

  it("no da por bueno un prospecto sin señales agrícolas", () => {
    const ajeno = normalizarProspecto({
      full_name: "Ana Díaz",
      email: "ana@software.com",
      linkedin_category: "Software Development",
      company_name: "Data SA",
    });
    const mensaje = redactarMensaje({ prospecto: ajeno, remitente: REMITENTE });
    assert.ok(mensaje.advertencias.some((a) => a.includes("Segmento OTRO")));
  });

  it("marca el saludo genérico cuando no hay nombre", () => {
    const anonimo = normalizarProspecto({ company_name: "Finca Sur", email: "info@finca.com" });
    const mensaje = redactarMensaje({ prospecto: anonimo, remitente: REMITENTE });
    assert.ok(mensaje.cuerpo.startsWith("Hola:"));
    assert.ok(mensaje.advertencias.some((a) => a.includes("nombre de pila")));
  });
});

describe("variantes", () => {
  it("el mismo prospecto recibe siempre el mismo texto", () => {
    const uno = redactarMensaje({ prospecto: productor(), remitente: REMITENTE });
    const dos = redactarMensaje({ prospecto: productor(), remitente: REMITENTE });
    assert.equal(uno.cuerpo, dos.cuerpo);
    assert.equal(uno.asunto, dos.asunto);
  });

  it("las dos variantes de un segmento son distintas entre sí", () => {
    const prospecto = productor();
    const a = redactarMensaje({ prospecto, remitente: REMITENTE, variante: 0 });
    const b = redactarMensaje({ prospecto, remitente: REMITENTE, variante: 1 });
    assert.notEqual(a.cuerpo, b.cuerpo);
    assert.notEqual(a.asunto, b.asunto);
  });
});

describe("cierre del mensaje", () => {
  it("usa el link de agenda cuando está configurado", () => {
    const conLink: Remitente = { ...REMITENTE, enlaceDemo: "https://cal.com/agroriego" };
    const mensaje = redactarMensaje({ prospecto: productor(), remitente: conLink });
    assert.ok(mensaje.cuerpo.includes("https://cal.com/agroriego"));
  });

  it("y si no lo hay, pide una respuesta en vez de dejar el hueco", () => {
    const mensaje = redactarMensaje({ prospecto: productor(), remitente: REMITENTE });
    assert.ok(mensaje.cuerpo.includes("¿Te va bien esta semana?"));
  });
});

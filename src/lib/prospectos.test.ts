import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  deduplicar,
  evaluar,
  filasDesdeJson,
  idProspecto,
  leerProspectos,
  normalizarProspecto,
  ordenarParaRevision,
  parsearCsv,
} from "./prospectos";

describe("parseo del CSV exportado", () => {
  it("respeta comas y comillas dentro de un campo", () => {
    const csv = 'first_name,company_name\nJuan,"Agro Sur, S.A."\n';
    assert.deepEqual(parsearCsv(csv), [{ first_name: "Juan", company_name: "Agro Sur, S.A." }]);
  });

  it("acepta saltos de línea dentro de un campo entrecomillado", () => {
    const csv = 'first_name,notes\nJuan,"riega\ncon goteo"\n';
    assert.equal(parsearCsv(csv)[0].notes, "riega\ncon goteo");
  });

  it("entiende comillas escapadas, BOM y CRLF", () => {
    const csv = '﻿first_name,company_name\r\nJuan,"La ""Esperanza"""\r\n';
    assert.deepEqual(parsearCsv(csv), [{ first_name: "Juan", company_name: 'La "Esperanza"' }]);
  });

  it("normaliza los encabezados y descarta la fila vacía del final", () => {
    const csv = "First Name,Job Title\nJuan,Gerente\n\n";
    const filas = parsearCsv(csv);
    assert.equal(filas.length, 1);
    assert.deepEqual(Object.keys(filas[0]), ["first_name", "job_title"]);
  });
});

describe("normalización de un prospecto", () => {
  it("mapea los nombres de columna que usa el export de prospección", () => {
    const p = normalizarProspecto({
      first_name: "Juan",
      last_name: "Pérez",
      job_title: "Gerente de Producción",
      company_name: "Finca La Esperanza",
      professional_email: "JUAN@FINCA.COM",
      linkedin_category: "Farming",
      region_name: "Mendoza",
    });
    assert.equal(p.nombreCompleto, "Juan Pérez");
    assert.equal(p.empresa, "Finca La Esperanza");
    // El email se guarda en minúsculas: es la clave de deduplicación
    assert.equal(p.email, "juan@finca.com");
    assert.equal(p.region, "Mendoza");
  });

  it("de un campo multivalor se queda con el primero", () => {
    const p = normalizarProspecto({ emails: "['uno@x.com', 'dos@x.com']", phone_numbers: "+5492611111, +5492612222" });
    assert.equal(p.email, "uno@x.com");
    assert.equal(p.telefono, "+5492611111");
  });

  it("saca el nombre de pila del nombre completo cuando no viene separado", () => {
    assert.equal(normalizarProspecto({ full_name: "María González" }).nombre, "María");
  });

  it("ignora los 'null' de texto que deja el export", () => {
    assert.equal(normalizarProspecto({ email: "null", company_name: "Agro Sur" }).email, "");
  });
});

describe("identidad de un prospecto", () => {
  it("el mismo email da el mismo id sin importar mayúsculas", () => {
    const comun = { linkedin: "", nombreCompleto: "Juan Pérez", empresa: "Finca" };
    assert.equal(
      idProspecto({ ...comun, email: "Juan@Finca.com" }),
      idProspecto({ ...comun, email: "juan@finca.com" }),
    );
  });

  it("sin email cae en LinkedIn, y sin LinkedIn en nombre + empresa", () => {
    const porLinkedin = idProspecto({ email: "", linkedin: "in/juanperez", nombreCompleto: "Juan", empresa: "A" });
    const otraEmpresa = idProspecto({ email: "", linkedin: "in/juanperez", nombreCompleto: "Juan", empresa: "B" });
    // El perfil manda: la misma persona en otra empresa sigue siendo la misma
    assert.equal(porLinkedin, otraEmpresa);

    const soloNombre = idProspecto({ email: "", linkedin: "", nombreCompleto: "Juan Pérez", empresa: "A" });
    assert.notEqual(soloNombre, porLinkedin);
  });
});

describe("deduplicación", () => {
  it("entre dos filas de la misma persona conserva la más completa", () => {
    const pobre = normalizarProspecto({ email: "juan@finca.com", first_name: "Juan" });
    const rica = normalizarProspecto({
      email: "juan@finca.com",
      first_name: "Juan",
      last_name: "Pérez",
      company_name: "Finca La Esperanza",
      job_title: "Dueño",
      phone: "+549261",
    });
    const unicos = deduplicar([pobre, rica]);
    assert.equal(unicos.length, 1);
    assert.equal(unicos[0].empresa, "Finca La Esperanza");
  });
});

describe("segmentación", () => {
  const base = { cargo: "", empresa: "", rubro: "", nivel: "", departamento: "", email: "", telefono: "", linkedin: "" };

  it("un productor con cargo de decisión y contacto es prioridad alta", () => {
    const r = evaluar({ ...base, rubro: "Farming", cargo: "Owner", email: "juan@finca.com" });
    assert.equal(r.segmento, "PRODUCTOR");
    assert.equal(r.prioridad, "ALTA");
  });

  it("una empresa de riego se separa como canal, no como cliente final", () => {
    const r = evaluar({ ...base, empresa: "Riego del Valle SRL", cargo: "Gerente", email: "v@riego.com" });
    assert.equal(r.segmento, "RIEGO");
  });

  it("sin ninguna vía de contacto la prioridad cae aunque el rubro sirva", () => {
    const r = evaluar({ ...base, rubro: "Agricultura", cargo: "Dueño" });
    assert.equal(r.prioridad, "BAJA");
    assert.ok(r.motivos.some((m) => m.includes("Sin email, teléfono ni LinkedIn")));
  });

  it("lo que no tiene señales agrícolas queda en OTRO", () => {
    const r = evaluar({ ...base, rubro: "Software Development", cargo: "CTO", email: "x@y.com" });
    assert.equal(r.segmento, "OTRO");
    assert.equal(r.prioridad, "BAJA");
  });

  it("reconoce el rubro en español y en inglés por igual", () => {
    assert.equal(evaluar({ ...base, rubro: "Vitivinícola", email: "a@b.com" }).segmento, "PRODUCTOR");
    assert.equal(evaluar({ ...base, rubro: "Wineries", email: "a@b.com" }).segmento, "PRODUCTOR");
  });
});

describe("orden de revisión", () => {
  it("pone primero las prioridades altas", () => {
    const prospectos = [
      normalizarProspecto({ full_name: "Baja", email: "a@b.com", linkedin_category: "Software" }),
      normalizarProspecto({ full_name: "Alta", email: "c@d.com", linkedin_category: "Farming", job_title: "Owner" }),
    ];
    assert.deepEqual(
      ordenarParaRevision(prospectos).map((p) => p.prioridad),
      ["ALTA", "BAJA"],
    );
  });
});

describe("lectura de un export", () => {
  it("lee JSON envuelto en data y aplana los campos que son listas", () => {
    const filas = filasDesdeJson('{"data":[{"first_name":"Juan","emails":["uno@x.com"]}]}');
    assert.equal(filas[0].emails, "uno@x.com");
  });

  it("deduplica en la misma pasada", () => {
    const csv = "email,first_name\njuan@finca.com,Juan\njuan@finca.com,Juan\n";
    assert.equal(leerProspectos(csv, "export.csv").length, 1);
  });

  it("deja el nombre del archivo como origen", () => {
    const prospectos = leerProspectos("email,first_name\njuan@finca.com,Juan\n", "datos/export.csv");
    assert.equal(prospectos[0].origen, "export.csv");
  });
});

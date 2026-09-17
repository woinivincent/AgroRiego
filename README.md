# AgroRiego

MVP de gestión de riego agrícola: administrá tus parcelas, programá los riegos,
registrá lo que se aplicó y mirá el consumo de agua en un panel.

## Qué incluye el MVP

| Sección | Qué resuelve |
| --- | --- |
| **Panel** (`/`) | Parcelas activas y superficie, riegos y agua de la semana/mes, parcelas que necesitan riego, riegos atrasados y próximos riegos. |
| **Parcelas** (`/parcelas`) | Alta, edición y baja de lotes: superficie, cultivo, tipo de suelo, método de riego, caudal del sistema y frecuencia de riego. |
| **Riegos** (`/riegos`) | Programar riegos por parcela con estimación de agua en vivo, marcarlos como realizados (ajustando los litros), cancelarlos o eliminarlos. |
| **Calculadora** (`/calculadora`) | Cuánta agua pide el cultivo (ETo × Kc menos lluvia), cuánta tolera el suelo, cuántos minutos hay que regar y cuánto cuesta esa aplicación. |
| **Historial** (`/historial`) | Riegos ejecutados con agua aplicada, lámina en mm, costo estimado y filtro por parcela, más totales acumulados. |
| **Configuración** (`/configuracion`) | ETo de referencia, precio del kWh y del agua, y las tablas agronómicas que usa la calculadora. |

Una parcela se marca como *necesita riego* cuando pasaron más días que su
frecuencia configurada desde el último riego completado (y como *urgente* si se
pasó un 50% de esa frecuencia).

## La calculadora

Es el centro de la app: convierte lo que el cultivo necesita en minutos de bomba.
Trabaja en cuatro pasos encadenados.

1. **Demanda del cultivo.** Suma la evapotranspiración de referencia (ETo) de
   cada día desde el último riego, la multiplica por el coeficiente de cultivo
   (Kc, según cultivo y etapa fenológica) y le resta la lluvia efectiva. El
   resultado es el déficit en mm que hay que reponer.
2. **Qué tolera el suelo.** El agua útil sale de la textura del suelo y de la
   profundidad de raíces; el umbral de agotamiento define el tope que conviene
   reponer en un solo riego. Pasarse de ahí percola bajo las raíces.
3. **Cuánto regar.** De la lámina objetivo (en mm) salen los litros y el tiempo
   de riego, agregando el agua que el método pierde en el camino: no es lo mismo
   goteo que surco. Se puede forzar una lámina distinta a la sugerida.
4. **Costo.** Energía de bombeo (potencia × horas × precio del kWh) más el agua
   consumida (m³ × precio del agua).

El botón final agenda ese riego con la duración ya calculada. Los mismos números
aparecen en el panel, así que desde ahí se programa en un clic.

### Agua útil del suelo

La curva de agua útil por textura **no es monótona**: un suelo arcilloso retiene
mucha agua total, pero buena parte queda por debajo del punto de marchitez
permanente y la planta no puede extraerla. El máximo de agua *útil* está en el
franco arcilloso, no en la arcilla pura. Hay tests que fijan esa relación, que es
más durable que los números exactos de la tabla.

### Eficiencia de aplicación

Los valores por método (goteo 90%, surco 60%…) son **de diseño ideal**. Un sistema
real a campo suele rendir bastante menos —en riego gravitacional de Cuyo se
documentan pérdidas del 45% al 80%— así que cada parcela puede cargar su
eficiencia medida, y la calculadora avisa cuál de las dos está usando.

### Lluvia efectiva

No toda la lluvia le sirve al cultivo: las lluvias menores a 2 mm se evaporan
antes de infiltrar y las muy grandes escurren. Se descuentan 2 mm y el aporte se
topea en el 80% del total.

## Datos de clima

La ETo y la lluvia salen de [Open-Meteo](https://open-meteo.com), que resuelve
Penman-Monteith FAO-56 del lado del servidor y no pide API key. Hacen falta las
coordenadas de la parcela, que se cargan desde el GPS del dispositivo, buscando
la localidad por nombre, o tipeándolas a mano.

- Lo que se baja queda **cacheado** en la tabla `ClimaDia` (una fila por parcela
  y día), así el balance hacia atrás no depende de que la API esté viva.
- Un dato **cargado a mano nunca se pisa** con el de la API: el valor del
  productor manda.
- Las parcelas sin coordenadas, y los días sin dato, usan la **ETo de referencia**
  de configuración.

> **Licencia:** Open-Meteo es gratuito y sin key para uso no comercial (CC-BY,
> ~10.000 pedidos por día). Para uso comercial hace falta un plan pago. Si eso es
> un problema, `src/lib/clima.ts` es el único archivo que habla con la API.

## Programación de riegos

Tres caminos, que conviven:

- **Sugerencia desde el panel.** Las parcelas que superaron su frecuencia traen
  un botón que abre el formulario con la parcela y la duración ya calculadas.
- **Encadenado automático.** Al marcar un riego como realizado se agenda el
  siguiente según la frecuencia de la parcela. Se desactiva por parcela.
- **Plan de la semana.** Un botón en `/riegos` agenda de una los riegos de todas
  las parcelas activas que no tengan ya uno programado.

Ninguno duplica riegos: si la parcela ya tiene uno programado, no se agrega otro.

## Agente de contacto a prospectos

`npm run agente` es una herramienta aparte de la app: toma la lista de clientes
prospectados, la segmenta, redacta un mensaje para cada uno y lo deja en una
bandeja **para que una persona lo apruebe**. No envía nada y no habla con ningún
servicio de correo ni de mensajería: el último paso siempre es humano.

```bash
# 1. completá el remitente en agente.config.json (nombre, rol, email, link de agenda)
npm run agente -- importar prospectos.csv           # export de prospección (.csv o .json)
npm run agente -- redactar --canal email            # un borrador por prospecto
npm run agente -- listar --estado BORRADOR          # la cola de revisión
npm run agente -- ver 8506                          # ficha + mensaje completo
npm run agente -- aprobar 8506                      # o --todos
npm run agente -- exportar --formato md --salida mensajes.md
npm run agente -- marcar-enviado 8506               # los que ya mandaste a mano
```

El archivo de entrada es el export de prospección tal cual sale, en CSV o JSON
—por ejemplo el CSV que descarga Vibe Prospecting cuando se exporta una búsqueda—.
Las columnas se mapean por alias (`professional_email`, `email`, `emails`,
`correo`…), así que no hace falta renombrar nada, y lo que no se reconoce queda
guardado igual. Cada prospecto recibe un **id estable**: primero el email,
después LinkedIn, y como último recurso nombre + empresa. Por eso reimportar el
mismo archivo no duplica la bandeja ni pisa un mensaje ya aprobado.

### Segmentación

El rubro, la empresa y el cargo definen a quién se le escribe y con qué texto:

| Segmento | Quién | Qué dice el mensaje |
| --- | --- | --- |
| `PRODUCTOR` | Fincas, bodegas, viñedos, chacras | Cuántos minutos regar y cuánto cuesta esa aplicación |
| `RIEGO` | Instaladores y empresas de riego | Es **canal**, no cliente final: justificar el sistema con números del lote del cliente |
| `AGROINDUSTRIA` | Cooperativas, packing, alimentos | Campo propio y lo que se le pide a los productores que abastecen |
| `OTRO` | El resto | Texto neutro, y una advertencia: probablemente no sea un cliente |

La prioridad (`ALTA` / `MEDIA` / `BAJA`) ordena la cola: arriba quedan los
segmentos relevantes con un cargo que decide y alguna vía de contacto. Cada
prospecto lleva los **motivos** de su clasificación, para que quien revisa vea
por qué quedó ahí.

### Aprobación

El mensaje se redacta con lo que hay en los datos y **nada más**: si no hay
empresa, el mensaje va sin esa referencia en vez de inventarla. Todo lo que
haría dudar sale como advertencia —falta el nombre de pila, el canal elegido no
tiene dirección, el remitente quedó sin completar, el texto se pasa del límite
de LinkedIn— y un borrador con advertencias **no se puede aprobar sin
`--forzar`**. Todos los mensajes cierran ofreciendo una salida al que no quiere
que le escriban.

Hay tres formatos: `email` (con asunto), `whatsapp` (corto) y `linkedin`
(hasta 300 caracteres, que es el tope de la plataforma). Cada segmento tiene dos
variantes de texto, asignadas de forma determinista por id: el mismo prospecto
recibe siempre el mismo mensaje.

La bandeja vive en `datos/bandeja.json`, **fuera de git**, porque tiene datos
personales de los prospectos.

## Stack

- **Next.js 15** (App Router) con Server Components y Server Actions
- **TypeScript** en modo estricto
- **Tailwind CSS 4**
- **Prisma 6 + SQLite** (archivo local, sin servicios externos)

## Puesta en marcha

```bash
npm install
cp .env.example .env      # DATABASE_URL="file:./dev.db"
npm run db:push           # crea la base SQLite a partir del schema
npm run db:seed           # opcional: carga datos de ejemplo
npm run dev               # http://localhost:3000
```

En **PowerShell** (Windows) los comandos van de a uno: `&&` no es un separador
válido en Windows PowerShell 5.1, y `cp` es alias de `Copy-Item`.

```powershell
cd AgroRiego          # el clone crea una subcarpeta: hay que entrar en ella
npm install
Copy-Item .env.example .env
npm run db:push
npm run db:seed
npm run dev
```

Para producción:

```bash
npm run build && npm start
```

## Scripts

| Script | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Genera el cliente de Prisma y compila la app |
| `npm start` | Sirve la build de producción |
| `npm run typecheck` | Chequeo de tipos sin emitir |
| `npm run db:push` | Sincroniza el schema de Prisma con la base SQLite |
| `npm run db:seed` | Reemplaza los datos por el set de ejemplo |
| `npm test` | Tests de la lógica agronómica y del agente (`node --test`, 71 casos) |
| `npm run agente` | Agente de contacto a prospectos (ver más arriba) |

## Estructura

```
scripts/
  agente.ts              CLI del agente de contacto
prisma/
  schema.prisma          modelos Parcela y Riego
  seed.ts                datos de ejemplo
src/
  app/                   rutas (panel, parcelas, riegos, historial)
  components/            UI y formularios
  lib/
    acciones.ts          server actions (parcelas, riegos, clima, configuración)
    consultas.ts         lecturas y métricas del panel
    agronomia.ts         tablas y fórmulas (Kc, eficiencia, agua útil, costo)
    agronomia.test.ts    tests de la lógica agronómica
    balance.ts           balance hídrico: une parcela, clima y agronomía
    clima.ts             cliente de Open-Meteo (ETo, lluvia y geocodificación)
    riego.ts             lógica de dominio (litros, lámina, estado hídrico)
    formato.ts           formato de fechas, litros y duraciones en es-AR
    prospectos.ts        ingesta del export de prospección y segmentación
    mensajes.ts          plantillas y validación de los mensajes de contacto
    bandeja.ts           estado de la cola de aprobación
```

## Modelo de datos

- **Parcela** — nombre único, superficie (ha), cultivo, tipo de suelo, método de
  riego, caudal (L/h), frecuencia de riego (días), etapa del cultivo, profundidad
  de raíces, umbral de agotamiento, potencia de bomba, coordenadas, estado activo
  y notas.
- **ClimaDia** — ETo y lluvia de un día para una parcela, con su fuente
  (`OPEN_METEO` o `MANUAL`).
- **Configuracion** — fila única con la ETo de referencia y los precios del kWh y
  del agua.
- **Riego** — parcela, fecha y hora, duración (min), estado
  (`PROGRAMADO` / `COMPLETADO` / `CANCELADO`), litros aplicados y notas.
  Al borrar una parcela se borran sus riegos en cascada.

Los litros se estiman como `caudal (L/h) × duración (min) / 60` y se pueden
corregir a mano al marcar el riego como realizado.

## Rendimiento

El panel y la vista de parcelas resuelven el filtrado y la agregación en SQL, y
calculan el balance en TypeScript, donde está testeado. En particular, el clima se
consulta con una ventana distinta por parcela —sólo los días posteriores a su
último riego— en vez de traer el histórico completo.

Medido con 200 parcelas, 10.000 riegos y 18.000 días de clima:

| Consulta | Antes | Ahora |
| --- | --- | --- |
| `obtenerResumen` (panel) | 831 ms | 41 ms |
| `obtenerParcelasConEstado` | 427 ms | 21 ms |

A 1000 parcelas y 100.000 riegos —ya fuera de lo realista para una sola
explotación— el panel queda en unos 320 ms.

## Sobre los valores agronómicos

Las tablas de `src/lib/agronomia.ts` (Kc por cultivo y etapa, eficiencia por
método, agua útil por textura, profundidad de raíces) son **aproximaciones de
FAO-56**. Sirven para arrancar, pero conviene ajustarlas con datos de la zona y
del sistema de riego real. Están todas en un solo archivo, con tests que fijan su
comportamiento.

## Próximos pasos posibles

- Usuarios y varias explotaciones por cuenta
- Kc por fecha de siembra, en lugar de etapa elegida a mano
- Integración con sensores de humedad o controladores de riego
- Exportación del historial a CSV y reportes por período
- Envío real desde el agente de contacto (hoy sólo redacta) y seguimiento de respuestas

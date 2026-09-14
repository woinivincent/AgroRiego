# AgroRiego

MVP de gestión de riego agrícola: administrá tus parcelas, programá los riegos,
registrá lo que se aplicó y mirá el consumo de agua en un panel.

## Qué incluye el MVP

| Sección | Qué resuelve |
| --- | --- |
| **Panel** (`/`) | Parcelas activas y superficie, riegos y agua de la semana/mes, parcelas que necesitan riego, riegos atrasados y próximos riegos. |
| **Parcelas** (`/parcelas`) | Alta, edición y baja de lotes: superficie, cultivo, tipo de suelo, método de riego, caudal del sistema y frecuencia de riego. |
| **Riegos** (`/riegos`) | Programar riegos por parcela con estimación de agua en vivo, marcarlos como realizados (ajustando los litros), cancelarlos o eliminarlos. |
| **Historial** (`/historial`) | Riegos ejecutados con agua aplicada, lámina en mm y filtro por parcela, más totales acumulados. |

Una parcela se marca como *necesita riego* cuando pasaron más días que su
frecuencia configurada desde el último riego completado (y como *urgente* si se
pasó un 50% de esa frecuencia).

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
npm run db:seed           # opcional: carga 4 parcelas y 9 riegos de ejemplo
npm run dev               # http://localhost:3000
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

## Estructura

```
prisma/
  schema.prisma          modelos Parcela y Riego
  seed.ts                datos de ejemplo
src/
  app/                   rutas (panel, parcelas, riegos, historial)
  components/            UI y formularios
  lib/
    acciones.ts          server actions (crear/editar/completar/cancelar)
    consultas.ts         lecturas y métricas del panel
    riego.ts             lógica de dominio (litros, lámina, estado hídrico)
    formato.ts           formato de fechas, litros y duraciones en es-AR
```

## Modelo de datos

- **Parcela** — nombre único, superficie (ha), cultivo, tipo de suelo, método de
  riego, caudal (L/h), frecuencia de riego (días), estado activo y notas.
- **Riego** — parcela, fecha y hora, duración (min), estado
  (`PROGRAMADO` / `COMPLETADO` / `CANCELADO`), litros aplicados y notas.
  Al borrar una parcela se borran sus riegos en cascada.

Los litros se estiman como `caudal (L/h) × duración (min) / 60` y se pueden
corregir a mano al marcar el riego como realizado.

## Próximos pasos posibles

- Usuarios y varias explotaciones por cuenta
- Datos de clima / evapotranspiración para sugerir la frecuencia de riego
- Integración con sensores de humedad o controladores de riego
- Exportación del historial a CSV y reportes por período

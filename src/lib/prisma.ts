import { PrismaClient } from "@prisma/client";

// En desarrollo Next.js recarga los módulos en cada cambio: reutilizamos la
// misma instancia para no abrir una conexión nueva por recarga.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

import * as packagePrisma from "@prisma/client";
import * as generatedPrisma from "../../node_modules/.prisma/client";
import { getPrismaClientConstructor } from "@/lib/prisma-loader";

const PrismaClient = getPrismaClientConstructor({
  packageModule: packagePrisma,
  generatedModule: generatedPrisma
});

declare global {
  // eslint-disable-next-line no-var
  var __prismaClient__: InstanceType<typeof PrismaClient> | undefined;
}

export const prisma =
  global.__prismaClient__ ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  global.__prismaClient__ = prisma;
}

import { describe, expect, it } from "vitest";
import { getPrismaClientConstructor } from "@/lib/prisma-loader";

describe("getPrismaClientConstructor", () => {
  it("uses the package PrismaClient when it is already available", () => {
    class PackagePrismaClient {}
    class GeneratedPrismaClient {}

    expect(
      getPrismaClientConstructor({
        packageModule: {
          PrismaClient: PackagePrismaClient
        },
        generatedModule: {
          PrismaClient: GeneratedPrismaClient
        }
      })
    ).toBe(PackagePrismaClient);
  });

  it("falls back to the generated Prisma client when the package client is still an uninitialized stub", () => {
    class GeneratedPrismaClient {}
    const UninitializedPrismaClient = class PrismaClient {
      constructor() {
        throw new Error('@prisma/client did not initialize yet. Please run "prisma generate" and try to import it again.');
      }
    };

    expect(
      getPrismaClientConstructor({
        packageModule: {
          PrismaClient: UninitializedPrismaClient
        },
        generatedModule: {
          PrismaClient: GeneratedPrismaClient
        }
      })
    ).toBe(GeneratedPrismaClient);
  });
});

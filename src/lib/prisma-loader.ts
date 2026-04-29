type PrismaModuleLike = {
  PrismaClient: new (...args: any[]) => any;
};

function isUninitializedPrismaStub(PrismaClient: PrismaModuleLike["PrismaClient"]) {
  try {
    // Prisma stub only throws on construction, so instantiate once to detect it.
    const instance = new PrismaClient();
    instance?.$disconnect?.();
    return false;
  } catch (error) {
    return (
      error instanceof Error &&
      error.message.includes('@prisma/client did not initialize yet')
    );
  }
}

export function getPrismaClientConstructor({
  packageModule,
  generatedModule
}: {
  packageModule: PrismaModuleLike;
  generatedModule: PrismaModuleLike;
}) {
  return isUninitializedPrismaStub(packageModule.PrismaClient)
    ? generatedModule.PrismaClient
    : packageModule.PrismaClient;
}

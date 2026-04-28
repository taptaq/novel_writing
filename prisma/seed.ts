import { PrismaClient } from "@prisma/client";
import { demoSeed } from "../src/lib/demo-data";
import { estimateWordCount } from "../src/lib/text/word-count";

const prisma = new PrismaClient();

function toBlocks(text: string) {
  return text
    .split(/\n{2,}/)
    .map((paragraph, index) => ({
      id: `block-${index + 1}`,
      type: "paragraph",
      text: paragraph.trim()
    }))
    .filter((item) => item.text.length > 0);
}

async function main() {
  await prisma.novel.deleteMany({
    where: {
      slug: demoSeed.novel.slug
    }
  });

  await prisma.projectSetting.upsert({
    where: {
      id: demoSeed.settings.id
    },
    update: {
      workspaceName: demoSeed.settings.workspaceName,
      defaultAiMode: demoSeed.settings.defaultAiMode,
      preferredModel: demoSeed.settings.preferredModel,
      aiInterventionHint: demoSeed.settings.aiInterventionHint,
      voiceGuardrails: demoSeed.settings.voiceGuardrails
    },
    create: demoSeed.settings
  });

  await prisma.novel.create({
    data: {
      ...demoSeed.novel,
      voiceRules: demoSeed.novel.voiceRules
    }
  });

  await prisma.volume.createMany({
    data: demoSeed.volumes
  });

  await prisma.chapter.createMany({
    data: demoSeed.chapters.map((chapter) => ({
      ...chapter,
      content: toBlocks(chapter.plainText),
      wordCount: estimateWordCount(chapter.plainText)
    }))
  });

  await prisma.chapterVersion.createMany({
    data: demoSeed.chapters.map((chapter) => ({
      id: `version-${chapter.id}`,
      chapterId: chapter.id,
      source: "seed",
      note: "Initial draft",
      content: toBlocks(chapter.plainText),
      plainText: chapter.plainText
    }))
  });

  await prisma.storyEntity.createMany({
    data: demoSeed.entities
  });

  await prisma.entityRelation.createMany({
    data: demoSeed.relations
  });

  await prisma.outlineNode.createMany({
    data: demoSeed.outlines
  });

  await prisma.foreshadow.createMany({
    data: demoSeed.foreshadows
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

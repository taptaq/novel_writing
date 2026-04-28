import { NextResponse } from "next/server";
import { z } from "zod";
import { assistModes, modelSelections } from "@/lib/ai/types";
import { runWritingAssist } from "@/lib/ai/writing-engine";
import { getChapterEditorData } from "@/lib/repositories/novels";
import { writingSkillPresetIds } from "@/lib/novel-writing-skills";

const payloadSchema = z.object({
  novelSlug: z.string().min(1),
  chapterSlug: z.string().min(1),
  mode: z.enum(assistModes),
  modelSelection: z.enum(modelSelections).default("auto"),
  skillPresetId: z.enum(writingSkillPresetIds).optional(),
  disableStyleProfile: z.boolean().optional().default(false),
  instruction: z.string().min(1),
  currentText: z.string().min(1),
  selectionText: z.string().optional()
});

export async function POST(request: Request) {
  try {
    const payload = payloadSchema.parse(await request.json());
    const chapterData = await getChapterEditorData(payload.novelSlug, payload.chapterSlug);

    if (!chapterData) {
      return NextResponse.json({ message: "Chapter not found." }, { status: 404 });
    }

    const result = await runWritingAssist({
      mode: payload.mode,
      modelSelection: payload.modelSelection,
      skillPresetId: payload.skillPresetId,
      instruction: payload.instruction,
      currentText: payload.currentText,
      selectionText: payload.selectionText,
      disableStyleProfile: payload.disableStyleProfile,
      novel: {
        title: chapterData.novel.title,
        premise: chapterData.novel.premise,
        voiceRules: chapterData.voiceRules,
        styleProfile: chapterData.styleProfile
      },
      chapter: {
        title: chapterData.chapter.title,
        sceneGoal: chapterData.chapter.sceneGoal
      },
      memory: chapterData.memory
        ? {
            storySoFar: chapterData.memory.storySoFar,
            activeStoryLines: chapterData.memory.activeStoryLines,
            openThreads: chapterData.memory.openThreads,
            currentFocus: chapterData.memory.currentFocus
          }
        : undefined,
      entities: chapterData.entities.map((entity) => ({
        name: entity.name,
        type: entity.type,
        summary: entity.summary
      })),
      foreshadows: chapterData.foreshadows.map((item) => ({
        hook: item.hook,
        status: item.status
      }))
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          message: error.message
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        message: "AI request failed."
      },
      { status: 500 }
    );
  }
}

import { beforeEach, describe, expect, it, vi } from "vitest";

const { buildSetupParsingPrompt, buildSetupChineseRewritePrompt, callRoutedJsonModel } = vi.hoisted(() => ({
  buildSetupParsingPrompt: vi.fn(),
  buildSetupChineseRewritePrompt: vi.fn(),
  callRoutedJsonModel: vi.fn()
}));

vi.mock("@/lib/ai/prompts", () => ({
  buildSetupParsingPrompt,
  buildSetupChineseRewritePrompt
}));

vi.mock("@/lib/ai/router", () => ({
  callRoutedJsonModel
}));

import { POST } from "@/app/api/novels/parse-setup/route";

function buildRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/novels/parse-setup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
}

describe("POST /api/novels/parse-setup", () => {
  beforeEach(() => {
    buildSetupParsingPrompt.mockReset();
    buildSetupChineseRewritePrompt.mockReset();
    callRoutedJsonModel.mockReset();
    buildSetupParsingPrompt.mockReturnValue("mocked parsing prompt");
    buildSetupChineseRewritePrompt.mockReturnValue("mocked chinese rewrite prompt");
    callRoutedJsonModel.mockResolvedValue({
      payload: {
        title: "  潮汐灰烬  ",
        category: "  悬疑  ",
        subGenre: "  港口谜案  ",
        targetAudience: "  成年读者  ",
        premise: "  一次停摆的潮汐钟，让修钟学徒卷进旧港失踪案。  ",
        narrativeView: "  第三人称限知  ",
        storyStructure: "  三幕式  ",
        lengthCategory: "EPIC",
        plannedChapterCount: "18",
        targetWordsPerChapter: "3000",
        worldSeed: "  盐雾旧港与钟楼区。  ",
        styleGoal: "  克制、冷感、细节推进。  ",
        factionSeeds: [
          { name: " 城档馆 ", summary: " 保管旧港档案的机构 " },
          { name: " 港务署 " }
        ],
        locationSeeds: [
          { name: " 北钟塔 ", summary: " 潮汐钟核心区 " },
          { name: " 白雾码头 " }
        ],
        characterSeeds: [
          { name: " 沈砚 ", role: " 修钟学徒 " },
          { name: " 林渡 " },
          { name: " 周棠 ", factionName: " 港务署 " },
          { name: " 苏枕 ", locationName: " 北钟塔 " },
          { name: "   ", summary: "这条应被过滤" }
        ],
        relationSeeds: [
          { sourceName: " 沈砚 ", targetName: " 城档馆 ", type: "MEMBER_OF", description: " 长期在馆内工作 " },
          { sourceName: " 苏枕 ", targetName: " 北钟塔 ", type: "ROOTED_IN", description: " 负责守塔 " },
          { sourceName: "   ", targetName: " 白雾码头 ", type: "OTHER", description: "无效" }
        ],
        guessedFields: [" targetAudience ", " plannedChapterCount "],
        missingFields: [" styleSamples "],
        confidenceNotes: [" 目标受众为推测 "]
      }
    });
  });

  it("returns a normalized draft object from AI output", async () => {
    const response = await POST(
      buildRequest({
        sourceName: "setup.md",
        sourceType: "markdown",
        sourceText: "  这是一个足够长的设定说明文本，用来生成稳定的解析草稿。\r\n第二行继续补充背景。  "
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      draft: {
        title: "潮汐灰烬",
        category: "悬疑",
        subGenre: "港口谜案",
        targetAudience: "成年读者",
        premise: "一次停摆的潮汐钟，让修钟学徒卷进旧港失踪案。",
        narrativeView: "第三人称限知",
        storyStructure: "三幕式",
        lengthCategory: "MEDIUM",
        plannedChapterCount: 18,
        targetWordsPerChapter: 3000,
        worldSeed: "盐雾旧港与钟楼区。",
        styleGoal: "克制、冷感、细节推进。",
        styleSamples: [],
        factionSeeds: [
          {
            name: "城档馆",
            summary: "保管旧港档案的机构"
          },
          {
            name: "港务署",
            summary: ""
          }
        ],
        locationSeeds: [
          {
            name: "北钟塔",
            summary: "潮汐钟核心区"
          },
          {
            name: "白雾码头",
            summary: ""
          }
        ],
        characterSeeds: [
          {
            name: "沈砚",
            role: "修钟学徒",
            summary: "",
            factionName: "",
            locationName: ""
          },
          {
            name: "林渡",
            role: "",
            summary: "",
            factionName: "",
            locationName: ""
          },
          {
            name: "周棠",
            role: "",
            summary: "",
            factionName: "港务署",
            locationName: ""
          },
          {
            name: "苏枕",
            role: "",
            summary: "",
            factionName: "",
            locationName: "北钟塔"
          }
        ],
        relationSeeds: [
          {
            sourceName: "沈砚",
            targetName: "城档馆",
            type: "MEMBER_OF",
            description: "长期在馆内工作",
            remark: "",
            note: ""
          },
          {
            sourceName: "苏枕",
            targetName: "北钟塔",
            type: "ROOTED_IN",
            description: "负责守塔",
            remark: "",
            note: ""
          }
        ],
        guessedFields: ["targetAudience", "plannedChapterCount"],
        missingFields: ["styleSamples"],
        confidenceNotes: ["目标受众为推测"]
      },
      promptPreview: "mocked parsing prompt"
    });

    expect(buildSetupParsingPrompt).toHaveBeenCalledWith(
      "这是一个足够长的设定说明文本，用来生成稳定的解析草稿。\n第二行继续补充背景。"
    );
    expect(callRoutedJsonModel).toHaveBeenCalledWith({
      messages: [
        {
          role: "system",
          content:
            "你是中文小说设定解析助手。只返回合法 JSON，不要输出英文说明，用户可见字段值必须使用简体中文。"
        },
        {
          role: "user",
          content: "mocked parsing prompt"
        }
      ],
      modelSelection: "auto"
    });
  });

  it("runs a Chinese rewrite pass when the first draft contains obvious English sentences", async () => {
    callRoutedJsonModel
      .mockResolvedValueOnce({
        payload: {
          title: "Tide Ashes",
          category: "Mystery",
          subGenre: "Port Case",
          targetAudience: "Adult readers",
          premise: "A clockmaker apprentice gets pulled into an old port disappearance case.",
          narrativeView: "Third person limited",
          storyStructure: "Three-act structure",
          lengthCategory: "MEDIUM",
          plannedChapterCount: 18,
          targetWordsPerChapter: 3000,
          worldSeed: "The old port is covered in salt fog and broken tide clocks.",
          styleGoal: "Restrained and cold.",
          styleSamples: [],
          factionSeeds: [],
          locationSeeds: [],
          characterSeeds: [],
          relationSeeds: [],
          guessedFields: ["targetAudience"],
          missingFields: ["styleSamples"],
          confidenceNotes: ["Target audience inferred from source."]
        }
      })
      .mockResolvedValueOnce({
        payload: {
          title: "潮汐灰烬",
          category: "悬疑",
          subGenre: "港口谜案",
          targetAudience: "成年读者",
          premise: "一次停摆的潮汐钟，让修钟学徒卷进旧港失踪案。",
          narrativeView: "第三人称限知",
          storyStructure: "三幕式",
          lengthCategory: "MEDIUM",
          plannedChapterCount: 18,
          targetWordsPerChapter: 3000,
          worldSeed: "盐雾旧港与失灵潮汐钟构成故事舞台。",
          styleGoal: "克制、冷感、细节推进。",
          styleSamples: [],
          factionSeeds: [],
          locationSeeds: [],
          characterSeeds: [],
          relationSeeds: [],
          guessedFields: ["targetAudience"],
          missingFields: ["styleSamples"],
          confidenceNotes: ["目标受众为推测"]
        }
      });

    const response = await POST(
      buildRequest({
        sourceText: "这是一个足够长的设定说明文本，用来验证英文结果会触发一次中文化整理。"
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      draft: expect.objectContaining({
        title: "潮汐灰烬",
        premise: "一次停摆的潮汐钟，让修钟学徒卷进旧港失踪案。",
        worldSeed: "盐雾旧港与失灵潮汐钟构成故事舞台。",
        confidenceNotes: ["目标受众为推测"]
      }),
      promptPreview: "mocked parsing prompt"
    });

    expect(buildSetupChineseRewritePrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Tide Ashes",
        premise: "A clockmaker apprentice gets pulled into an old port disappearance case."
      })
    );
    expect(callRoutedJsonModel).toHaveBeenCalledTimes(2);
    expect(callRoutedJsonModel).toHaveBeenNthCalledWith(2, {
      messages: [
        {
          role: "system",
          content:
            "你是中文小说设定整理助手。你只能把已有 JSON 草稿改写为简体中文，不能补充新事实，不能改变结构。只返回合法 JSON。"
        },
        {
          role: "user",
          content: "mocked chinese rewrite prompt"
        }
      ],
      modelSelection: "auto"
    });
  });

  it("returns 400 for invalid payload", async () => {
    const response = await POST(
      buildRequest({
        sourceText: "太短了"
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      message: "Invalid parse-setup payload."
    });
  });

  it("returns 400 when sourceType does not match sourceName", async () => {
    const response = await POST(
      buildRequest({
        sourceName: "setup.pdf",
        sourceType: "markdown",
        sourceText: "这是一个足够长的设定说明文本，用来生成稳定的解析草稿，并测试文件类型不一致。"
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      message: "sourceType does not match sourceName."
    });
  });

  it("returns 400 for unsupported docx and pdf source types", async () => {
    const docxResponse = await POST(
      buildRequest({
        sourceName: "setup.docx",
        sourceType: "docx",
        sourceText: "这是一个足够长的设定说明文本，用来验证 docx 在当前阶段会给出明确错误提示。"
      })
    );
    const pdfResponse = await POST(
      buildRequest({
        sourceName: "setup.pdf",
        sourceType: "pdf",
        sourceText: "这是一个足够长的设定说明文本，用来验证 pdf 在当前阶段会给出明确错误提示。"
      })
    );

    expect(docxResponse.status).toBe(400);
    await expect(docxResponse.json()).resolves.toEqual({
      message: "暂不支持直接解析该文件，请先转换为 txt 或 md 后再上传。"
    });

    expect(pdfResponse.status).toBe(400);
    await expect(pdfResponse.json()).resolves.toEqual({
      message: "暂不支持直接解析该文件，请先转换为 txt 或 md 后再上传。"
    });
  });

  it("returns 500 when AI parsing fails unexpectedly", async () => {
    callRoutedJsonModel.mockRejectedValueOnce(new Error("boom"));

    const response = await POST(
      buildRequest({
        sourceText: "这是一个足够长的设定说明文本，用来生成稳定的解析草稿，并触发内部错误分支。"
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      message: "Setup parsing failed."
    });
  });

  it("returns 500 when prompt building fails unexpectedly", async () => {
    buildSetupParsingPrompt.mockImplementationOnce(() => {
      throw new Error("boom");
    });

    const response = await POST(
      buildRequest({
        sourceText: "这是一个足够长的设定说明文本，用来生成稳定的解析草稿，并触发内部错误分支。"
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      message: "Setup parsing failed."
    });
  });
});

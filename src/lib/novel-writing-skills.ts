import type { AssistMode } from "@/lib/ai/types";

export const writingSkillPresetIds = [
  "workflow-guide",
  "chapter-runner",
  "toolkit-builder",
  "voice-keeper",
  "crucible-planner",
  "crucible-outliner",
  "crucible-writer",
  "crucible-editor"
] as const;

export type WritingSkillPresetId = (typeof writingSkillPresetIds)[number];

export type WritingSkillPreset = {
  id: WritingSkillPresetId;
  name: string;
  sourceName: string;
  sourceUrl: string;
  mode: AssistMode;
  summary: string;
  instruction: string;
  focus: string[];
};

export const writingSkillPresets: WritingSkillPreset[] = [
  {
    id: "workflow-guide",
    name: "流程规划",
    sourceName: "Novel Writer Workflow Guide",
    sourceUrl: "https://mcpmarket.com/zh/tools/skills/novel-writer-workflow-guide",
    mode: "outline",
    summary: "按 constitution / specify / clarify / plan / tasks / write / analyze 七步梳理项目推进。",
    instruction:
      "按七步工作流审视当前章节：constitution 提炼写作原则，specify 明确本章规格，clarify 列出必须澄清的问题，plan 给出执行方案，tasks 拆成可完成的小任务，write 只给写作方向，analyze 检查质量风险。不要直接生成整章正文，优先输出可执行路线。",
    focus: ["七步流程", "澄清问题", "质量复盘"]
  },
  {
    id: "chapter-runner",
    name: "章节任务卡",
    sourceName: "Claude-Code-Novel-Writer",
    sourceUrl: "https://github.com/forsonny/Claude-Code-Novel-Writer/tree/main",
    mode: "outline",
    summary: "借鉴 Novel-OS 的上下文分层，把章节变成可执行写作任务卡。",
    instruction:
      "基于作品标准、当前小说上下文和章节草稿生成任务卡。必须包含：本章服务的故事功能、场景目标、主要冲突、人物当下欲望和阻力、要回收或埋下的伏笔、不能提前解释的内容、下一段最该写的动作。只给任务卡和判断，不扩写正文。",
    focus: ["上下文分层", "场景目标", "伏笔管理"]
  },
  {
    id: "toolkit-builder",
    name: "创作工具箱",
    sourceName: "Build Your AI Writing Toolkit",
    sourceUrl: "https://futurefictionacademy.com/build-your-own-ai-writing-toolkit-with-claude-skills/",
    mode: "audit",
    summary: "把写作材料整理成可复用资产，适合沉淀设定卡、资料待查清单和后续提示。",
    instruction:
      "把当前文本和上下文整理成可复用创作资产。输出：可沉淀的设定卡、人物卡更新建议、资料待查清单、后续章节可复用提示。只整理和建议，不扩写正文。",
    focus: ["资料沉淀", "设定卡", "复用提示"]
  },
  {
    id: "voice-keeper",
    name: "文风守门",
    sourceName: "Fiction Writing Voice Skill + humanize-novel-prose",
    sourceUrl: "https://nicolascolefiction.substack.com/p/how-to-build-a-claude-cowork-skill",
    mode: "rewrite",
    summary: "结合本地去 AI 味规则和文风记忆，处理句法、对白、情绪直白和平均化表达。",
    instruction:
      "先诊断当前文本的 AI 腔、平均句式和偏离本书文风的地方，再在不改剧情事实的前提下改写。重点处理句法节奏、角色口吻、动作细节、情绪侧写和意象重复。",
    focus: ["去 AI 味", "角色口吻", "文风记忆"]
  },
  {
    id: "crucible-planner",
    name: "Crucible 规划",
    sourceName: "The Crucible Writing System - Planner",
    sourceUrl: "https://agent-skills.md/skills/forsonny/The-Crucible-Writing-System-For-Claude/crucible-planner",
    mode: "outline",
    summary: "为长篇幻想或类型小说搭建可持续的核心冲突、主题压力和人物弧线。",
    instruction:
      "从当前设定中提炼小说规划：核心承诺、主角欲望、外部冲突、内在缺口、主题压力、主要反派或阻力、卷级推进。输出规划建议和缺口，不写正文，不把设定一次性解释完。",
    focus: ["核心承诺", "人物弧线", "主题压力"]
  },
  {
    id: "crucible-outliner",
    name: "Crucible 大纲",
    sourceName: "The Crucible Writing System - Outliner",
    sourceUrl: "https://agent-skills.md/skills/forsonny/The-Crucible-Writing-System-For-Claude/crucible-outliner",
    mode: "outline",
    summary: "把章节或场景拆成目标、冲突、转折和钩子，服务后续写作。",
    instruction:
      "为当前章节生成可写的大纲。每个段落或场景都要包含：场景目标、冲突来源、角色选择、信息释放、情绪转折、结尾钩子。避免抽象总结，避免提前替正文写漂亮句子。",
    focus: ["场景节拍", "转折", "结尾钩子"]
  },
  {
    id: "crucible-writer",
    name: "Crucible 写作",
    sourceName: "The Crucible Writing System - Writer",
    sourceUrl: "https://agent-skills.md/skills/forsonny/The-Crucible-Writing-System-For-Claude/crucible-writer",
    mode: "continue",
    summary: "按场景目标、冲突和角色选择推进正文，强调沉浸感和可读性。",
    instruction:
      "根据当前文本继续写一个短场景。必须先服务场景目标，让冲突通过动作、对白和选择推进；不要解释大纲，不要复述设定，不要用总结句替代场面。保持本书文风资产，输出可以直接追加到正文的候选稿。",
    focus: ["场景目标", "冲突", "沉浸正文"]
  },
  {
    id: "crucible-editor",
    name: "Crucible 编辑",
    sourceName: "The Crucible Writing System - Editor",
    sourceUrl: "https://agent-skills.md/skills/forsonny/The-Crucible-Writing-System-For-Claude/crucible-editor",
    mode: "rewrite",
    summary: "从结构、节奏、角色动机和句子质感四个层面编辑已有正文。",
    instruction:
      "编辑当前文本，先指出结构、节奏、角色动机和句子质感的问题，再给一版保剧情事实的改写。重点加强选择、冲突、潜台词和段落节奏，删掉解释腔、重复信息和空泛情绪判断。",
    focus: ["结构编辑", "潜台词", "节奏修订"]
  }
];

export function getWritingSkillPreset(id?: string | null) {
  if (!id) {
    return undefined;
  }

  return writingSkillPresets.find((preset) => preset.id === id);
}

export const assistModes = ["continue", "rewrite", "outline", "audit"] as const;
export type AssistMode = (typeof assistModes)[number];
export const modelSelections = [
  "auto",
  "kimi",
  "glm",
  "mimo",
  "minimax",
  "qwen",
  "deepseek",
  "fallback"
] as const;
export type ModelSelection = (typeof modelSelections)[number];

export interface WritingSuggestion {
  title: string;
  text: string;
  why: string;
}

export interface WritingAssistMeta {
  requestedModel: ModelSelection;
  resolvedProvider: string;
  resolvedModel: string;
  usedFallback: boolean;
}

export interface WritingAssistResponse {
  mode: AssistMode;
  summary: string;
  primary: WritingSuggestion;
  alternatives: WritingSuggestion[];
  warnings: string[];
  nextContext: string[];
  meta: WritingAssistMeta;
}

export interface WritingAssistInput {
  mode: AssistMode;
  modelSelection: ModelSelection;
  skillPresetId?: string;
  instruction: string;
  currentText: string;
  selectionText?: string;
  disableStyleProfile?: boolean;
  novel: {
    title: string;
    premise?: string;
    voiceRules: string[];
    styleProfile?: {
      styleSummary?: string;
      styleRules: string[];
      avoidRules: string[];
      dialogueRules: string[];
      narrationRules: string[];
      rhythmRules: string[];
      imageryRules: string[];
    };
  };
  chapter: {
    title: string;
    sceneGoal?: string;
  };
  entities: Array<{
    name: string;
    type: string;
    summary?: string;
  }>;
  foreshadows: Array<{
    hook: string;
    status: string;
  }>;
}

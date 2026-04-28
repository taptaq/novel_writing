import type { ModelSelection } from "@/lib/ai/types";
import { env } from "@/lib/env";

export interface ModelProvider {
  selection: Exclude<ModelSelection, "auto">;
  provider: string;
  model: string;
  baseUrl: string;
  apiKey?: string;
  temperature: number;
  topP: number;
  priority: number;
}

export function getOrderedProviders(): ModelProvider[] {
  return [
    {
      selection: "kimi",
      provider: "dmx-kimi",
      model: env.dmxModelKimi,
      baseUrl: env.dmxBaseUrl,
      apiKey: env.dmxApiKey,
      temperature: 1,
      topP: 1,
      priority: 1
    },
    {
      selection: "kimi",
      provider: "official-kimi",
      model: env.kimiModel,
      baseUrl: env.kimiBaseUrl,
      apiKey: env.kimiApiKey,
      temperature: 1,
      topP: 1,
      priority: 2
    },
    {
      selection: "glm",
      provider: "dmx-glm",
      model: env.dmxModelGlm,
      baseUrl: env.dmxBaseUrl,
      apiKey: env.dmxApiKey,
      temperature: 1,
      topP: 1,
      priority: 1
    },
    {
      selection: "glm",
      provider: "official-glm",
      model: env.glmModel,
      baseUrl: env.glmBaseUrl,
      apiKey: env.glmApiKey,
      temperature: 1,
      topP: 1,
      priority: 2
    },
    {
      selection: "mimo",
      provider: "dmx-mimo",
      model: env.dmxModelMimo,
      baseUrl: env.dmxBaseUrl,
      apiKey: env.dmxApiKey,
      temperature: 1,
      topP: 0.95,
      priority: 1
    },
    {
      selection: "minimax",
      provider: "dmx-minimax",
      model: env.dmxModelMinimax,
      baseUrl: env.dmxBaseUrl,
      apiKey: env.dmxApiKey,
      temperature: 0.7,
      topP: 1,
      priority: 1
    },
    {
      selection: "qwen",
      provider: "dmx-qwen",
      model: env.dmxModelQwen,
      baseUrl: env.dmxBaseUrl,
      apiKey: env.dmxApiKey,
      temperature: 0.6,
      topP: 0.95,
      priority: 1
    },
    {
      selection: "qwen",
      provider: "official-qwen",
      model: env.qwenModel,
      baseUrl: env.qwenBaseUrl,
      apiKey: env.qwenApiKey,
      temperature: 0.6,
      topP: 0.95,
      priority: 2
    },
    {
      selection: "deepseek",
      provider: "deepseek-official",
      model: env.deepseekModel,
      baseUrl: env.deepseekBaseUrl,
      apiKey: env.deepseekApiKey,
      temperature: 1,
      topP: 1,
      priority: 1
    },
    {
      selection: "fallback",
      provider: "fallback",
      model: env.llmModel,
      baseUrl: env.llmBaseUrl,
      apiKey: env.llmApiKey,
      temperature: 0.7,
      topP: 1,
      priority: 1
    }
  ];
}

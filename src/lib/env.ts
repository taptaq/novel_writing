function read(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
}

export const env = {
  appName: read("APP_NAME") ?? "Human Draft Studio",
  databaseUrl: read("DATABASE_URL"),
  directUrl: read("DIRECT_URL"),
  llmBaseUrl: read("LLM_BASE_URL") ?? "https://api.openai.com/v1",
  llmApiKey: read("LLM_API_KEY"),
  llmModel: read("LLM_MODEL") ?? "gpt-4o-mini",
  dmxApiKey: read("DMX_API_KEY"),
  dmxBaseUrl: read("DMX_BASE_URL") ?? "https://www.dmxapi.cn/v1",
  dmxModelKimi: read("DMX_MODEL_KIMI") ?? "kimi-k2.6-free",
  dmxModelGlm: read("DMX_MODEL_GLM") ?? "glm-5.1-free",
  dmxModelMimo: read("DMX_MODEL_MIMO") ?? "mimo-v2.5-free",
  dmxModelMinimax: read("DMX_MODEL_MINIMAX") ?? "MiniMax-M2.7-free",
  dmxModelQwen: read("DMX_MODEL_QWEN") ?? "qwen3.5-plus-free",
  kimiApiKey: read("KIMI_API_KEY"),
  kimiBaseUrl: read("KIMI_BASE_URL") ?? "https://api.moonshot.cn/v1",
  kimiModel: read("KIMI_MODEL") ?? "moonshot-v1-8k",
  glmApiKey: read("GLM_API_KEY"),
  glmBaseUrl: read("GLM_BASE_URL") ?? "https://open.bigmodel.cn/api/paas/v4",
  glmModel: read("GLM_MODEL") ?? "glm-4.5-air",
  qwenApiKey: read("QWEN_API_KEY"),
  qwenBaseUrl: read("QWEN_BASE_URL") ?? "https://dashscope.aliyuncs.com/compatible-mode/v1",
  qwenModel: read("QWEN_MODEL") ?? "qwen-plus",
  deepseekApiKey: read("DEEPSEEK_API_KEY"),
  deepseekBaseUrl: read("DEEPSEEK_BASE_URL") ?? "https://api.deepseek.com",
  deepseekModel: read("DEEPSEEK_MODEL") ?? "deepseek-v4-flash"
};

export const isDatabaseConfigured = Boolean(env.databaseUrl && env.directUrl);
export const isAiConfigured = Boolean(
  env.dmxApiKey ||
    env.kimiApiKey ||
    env.glmApiKey ||
    env.qwenApiKey ||
    env.deepseekApiKey ||
    env.llmApiKey
);

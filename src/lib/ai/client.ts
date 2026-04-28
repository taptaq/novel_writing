export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface JsonModelCallOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  topP: number;
  messages: ChatMessage[];
  chatTemplateKwargs?: Record<string, unknown>;
}

export function extractJsonPayload(input: string) {
  const fencedMatch = input.match(/```json\s*([\s\S]*?)```/i);
  const raw = fencedMatch?.[1] ?? input;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");

  if (start === -1 || end === -1 || end < start) {
    throw new Error("No JSON payload found in model response.");
  }

  return JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
}

export async function invokeJsonChatModel(options: JsonModelCallOptions) {
  const body = {
    model: options.model,
    temperature: options.temperature,
    top_p: options.topP,
    messages: options.messages
  } as Record<string, unknown>;

  if (options.chatTemplateKwargs && Object.keys(options.chatTemplateKwargs).length > 0) {
    body.chat_template_kwargs = options.chatTemplateKwargs;
  }

  const response = await fetch(`${options.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${options.apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`Model request failed with status ${response.status}.`);
  }

  const data = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };

  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Model response is empty.");
  }

  return extractJsonPayload(content);
}

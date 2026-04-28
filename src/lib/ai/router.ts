import { invokeJsonChatModel, type ChatMessage } from "@/lib/ai/client";
import { getOrderedProviders } from "@/lib/ai/providers";
import type { ModelProvider } from "@/lib/ai/providers";
import type { ModelSelection } from "@/lib/ai/types";

type ConfiguredProvider = ModelProvider & {
  apiKey: string;
  baseUrl: string;
  model: string;
};

function isProviderConfigured(provider: ModelProvider): provider is ConfiguredProvider {
  return Boolean(provider.apiKey && provider.baseUrl && provider.model);
}

function sortByPriority(candidates: ModelProvider[]) {
  return [...candidates].sort((left, right) => left.priority - right.priority);
}

export async function callRoutedJsonModel({
  messages,
  modelSelection
}: {
  messages: ChatMessage[];
  modelSelection: ModelSelection;
}) {
  const providers = getOrderedProviders();
  const fallbackProviders = sortByPriority(
    providers.filter((provider) => provider.selection === "fallback")
  );
  const primaryCandidates =
    modelSelection === "auto" || modelSelection === "fallback"
      ? []
      : sortByPriority(providers.filter((provider) => provider.selection === modelSelection));
  const candidates =
    modelSelection === "auto"
      ? providers
      : modelSelection === "fallback"
        ? fallbackProviders
        : [...primaryCandidates, ...fallbackProviders];

  if (candidates.length === 0) {
    throw new Error("Unknown model selection.");
  }

  const errors: string[] = [];

  for (const provider of candidates) {
    if (!isProviderConfigured(provider)) {
      if (modelSelection === "auto" || provider.selection === "fallback") {
        errors.push(`${provider.selection}: missing configuration`);
        continue;
      }

      continue;
    }

    try {
      const payload = await invokeJsonChatModel({
        baseUrl: provider.baseUrl,
        apiKey: provider.apiKey,
        model: provider.model,
        temperature: provider.temperature,
        topP: provider.topP,
        messages
      });

      return {
        payload,
        meta: {
          requestedModel: modelSelection,
          resolvedProvider: provider.provider,
          resolvedModel: provider.model,
          usedFallback: provider.selection === "fallback"
        }
      };
    } catch (error) {
      errors.push(
        `${provider.provider}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  throw new Error(`All model providers failed. ${errors.join(" | ")}`);
}

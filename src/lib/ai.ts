import OpenAI from "openai";
import {
  getConfiguredModels,
  getDefaultOpenAiModel,
  requireOpenAiKey,
} from "@/lib/env";
import { listKnowledgeFiles } from "@/lib/google-drive";
import type { ChatMessage } from "@/lib/types";

const systemInstructions = [
  "You are Assistant Chat SA-A01.",
  "You can answer general questions on any topic, not just business or automation.",
  "Answer in the user's language unless they ask for another language.",
  "Be clear, direct, and useful.",
  "When a question is unrelated to business, still answer it normally.",
  "Do not claim to have read Google Drive files unless file context is explicitly provided in this request.",
].join("\n");

function toResponseInput(messages: ChatMessage[]) {
  return messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));
}

function getCandidateModels(preferredModel?: string) {
  const configuredModels = getConfiguredModels();
  const ordered = preferredModel
    ? [preferredModel, ...configuredModels]
    : [getDefaultOpenAiModel(), ...configuredModels];

  return Array.from(new Set(ordered.filter(Boolean)));
}

function shouldTryFallback(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();

  return (
    message.includes("does not have access to model") ||
    message.includes("model") && message.includes("not found") ||
    message.includes("unsupported model")
  );
}

export async function generateAssistantReply(
  _conversationId: string,
  messages: ChatMessage[],
  preferredModel?: string,
) {
  const client = new OpenAI({
    apiKey: requireOpenAiKey(),
  });

  const knowledgeFiles = await listKnowledgeFiles();
  const knowledgeContext = knowledgeFiles.length
    ? `Google Drive knowledge files available in storage:\n${knowledgeFiles
        .slice(0, 20)
        .map((file) => `- ${file.name}`)
        .join("\n")}`
    : "No Google Drive knowledge files are currently available.";

  const candidateModels = getCandidateModels(preferredModel);
  let lastError: Error | null = null;

  for (const model of candidateModels) {
    try {
      const response = await client.responses.create({
        model,
        instructions: `${systemInstructions}\n\n${knowledgeContext}`,
        input: toResponseInput(messages),
      });

      const text = response.output_text.trim();

      if (!text) {
        throw new Error("The model returned an empty reply.");
      }

      return {
        modelUsed: model,
        text,
      };
    } catch (error) {
      if (error instanceof Error) {
        lastError = error;
      }

      if (!shouldTryFallback(error) || model === candidateModels.at(-1)) {
        throw error;
      }
    }
  }

  throw lastError ?? new Error("No model could generate a reply.");
}

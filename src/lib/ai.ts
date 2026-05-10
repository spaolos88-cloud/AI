import OpenAI from "openai";
import { env, requireOpenAiKey } from "@/lib/env";
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

export async function generateAssistantReply(
  _conversationId: string,
  messages: ChatMessage[],
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

  const response = await client.responses.create({
    model: env.openAiModel,
    instructions: `${systemInstructions}\n\n${knowledgeContext}`,
    input: toResponseInput(messages),
  });

  const text = response.output_text.trim();

  if (!text) {
    throw new Error("The model returned an empty reply.");
  }

  return text;
}

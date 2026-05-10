import OpenAI from "openai";
import { requireOpenAiAssistantId, requireOpenAiKey } from "@/lib/env";
import type { ChatMessage } from "@/lib/types";

type ConversationState = {
  processedUserMessageIds: Set<string>;
  threadId: string;
};

const conversationStates = new Map<string, ConversationState>();

function getUserMessages(messages: ChatMessage[]) {
  return messages.filter((message) => message.role === "user");
}

function toThreadMessages(messages: ChatMessage[]) {
  return messages.map((message) => ({
    role: "user" as const,
    content: message.content,
  }));
}

function extractAssistantText(
  content: Array<{
    type: string;
    text?: { value?: string };
  }>,
) {
  return content
    .filter((item) => item.type === "text" && item.text?.value)
    .map((item) => item.text?.value?.trim() ?? "")
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

async function readRunReply(
  client: OpenAI,
  threadId: string,
  runId: string,
  retries = 10,
) {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    const threadMessages = await client.beta.threads.messages.list(threadId, {
      order: "desc",
      limit: 20,
    });

    const assistantMessage = threadMessages.data.find(
      (message) =>
        message.role === "assistant" &&
        message.run_id === runId &&
        Array.isArray(message.content),
    );

    if (assistantMessage) {
      const text = extractAssistantText(assistantMessage.content);

      if (text) {
        return text;
      }
    }

    const latestAssistantMessage = threadMessages.data.find(
      (message) =>
        message.role === "assistant" && Array.isArray(message.content),
    );

    if (latestAssistantMessage) {
      const text = extractAssistantText(latestAssistantMessage.content);

      if (text) {
        return text;
      }
    }

    if (attempt < retries - 1) {
      await new Promise((resolve) => setTimeout(resolve, 800));
    }
  }

  throw new Error("Assistant run completed without a reply message.");
}

export async function generateAssistantReply(
  conversationId: string,
  messages: ChatMessage[],
) {
  const client = new OpenAI({
    apiKey: requireOpenAiKey(),
  });

  const assistantId = requireOpenAiAssistantId();
  const userMessages = getUserMessages(messages);

  if (userMessages.length === 0) {
    throw new Error("At least one user message is required.");
  }

  const existingState = conversationStates.get(conversationId);

  if (!existingState) {
    const run = await client.beta.threads.createAndRunPoll({
      assistant_id: assistantId,
      thread: {
        messages: toThreadMessages(userMessages),
      },
    });

    conversationStates.set(conversationId, {
      processedUserMessageIds: new Set(userMessages.map((message) => message.id)),
      threadId: run.thread_id,
    });

    return readRunReply(client, run.thread_id, run.id);
  }

  const newUserMessages = userMessages.filter(
    (message) => !existingState.processedUserMessageIds.has(message.id),
  );

  const messagesToAppend =
    newUserMessages.length > 0
      ? newUserMessages
      : [userMessages[userMessages.length - 1]];

  for (const message of messagesToAppend) {
    await client.beta.threads.messages.create(existingState.threadId, {
      role: "user",
      content: message.content,
    });
    existingState.processedUserMessageIds.add(message.id);
  }

  const run = await client.beta.threads.runs.createAndPoll(
    existingState.threadId,
    {
      assistant_id: assistantId,
    },
  );

  return readRunReply(client, existingState.threadId, run.id);
}

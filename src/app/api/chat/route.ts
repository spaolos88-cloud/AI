import { generateAssistantReply } from "@/lib/ai";
import { putJsonToGoogleDrive } from "@/lib/google-drive";
import type { ChatMessage, ChatRequest, ChatResponse } from "@/lib/types";

export const runtime = "nodejs";

function isValidMessage(message: unknown): message is ChatMessage {
  if (!message || typeof message !== "object") {
    return false;
  }

  const candidate = message as Partial<ChatMessage>;

  return (
    typeof candidate.id === "string" &&
    (candidate.role === "user" || candidate.role === "assistant") &&
    typeof candidate.content === "string" &&
    candidate.content.trim().length > 0 &&
    typeof candidate.createdAt === "string"
  );
}

function createMessage(content: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role: "assistant",
    content,
    createdAt: new Date().toISOString(),
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<ChatRequest>;

    if (
      typeof body.conversationId !== "string" ||
      !Array.isArray(body.messages) ||
      !body.messages.every(isValidMessage)
    ) {
      return Response.json(
        { error: "Invalid chat request payload." },
        { status: 400 },
      );
    }

    const reply = await generateAssistantReply(
      body.conversationId,
      body.messages,
    );
    const assistantMessage = createMessage(reply);
    const fullConversation = [...body.messages, assistantMessage];

    const storage = await putJsonToGoogleDrive(
      `Conversations/${body.conversationId}.json`,
      {
        id: body.conversationId,
        updatedAt: new Date().toISOString(),
        messages: fullConversation,
      },
    );

    const payload: ChatResponse = {
      message: assistantMessage,
      storage,
    };

    return Response.json(payload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected chat server error.";

    return Response.json({ error: message }, { status: 500 });
  }
}

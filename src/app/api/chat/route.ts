import { generateAssistantReply } from "@/lib/ai";
import { putJsonToGoogleDrive } from "@/lib/google-drive";
import type {
  ChatAttachment,
  ChatMessage,
  ChatRequest,
  ChatResponse,
} from "@/lib/types";

export const runtime = "nodejs";
const MAX_ATTACHMENT_COUNT = 4;
const MAX_TOTAL_ATTACHMENT_BYTES = 12 * 1024 * 1024;

function isValidAttachment(attachment: unknown): attachment is ChatAttachment {
  if (!attachment || typeof attachment !== "object") {
    return false;
  }

  const candidate = attachment as Partial<ChatAttachment>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.mimeType === "string" &&
    (candidate.kind === "image" ||
      candidate.kind === "video" ||
      candidate.kind === "file") &&
    typeof candidate.sizeBytes === "number" &&
    Number.isFinite(candidate.sizeBytes) &&
    candidate.sizeBytes >= 0 &&
    typeof candidate.dataUrl === "string" &&
    candidate.dataUrl.startsWith("data:")
  );
}

function isValidMessage(message: unknown): message is ChatMessage {
  if (!message || typeof message !== "object") {
    return false;
  }

  const candidate = message as Partial<ChatMessage>;

  return (
    typeof candidate.id === "string" &&
    (candidate.role === "user" || candidate.role === "assistant") &&
    typeof candidate.content === "string" &&
    typeof candidate.createdAt === "string" &&
    (candidate.attachments === undefined ||
      (Array.isArray(candidate.attachments) &&
        candidate.attachments.every(isValidAttachment))) &&
    (candidate.content.trim().length > 0 ||
      (candidate.attachments?.length ?? 0) > 0)
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
    const totalAttachmentBytes = (body.messages ?? []).reduce(
      (total, message) =>
        total +
        (message?.attachments ?? []).reduce(
          (attachmentTotal, attachment) =>
            attachmentTotal + (attachment?.sizeBytes ?? 0),
          0,
        ),
      0,
    );
    const exceedsAttachmentCount = (body.messages ?? []).some(
      (message) => (message?.attachments?.length ?? 0) > MAX_ATTACHMENT_COUNT,
    );

    if (
      typeof body.conversationId !== "string" ||
      !Array.isArray(body.messages) ||
      !body.messages.every(isValidMessage) ||
      (body.model !== undefined && typeof body.model !== "string") ||
      exceedsAttachmentCount ||
      totalAttachmentBytes > MAX_TOTAL_ATTACHMENT_BYTES
    ) {
      return Response.json(
        {
          error:
            exceedsAttachmentCount
              ? "Too many attachments. Keep each message to 4 files or fewer."
              : totalAttachmentBytes > MAX_TOTAL_ATTACHMENT_BYTES
                ? "Attachments are too large. Keep the total upload under 12 MB."
                : "Invalid chat request payload.",
        },
        { status: 400 },
      );
    }

    const reply = await generateAssistantReply(
      body.conversationId,
      body.messages,
      body.model,
    );
    const assistantMessage = createMessage(reply.text);
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
      modelUsed: reply.modelUsed,
      storage,
    };

    return Response.json(payload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected chat server error.";

    return Response.json({ error: message }, { status: 500 });
  }
}

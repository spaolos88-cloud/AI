"use client";

import Image from "next/image";
import {
  Bot,
  Cloud,
  FileText,
  ImageIcon,
  Loader2,
  LogOut,
  MessageSquare,
  PanelLeft,
  Paperclip,
  Plus,
  Send,
  User,
  Video,
  X,
} from "lucide-react";
import { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react";
import type {
  ChatAttachment,
  ChatMessage,
  ChatResponse,
  StorageStatus,
} from "@/lib/types";

const starterPrompts = [
  "Gumawa ng lead capture plan para sa service business.",
  "Ayusin ang workflow ng booking, CRM, at follow-up.",
  "Ano ang pinakamagandang paraan para matuto ng JavaScript?",
];
const MAX_ATTACHMENT_COUNT = 4;
const MAX_ATTACHMENT_SIZE_BYTES = 6 * 1024 * 1024;
const MAX_TOTAL_ATTACHMENT_BYTES = 12 * 1024 * 1024;

function createId() {
  return crypto.randomUUID();
}

function getAttachmentKind(file: File): ChatAttachment["kind"] {
  if (file.type.startsWith("image/")) {
    return "image";
  }

  if (file.type.startsWith("video/")) {
    return "video";
  }

  return "file";
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error(`Hindi mabasa ang file na "${file.name}".`));
        return;
      }

      resolve(reader.result);
    };
    reader.onerror = () => {
      reject(new Error(`Hindi mabasa ang file na "${file.name}".`));
    };
    reader.readAsDataURL(file);
  });
}

async function toChatAttachment(file: File): Promise<ChatAttachment> {
  return {
    id: createId(),
    name: file.name,
    mimeType: file.type || "application/octet-stream",
    kind: getAttachmentKind(file),
    sizeBytes: file.size,
    dataUrl: await readFileAsDataUrl(file),
  };
}

function formatBytes(sizeBytes: number) {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function createUserMessage(
  content: string,
  attachments: ChatAttachment[],
): ChatMessage {
  return {
    id: createId(),
    role: "user",
    content,
    createdAt: new Date().toISOString(),
    attachments,
  };
}

type AssistantShellProps = {
  availableModels: string[];
  defaultModel: string;
};

export function AssistantShell({
  availableModels,
  defaultModel,
}: AssistantShellProps) {
  const [conversationId, setConversationId] = useState(() => createId());
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: createId(),
      role: "assistant",
      content:
        "Assistant Chat SA-A01 ready. Puwede mo akong tanungin tungkol sa kahit ano.",
      createdAt: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>(
    [],
  );
  const [selectedModel, setSelectedModel] = useState(defaultModel);
  const [activeModel, setActiveModel] = useState(defaultModel);
  const [storage, setStorage] = useState<StorageStatus>({
    enabled: false,
    saved: false,
    message: "Google Drive storage waiting for Google OAuth configuration.",
  });
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const lastMessage = messages[messages.length - 1];
  const canSend =
    (input.trim().length > 0 || pendingAttachments.length > 0) &&
    !isSending &&
    !isUploading;

  const statusLabel = useMemo(() => {
    if (isSending) {
      return "Thinking";
    }

    if (isUploading) {
      return "Preparing upload";
    }

    if (storage.saved) {
      return "Saved to Google Drive";
    }

    if (storage.enabled) {
      return "Google Drive needs attention";
    }

    return "Local chat mode";
  }, [isSending, isUploading, storage.enabled, storage.saved]);

  async function handleAttachmentSelect(event: ChangeEvent<HTMLInputElement>) {
    const fileList = event.target.files;

    if (!fileList?.length) {
      return;
    }

    const incomingFiles = Array.from(fileList);
    const nextCount = pendingAttachments.length + incomingFiles.length;

    if (nextCount > MAX_ATTACHMENT_COUNT) {
      setMessages((current) => [
        ...current,
        {
          id: createId(),
          role: "assistant",
          content: `Upload limit reached. Hanggang ${MAX_ATTACHMENT_COUNT} attachments lang bawat message.`,
          createdAt: new Date().toISOString(),
        },
      ]);
      event.target.value = "";
      return;
    }

    const oversizedFile = incomingFiles.find(
      (file) => file.size > MAX_ATTACHMENT_SIZE_BYTES,
    );

    if (oversizedFile) {
      setMessages((current) => [
        ...current,
        {
          id: createId(),
          role: "assistant",
          content: `Masyadong malaki ang "${oversizedFile.name}". Keep each upload under ${formatBytes(MAX_ATTACHMENT_SIZE_BYTES)}.`,
          createdAt: new Date().toISOString(),
        },
      ]);
      event.target.value = "";
      return;
    }

    const nextTotalBytes =
      pendingAttachments.reduce((total, attachment) => total + attachment.sizeBytes, 0) +
      incomingFiles.reduce((total, file) => total + file.size, 0);

    if (nextTotalBytes > MAX_TOTAL_ATTACHMENT_BYTES) {
      setMessages((current) => [
        ...current,
        {
          id: createId(),
          role: "assistant",
          content: `Masyadong malaki ang combined upload. Keep the total under ${formatBytes(MAX_TOTAL_ATTACHMENT_BYTES)}.`,
          createdAt: new Date().toISOString(),
        },
      ]);
      event.target.value = "";
      return;
    }

    setIsUploading(true);

    try {
      const mappedAttachments = await Promise.all(
        incomingFiles.map((file) => toChatAttachment(file)),
      );
      setPendingAttachments((current) => [...current, ...mappedAttachments]);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Hindi na-process ang upload.";
      setMessages((current) => [
        ...current,
        {
          id: createId(),
          role: "assistant",
          content: `Upload error: ${errorMessage}`,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  }

  function removePendingAttachment(attachmentId: string) {
    setPendingAttachments((current) =>
      current.filter((attachment) => attachment.id !== attachmentId),
    );
  }

  async function sendMessage(
    content: string,
    attachmentsOverride?: ChatAttachment[],
  ) {
    const trimmed = content.trim();
    const attachments = attachmentsOverride ?? pendingAttachments;

    if ((trimmed.length === 0 && attachments.length === 0) || isSending) {
      return;
    }

    const userMessage = createUserMessage(trimmed, attachments);
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setInput("");
    setPendingAttachments([]);
    setIsSending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversationId,
          messages: nextMessages,
          model: selectedModel,
        }),
      });

      const payload = (await response.json()) as ChatResponse | { error: string };

      if (!response.ok || "error" in payload) {
        throw new Error("error" in payload ? payload.error : "Chat request failed.");
      }

      setMessages((current) => [...current, payload.message]);
      setActiveModel(payload.modelUsed);
      setStorage(payload.storage);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Hindi na-process ang request.";

      setMessages((current) => [
        ...current,
        {
          id: createId(),
          role: "assistant",
          content: `Server error: ${errorMessage}`,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  function startNewChat() {
    setConversationId(createId());
    setMessages([
      {
        id: createId(),
        role: "assistant",
        content:
          "New chat started. Puwede kang magtanong tungkol sa kahit ano.",
        createdAt: new Date().toISOString(),
      },
    ]);
    setStorage({
      enabled: false,
      saved: false,
      message: "Google Drive storage waiting for Google OAuth configuration.",
    });
    setPendingAttachments([]);
  }

  async function logout() {
    await fetch("/api/session/logout", {
      method: "POST",
    });
    window.location.href = "/login";
  }

  return (
    <main className="min-h-screen bg-[#f5f3ee] text-[#191816]">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="hidden border-r border-[#d8d2c6] bg-[#efebe3] px-4 py-5 lg:block">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#20251f] text-white">
              <Bot size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold">Assistant Chat</p>
              <p className="text-xs text-[#6a655d]">SA-A01 workspace</p>
            </div>
          </div>

          <button
            className="mt-6 flex h-10 w-full items-center justify-center gap-2 rounded-md border border-[#cfc7b9] bg-white text-sm font-medium transition hover:bg-[#faf8f3]"
            type="button"
            onClick={startNewChat}
          >
            <Plus size={16} />
            New chat
          </button>

          <div className="mt-6 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#706b62]">
              System focus
            </p>
            {["Websites", "CRM workflows", "Dashboards", "AI automation"].map(
              (item) => (
                <div
                  className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-[#3d3933]"
                  key={item}
                >
                  <MessageSquare size={15} />
                  {item}
                </div>
              ),
            )}
          </div>
        </aside>

        <section className="flex min-h-screen flex-col">
          <header className="flex min-h-16 items-center justify-between border-b border-[#d8d2c6] bg-[#faf8f3]/90 px-4 backdrop-blur md:px-6">
            <div className="flex items-center gap-3">
              <button
                className="flex h-9 w-9 items-center justify-center rounded-md border border-[#d8d2c6] bg-white lg:hidden"
                type="button"
                aria-label="Open sidebar"
              >
                <PanelLeft size={18} />
              </button>
              <div>
                <h1 className="text-base font-semibold md:text-lg">
                  Assistant Chat SA-A01
                </h1>
                <p className="text-xs text-[#706b62]">
                  Private AI workspace for general chat and Google Drive storage
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 rounded-md border border-[#d8d2c6] bg-white px-2 py-1.5 text-xs text-[#3f3b35]">
                <span className="text-[#706b62]">Model</span>
                <select
                  value={selectedModel}
                  onChange={(event) => setSelectedModel(event.target.value)}
                  className="bg-transparent text-xs outline-none"
                >
                  {availableModels.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-center gap-2 rounded-md border border-[#d8d2c6] bg-white px-3 py-2 text-xs text-[#3f3b35]">
                {isSending ? (
                  <Loader2 className="animate-spin" size={14} />
                ) : (
                  <Cloud size={14} />
                )}
                <span>{statusLabel}</span>
                <span className="text-[#8a847b]">· {activeModel}</span>
              </div>
              <button
                type="button"
                onClick={() => void logout()}
                className="flex h-9 w-9 items-center justify-center rounded-md border border-[#d8d2c6] bg-white text-[#3f3b35] transition hover:bg-[#f5f0e7]"
                aria-label="Logout"
                title="Logout"
              >
                <LogOut size={15} />
              </button>
            </div>
          </header>

          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-5 md:px-6">
              <div className="flex-1 space-y-4 overflow-y-auto pb-4">
                {messages.map((message) => (
                  <article
                    className={`flex gap-3 ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                    key={message.id}
                  >
                    {message.role === "assistant" && (
                      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#20251f] text-white">
                        <Bot size={16} />
                      </div>
                    )}

                    <div
                      className={`max-w-[min(760px,85vw)] rounded-lg px-4 py-3 text-sm leading-6 shadow-sm ${
                        message.role === "user"
                          ? "bg-[#1f3a34] text-white"
                          : "border border-[#ded7ca] bg-white text-[#25221e]"
                      }`}
                    >
                      {message.content.trim().length > 0 && (
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      )}
                      {message.attachments && message.attachments.length > 0 && (
                        <div
                          className={`grid gap-2 ${
                            message.content.trim().length > 0 ? "mt-3" : ""
                          }`}
                        >
                          {message.attachments.map((attachment) => (
                            <div
                              key={attachment.id}
                              className={`rounded-md border px-3 py-2 ${
                                message.role === "user"
                                  ? "border-white/15 bg-white/10"
                                  : "border-[#e7e0d4] bg-[#faf8f3]"
                              }`}
                            >
                              {attachment.kind === "image" ? (
                                <Image
                                  src={attachment.dataUrl}
                                  alt={attachment.name}
                                  width={1200}
                                  height={800}
                                  unoptimized
                                  className="mb-2 max-h-48 w-full rounded-md object-cover"
                                />
                              ) : null}
                              <div className="flex items-center gap-2">
                                {attachment.kind === "image" ? (
                                  <ImageIcon size={15} />
                                ) : attachment.kind === "video" ? (
                                  <Video size={15} />
                                ) : (
                                  <FileText size={15} />
                                )}
                                <div className="min-w-0">
                                  <p className="truncate text-xs font-medium">
                                    {attachment.name}
                                  </p>
                                  <p className="text-[11px] opacity-80">
                                    {formatBytes(attachment.sizeBytes)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {message.role === "user" && (
                      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#d8e2d6] text-[#1f3a34]">
                        <User size={16} />
                      </div>
                    )}
                  </article>
                ))}

                {isSending && (
                  <div className="flex items-center gap-3 text-sm text-[#706b62]">
                    <Loader2 className="animate-spin" size={16} />
                    Assistant Chat SA-A01 is generating a response...
                  </div>
                )}
              </div>

              {messages.length <= 1 && (
                <div className="grid gap-2 pb-4 md:grid-cols-3">
                  {starterPrompts.map((prompt) => (
                    <button
                      className="rounded-lg border border-[#d8d2c6] bg-white px-4 py-3 text-left text-sm leading-5 shadow-sm transition hover:bg-[#faf8f3]"
                      key={prompt}
                      type="button"
                      onClick={() => void sendMessage(prompt, [])}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}

              <form
                className="rounded-xl border border-[#d8d2c6] bg-white p-3 shadow-sm"
                onSubmit={handleSubmit}
              >
                {pendingAttachments.length > 0 && (
                  <div className="mb-3 grid gap-2 md:grid-cols-2">
                    {pendingAttachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="rounded-lg border border-[#e5dfd3] bg-[#faf8f3] p-2"
                      >
                        {attachment.kind === "image" ? (
                          <Image
                            src={attachment.dataUrl}
                            alt={attachment.name}
                            width={1200}
                            height={800}
                            unoptimized
                            className="mb-2 h-28 w-full rounded-md object-cover"
                          />
                        ) : null}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            {attachment.kind === "image" ? (
                              <ImageIcon className="mt-0.5 shrink-0" size={15} />
                            ) : attachment.kind === "video" ? (
                              <Video className="mt-0.5 shrink-0" size={15} />
                            ) : (
                              <FileText className="mt-0.5 shrink-0" size={15} />
                            )}
                            <div className="min-w-0">
                              <p className="truncate text-xs font-medium text-[#25221e]">
                                {attachment.name}
                              </p>
                              <p className="text-[11px] text-[#706b62]">
                                {formatBytes(attachment.sizeBytes)}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removePendingAttachment(attachment.id)}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[#ddd5c8] bg-white text-[#6b655c] transition hover:bg-[#f1ece4]"
                            aria-label={`Remove ${attachment.name}`}
                            title="Remove attachment"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <textarea
                  ref={inputRef}
                  className="min-h-24 w-full resize-none bg-transparent px-1 py-1 text-sm leading-6 outline-none placeholder:text-[#8d867b]"
                  placeholder="Message Assistant Chat SA-A01..."
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void sendMessage(input);
                    }
                  }}
                />
                <div className="flex items-center justify-between gap-3 border-t border-[#eee9df] pt-3">
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-xs text-[#706b62]">
                      {lastMessage?.role === "assistant"
                        ? storage.message
                        : "Conversation will sync after the assistant replies."}
                    </p>
                    <p className="text-[11px] text-[#8d867b]">
                      Upload images, short videos, PDFs, or office files. Keep each
                      file under {formatBytes(MAX_ATTACHMENT_SIZE_BYTES)}.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      onChange={handleAttachmentSelect}
                      accept="image/*,video/*,.pdf,.txt,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex h-10 w-10 items-center justify-center rounded-md border border-[#d8d2c6] bg-white text-[#3f3b35] transition hover:bg-[#f5f0e7] disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Upload attachment"
                      title="Upload image, video, or file"
                      disabled={isSending || isUploading}
                    >
                      {isUploading ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <Paperclip size={16} />
                      )}
                    </button>
                    <button
                      className="flex h-10 min-w-24 items-center justify-center gap-2 rounded-md bg-[#1f3a34] px-4 text-sm font-medium text-white transition hover:bg-[#172c27] disabled:cursor-not-allowed disabled:opacity-50"
                      type="submit"
                      disabled={!canSend}
                    >
                      {isSending ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <Send size={16} />
                      )}
                      Send
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

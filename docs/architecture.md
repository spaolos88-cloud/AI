# Assistant Chat SA-A01 Architecture

## Executive Summary

Assistant Chat SA-A01 is a private ChatGPT-style workspace built with Next.js, TypeScript, and server-side AI calls. Google Drive is the user's cloud storage layer for knowledge files and conversation snapshots. Replies currently come from an OpenAI `asst_...` Assistant ID, while the production path should use Google OAuth instead of manually pasted access tokens.

## Recommended System Map

| Layer | Responsibility | Current MVP |
| --- | --- | --- |
| UI | Chat workspace, conversation status, prompt shortcuts | `src/components/assistant-shell.tsx` |
| API | Validate chat payloads, call AI, save transcript | `src/app/api/chat/route.ts` |
| Access Control | Middleware password gate with session cookie | `middleware.ts` |
| AI Provider | OpenAI Assistants API via Assistant ID | `src/lib/ai.ts` |
| Cloud Storage | Google Drive API | `src/lib/google-drive.ts` |
| Config | Runtime environment variables | `.env.local` |

## Data Flow

1. User sends a message from the browser.
2. Browser posts the full conversation to `/api/chat`.
3. Server validates the request.
4. Server sends the conversation into the configured OpenAI Assistant thread/run flow.
5. Server reads the assistant reply message from the completed run.
6. Server writes the conversation JSON snapshot to Google Drive when Google auth is configured.
7. Browser renders the assistant response and storage status.

## Google Drive Storage Design

Recommended folder structure:

```text
Serio Assistant AI 01
  /Conversations
    {conversationId}.json
  /Knowledge
    business-docs.pdf
    offers.md
    workflows.docx
  /Exports
```

The MVP can list files from `/Knowledge` and save conversations to `/Conversations`. It does not yet extract document text, chunk files, or create a vector index. Those should be the next production steps if the assistant needs reliable answers from documents.

## Production Recommendations

| Need | Recommendation |
| --- | --- |
| Google login | Add OAuth with Google identity and Drive scopes. |
| Real knowledge search | Extract text from Google Drive files, chunk content, store embeddings in PostgreSQL/Supabase or a vector DB. |
| Multi-user access | Add auth, user roles, per-user storage paths, and audit logs. |
| Reliability | Add request logging, rate limits, retry logic, and file sync jobs. |
| Privacy | Keep API keys server-side, never expose Google access tokens to the browser. |

## Environment Variables

```text
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.2
OPENAI_ASSISTANT_ID=
ACCESS_PASSWORD=
GOOGLE_DRIVE_ACCESS_TOKEN=
GOOGLE_DRIVE_ROOT_FOLDER=Serio Assistant AI 01
```

`GOOGLE_DRIVE_ACCESS_TOKEN` is only a development shortcut. For real deployment, use OAuth and store refresh/session tokens securely.

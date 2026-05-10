# Assistant Chat SA-A01

## Executive Summary

Assistant Chat SA-A01 is a private ChatGPT-style web app for business websites, CRM workflows, automations, dashboards, and AI operations. The current MVP uses Next.js, TypeScript, Tailwind CSS, an OpenAI Assistant ID-backed reply flow, and a Google Drive storage boundary.

## Recommended Plan

1. Run the local assistant UI and confirm chat works with `OPENAI_API_KEY` and `OPENAI_ASSISTANT_ID`.
2. Connect Google OAuth so conversation snapshots save to Google Drive.
3. Set `ACCESS_PASSWORD` before sharing the live URL.
4. Add real Google Drive document ingestion and vector search for production knowledge-base answers.

## File Structure

```text
src/app/page.tsx                 Main app route
src/app/api/chat/route.ts        Server chat endpoint
src/components/assistant-shell.tsx ChatGPT-style UI
src/lib/ai.ts                    OpenAI response generation
src/lib/google-drive.ts          Google Drive storage helpers
src/lib/env.ts                   Environment config
src/lib/types.ts                 Shared TypeScript types
docs/architecture.md             System architecture notes
.env.example                     Environment variable template
```

## Setup

Create `.env.local` from `.env.example`:

```bash
cp .env.example .env.local
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Set at minimum:

```text
OPENAI_API_KEY=sk-your-openai-key
OPENAI_MODEL=gpt-5.2
OPENAI_ASSISTANT_ID=asst_your_assistant_id
ACCESS_PASSWORD=change-this-before-sharing
```

For temporary Google Drive development storage:

```text
GOOGLE_DRIVE_ACCESS_TOKEN=your-dev-google-access-token
GOOGLE_DRIVE_ROOT_FOLDER=Serio Assistant AI 01
```

Use Google OAuth for production instead of a pasted access token.

## Run Commands

PowerShell may block `npm.ps1`, so use `npm.cmd`:

```powershell
npm.cmd run dev
npm.cmd run lint
npm.cmd run build
```

Open:

```text
http://localhost:3000
```

## Deployment Notes

Deploy as a standard Next.js app. Keep all keys, passwords, and Google Drive credentials as server-side environment variables. Do not expose `OPENAI_API_KEY`, `ACCESS_PASSWORD`, or Google access tokens to browser code.

For Vercel:

1. Push the project to GitHub.
2. Import the repo into Vercel.
3. Add these Production environment variables in project settings:
   `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_ASSISTANT_ID`, `ACCESS_PASSWORD`, `GOOGLE_DRIVE_ACCESS_TOKEN`, `GOOGLE_DRIVE_ROOT_FOLDER`
4. Deploy and share the generated URL plus the password with your sibling.

## Test Checklist

- Chat sends a message and receives an assistant response.
- Missing `OPENAI_API_KEY` returns a clear server error.
- Missing `OPENAI_ASSISTANT_ID` returns a clear server error.
- `/login` blocks access until the correct `ACCESS_PASSWORD` is entered.
- Unauthorized requests to `/api/chat` return `401`.
- Google Drive disabled mode still allows local chat.
- With Google auth configured, conversations save under `Serio Assistant AI 01/Conversations`.
- UI works on desktop and mobile widths.

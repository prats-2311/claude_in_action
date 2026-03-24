# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Database

The database schema is in `prisma/schema.prisma`. Reference it whenever you need to understand the structure of data stored in the database.

## Code Style

- Use comments sparingly. Only comment complex or non-obvious code.

## Overview

UIGen is an AI-powered React component generator with live preview. Users describe components in a chat interface, Claude generates the code using tool calls, and the result renders in a sandboxed iframe — all without writing files to disk.

## Commands

```bash
# Initial setup (install deps + Prisma generate + migrate)
npm run setup

# Development server (with Turbopack)
npm run dev

# Build
npm run build

# Lint
npm run lint

# Run all tests
npm test

# Run a single test file
npx vitest run src/components/chat/__tests__/ChatInterface.test.tsx

# Reset the database
npm run db:reset
```

The dev server requires `NODE_OPTIONS='--require ./node-compat.cjs'` (already included in npm scripts) due to Node.js compatibility shims for Prisma on this platform.

## Architecture

### Request Flow

1. User types in `ChatInterface` → `ChatProvider` (via Vercel AI SDK `useChat`) sends POST to `/api/chat`
2. `/api/chat/route.ts` reconstructs the `VirtualFileSystem` from serialized state, streams `streamText` with two tools: `str_replace_editor` and `file_manager`
3. Tool calls stream back to the client; `ChatContext` routes each `onToolCall` to `FileSystemContext.handleToolCall`
4. `FileSystemContext` applies the mutation to the in-memory `VirtualFileSystem` and increments `refreshTrigger`
5. `PreviewFrame` reacts to `refreshTrigger`, calls `createImportMap` + `createPreviewHTML`, and sets `iframe.srcdoc`

### Virtual File System

`src/lib/file-system.ts` — `VirtualFileSystem` is a tree-structured, in-memory FS. It never touches the disk. The two AI tools operate on this:

- **`str_replace_editor`** (`src/lib/tools/str-replace.ts`): create/str_replace/insert commands
- **`file_manager`** (`src/lib/tools/file-manager.ts`): rename/delete commands

The FS serializes to `Record<string, FileNode>` for transport (chat body, Prisma `data` column) and deserializes back via `deserializeFromNodes`.

### Live Preview Pipeline

`src/lib/transform/jsx-transformer.ts`:
- Transpiles JSX/TSX files with `@babel/standalone` in the browser
- Builds an ES module import map (blob URLs for local files, `esm.sh` for third-party packages)
- Injects Tailwind CSS via CDN in the generated HTML
- Missing local imports get placeholder stub modules; syntax errors display inline in the preview

### State Management

Two React contexts wrap the main workspace:

- **`FileSystemContext`** (`src/lib/contexts/file-system-context.tsx`): owns the `VirtualFileSystem` instance, selected file, and `refreshTrigger`. Exposes `handleToolCall` which maps AI tool calls to FS mutations.
- **`ChatContext`** (`src/lib/contexts/chat-context.tsx`): wraps Vercel AI SDK `useChat`, passes the serialized FS in every request body, and delegates tool calls to `FileSystemContext`.

### Authentication & Persistence

- JWT-based sessions via `jose`, stored in an `httpOnly` cookie (`src/lib/auth.ts`)
- Prisma + SQLite (`prisma/schema.prisma`): `User` and `Project` models. `Project.messages` and `Project.data` are JSON strings storing chat history and serialized file system state
- Anonymous users can generate components; work is tracked in `src/lib/anon-work-tracker.ts` and can be migrated to an account on sign-up
- Middleware (`src/middleware.ts`) protects `/api/projects` and `/api/filesystem` routes

### Key Directories

```
src/
  app/                  # Next.js App Router pages and API routes
    api/chat/route.ts   # Core streaming AI endpoint
  components/
    chat/               # ChatInterface, MessageList, MessageInput
    editor/             # Monaco-based CodeEditor, FileTree
    preview/            # PreviewFrame (iframe-based live preview)
    auth/               # AuthDialog, SignInForm, SignUpForm
    ui/                 # shadcn/ui primitives
  lib/
    contexts/           # FileSystemContext, ChatContext
    transform/          # JSX→blob URL pipeline (jsx-transformer.ts)
    tools/              # AI tool definitions (str-replace, file-manager)
    prompts/            # System prompt for generation (generation.tsx)
    file-system.ts      # VirtualFileSystem class
    auth.ts             # JWT session helpers (server-only)
  actions/              # Next.js Server Actions for project CRUD
```

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | No | If absent, a mock provider returns static code |
| `JWT_SECRET` | No | Falls back to `development-secret-key` |

### Testing

Tests use Vitest + jsdom + React Testing Library. Test files live alongside source in `__tests__/` subdirectories.

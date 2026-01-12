# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

```bash
pnpm install              # Install dependencies
pnpm run generate         # Generate JS/CSS assets (required before running)
pnpm start                # Run Signal Desktop
pnpm test                 # Run all tests (node + electron + lint + eslint)
pnpm run test-node        # Run Node.js tests only
pnpm run test-electron    # Run Electron tests only
pnpm run test-mock        # Run mock/integration tests
pnpm run lint             # Run all linters (prettier, css, types, eslint)
pnpm run eslint           # Run ESLint only
pnpm run check:types      # TypeScript type checking
pnpm run ready            # Full validation (clean, generate, lint, test)
```

### Development Workflow

```bash
pnpm run dev:transpile    # Watch mode for TypeScript compilation
pnpm run dev:styles       # Watch mode for SCSS/Tailwind compilation
pnpm run dev              # Storybook development server (port 6006)
```

### Building Releases

```bash
pnpm run build            # Full production build
pnpm run build:dev        # Development build (generate + esbuild)
pnpm run test-release     # Test the release build
```

## Architecture Overview

### Electron Process Model

Signal Desktop uses Electron's multi-process architecture with strict file suffix conventions enforced by ESLint:

- **`.main.ts`** - Electron main process only (access to `app`, `BrowserWindow`, `ipcMain`, etc.)
- **`.preload.ts`** - Renderer process with Node.js access (bridge between main and renderer)
- **`.dom.ts`/`.dom.tsx`** - Browser/DOM environment only (React components, DOM APIs)
- **`.node.ts`** - Node.js APIs only (file system, crypto, etc.)
- **`.std.ts`** - Platform-agnostic code (can run anywhere)

The ESLint rule at `.eslint/rules/file-suffix.js` enforces these boundaries by tracking imports.

### Key Directories

- **`app/`** - Electron main process entry (`main.main.ts`) and main process services
- **`ts/`** - TypeScript source code (bulk of the application)
  - **`ts/components/`** - React UI components (`.dom.tsx` files)
  - **`ts/state/`** - Redux state management
    - `ducks/` - Redux slices (actions, reducers)
    - `selectors/` - Reselect selectors
    - `smart/` - Connected components
  - **`ts/services/`** - Application services (calling, backups, notifications, etc.)
  - **`ts/textsecure/`** - Signal protocol implementation (messaging, WebSocket, encryption)
  - **`ts/sql/`** - SQLite database layer (uses `@signalapp/sqlcipher`)
  - **`ts/util/`** - Utility functions
  - **`ts/types/`** - TypeScript type definitions
  - **`ts/jobs/`** - Background job managers (attachments, backups)
  - **`ts/windows/`** - Secondary window entry points (about, debug, permissions)

### State Management

Redux with the ducks pattern. Each duck in `ts/state/ducks/` contains actions and reducers for a feature domain (conversations, calling, messages, etc.). Connected components live in `ts/state/smart/`.

### Database

SQLite via `@signalapp/sqlcipher` with encrypted storage. The `ts/sql/` directory contains:
- `Client.preload.ts` - Renderer-side database client
- `Server.node.ts` - Main process database server
- `migrations/` - Database schema migrations

### Protocol & Messaging

The `ts/textsecure/` directory implements the Signal protocol:
- `WebAPI.preload.ts` - HTTP API client
- `MessageReceiver.preload.ts` - Incoming message processing
- `SendMessage.preload.ts` - Outgoing message handling
- `SocketManager.preload.ts` - WebSocket connection management

## Localization

Strings are in `_locales/en/messages.json`. Never hardcode user-visible strings - always use the i18n system. Only modify the English locale; other languages are translated separately.

## Testing

- Unit tests: `ts/test-node/` (Node environment), `ts/test-electron/` (Electron environment)
- Integration tests: `ts/test-mock/` (uses `@signalapp/mock-server`)
- Storybook: `*.stories.tsx` files alongside components

Run a single test file:
```bash
pnpm run test-node -- --grep "pattern"
```

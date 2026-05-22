# Development

This guide is for contributors who want to understand SocketLens quickly and make a focused change.

## 15-Minute Setup

Prerequisites:

- Node.js `20.19.0+` on the 20.x line, or `22.12.0+`
- npm `10+`
- Rust `1.77.2+` and Cargo only for desktop/Tauri or Proxy Mode work

Install dependencies:

```bash
npm install
```

Start the app:

```bash
npm run dev
```

Start the local WebSocket server in another terminal:

```bash
npm run dev:echo
```

Expected result: the app runs at `http://127.0.0.1:1420`, and Direct Mode can connect to `ws://127.0.0.1:17787`.

## Repository Scripts

Run from the repository root.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start browser/Vite mode at `http://127.0.0.1:1420`. |
| `npm run dev:desktop` | Start the native Tauri app. |
| `npm run dev:echo` | Start the WebSocket echo server. |
| `npm run dev:chat` | Start the browser chat demo. |
| `npm run dev:landing` | Start the landing page. |
| `npm run lint` | Run repository hygiene checks. |
| `npm run typecheck` | Typecheck all workspaces. |
| `npm run test` | Run unit tests. |
| `npm run build` | Build all buildable workspaces. |
| `npm run check` | Run clean, encoding check, lint, typecheck, tests, build, then clean. |
| `npm run clean` | Remove generated build output. |
| `npm run release:prepare` | Validate release metadata. |
| `npm run release:build` | Validate release metadata and build the desktop bundle. |

Do not document a command unless it exists in `package.json` or a workspace `package.json`.

## Where To Start

| Area | Start here |
| --- | --- |
| App shell, panels, timeline, inspector | `apps/desktop/src/components` |
| Shared UI primitives | `apps/desktop/src/components/ui` |
| Domain types and pure helpers | `apps/desktop/src/models` |
| Zustand stores | `apps/desktop/src/store` |
| Direct WebSocket lifecycle | `apps/desktop/src/store/connection-store.ts` |
| Packet batching and retention | `apps/desktop/src/store/packet-store.ts` |
| Session state | `apps/desktop/src/store/session-store.ts` |
| UI state, filters, logs, replay state | `apps/desktop/src/store/ui-store.ts` |
| Settings state and persistence | `apps/desktop/src/store/settings-store.ts` |
| Demo traffic | `apps/desktop/src/demo` |
| Tauri wrappers | `apps/desktop/src/lib/tauri-commands.ts` |
| Rust backend | `apps/desktop/src-tauri/src` |
| Echo server | `examples/echo-server/src/server.ts` |

For the full map, see [project-structure.md](project-structure.md).

## Architecture In One Minute

SocketLens has three capture paths:

- **Demo Mode** creates simulated packets in the frontend for onboarding and demos.
- **Direct Mode** uses the WebView/browser `WebSocket` API; SocketLens owns the connection.
- **Proxy Mode** uses the Rust/Tauri backend; another client connects through a local SocketLens proxy.

All paths produce the same typed `Packet` records. Timeline, search, inspector, session files, and replay should not care whether a packet came from Demo, Direct, or Proxy Mode.

## Packet Flow

Direct Mode:

1. `connection-store.ts` validates a `ws://` or `wss://` URL.
2. The frontend opens a `WebSocket`.
3. `session-store.ts` creates or updates the active session.
4. Sent and received frames become typed packets.
5. `packet-store.ts` batches packets and enforces retention.
6. `ui-store.ts` owns selection, filters, logs, toasts, and replay UI state.

Proxy Mode:

1. React calls safe wrappers in `tauri-commands.ts`.
2. Rust commands in `commands.rs` start or stop the proxy.
3. `proxy.rs` forwards frames between client and target.
4. Rust emits packet/log/session events.
5. `proxy-events.ts` maps those events into the same frontend stores.

Demo Mode:

1. `demo-stream.ts` or `investor-demo.ts` creates simulated packets.
2. Demo packets are explicitly marked as demo traffic.
3. They enter the same packet/session stores as real captures.

## Frontend Responsibilities

The frontend owns:

- desktop-style layout and user interactions,
- Direct Mode WebSocket lifecycle,
- demo traffic,
- packet timeline, filtering, search, inspector, replay, logs, and toasts,
- settings and browser-mode fallbacks,
- safe wrappers around native Tauri commands.

Keep React components focused on UI. Shared parsing, validation, formatting, and packet inspection should live in `models` or `lib` so tests can cover them.

## Backend Responsibilities

The Rust/Tauri backend owns:

- typed native command surface,
- local WebSocket proxy lifecycle,
- proxy session registry,
- proxy packet/log events,
- native desktop integration.

Rust modules:

- `commands.rs`: Tauri commands.
- `proxy.rs`: async WebSocket proxy runtime.
- `session.rs`: native proxy session registry.
- `app_state.rs`: shared backend state.
- `errors.rs`: user-safe command errors.

Frontend components should not call Tauri `invoke` directly. Use `apps/desktop/src/lib/tauri-commands.ts` so browser mode can fail gracefully.

## Localization

SocketLens uses `i18next` and `react-i18next` for UI-only localization.

Files:

```text
apps/desktop/src/i18n/index.ts
apps/desktop/src/i18n/locales/ru.json
apps/desktop/src/i18n/locales/en.json
```

Russian is the default language. English is the fallback. Language preference is stored in settings and updates without reload.

Example keys:

```json
{
  "actions.connect": "Подключиться",
  "sidebar.sessions": "Сессии",
  "settings.language.title": "Язык",
  "packets.empty.title": "Пакетов пока нет"
}
```

Translate:

- buttons,
- labels,
- menus,
- tooltips,
- settings UI,
- empty states,
- validation messages,
- static app help text.

Do not translate:

- WebSocket packet payloads,
- raw JSON,
- raw messages,
- URLs,
- user-entered values,
- captured traffic logs,
- imported/exported session files.

To add a language:

1. Add a locale JSON file in `apps/desktop/src/i18n/locales`.
2. Import it in `apps/desktop/src/i18n/index.ts`.
3. Add the language to `supportedLanguages`.
4. Add an `Intl` locale mapping in `localeByLanguage`.
5. Extend `AppLanguage` and `normalizeLanguage` in `apps/desktop/src/models/app-settings.ts`.
6. Run `npm run typecheck` and `npm run build`.

## How To Run Tests

All tests:

```bash
npm run test
```

Desktop workspace tests only:

```bash
npm run test --workspace @socketlens/desktop
```

Full validation:

```bash
npm run check
```

Current tests are deterministic and avoid real network calls. Use the echo server and [manual-qa.md](manual-qa.md) for live WebSocket behavior.

## Debugging Proxy Mode

Proxy Mode requires the native app.

```bash
npm run dev:echo
npm run dev:desktop
```

Then in SocketLens:

1. Switch capture mode to Proxy.
2. Set target URL to `ws://127.0.0.1:17787`.
3. Start the proxy.
4. Connect an external WebSocket client to the local proxy URL shown in the app.

If it fails:

- confirm you are not in browser-only mode,
- confirm Rust/Cargo and Tauri prerequisites are installed,
- confirm the echo server is still running,
- check the bottom logs panel,
- run `cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml` on a machine with Cargo.

## Contribution Rules

- Prefer existing patterns over new abstractions.
- Keep demo-only behavior in `src/demo` or `src/dev`.
- Update docs when commands, setup, mode behavior, privacy, AI, sessions, or release flow changes.
- Add or update tests when shared logic changes.
- Keep alpha limitations honest.
- Run `npm run check` before opening a pull request.

Good first issues:

- improve a confusing error message,
- add a focused test for packet parsing/filtering/settings/session files,
- improve a docs page with exact expected results,
- polish a small UI alignment issue,
- add a missing translation key for existing UI text.

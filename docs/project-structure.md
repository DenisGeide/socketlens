# Project Structure

This page is a short map of where things live in SocketLens.

## Root

```text
package.json
package-lock.json
README.md
launchers/
scripts/
apps/
examples/
docs/
.github/
```

- `package.json`: npm workspaces and root scripts.
- `package-lock.json`: committed npm lockfile.
- `launchers/`: branded one-click launchers and optional Windows shortcut generation.
- `scripts/`: repository hygiene and release helper scripts.

## launchers

Optional convenience entry points:

- `launchers/install-windows.bat` / `launchers/install-unix.sh`: install npm dependencies.
- `launchers/start-web.bat` / `launchers/start-web.sh`: launch browser/Vite mode with `npm run dev`.
- `launchers/start-desktop.bat` / `launchers/start-desktop.sh`: launch Tauri desktop mode with `npm run dev:desktop`.
- `launchers/start-echo-server.bat` / `launchers/start-echo-server.sh`: launch the echo server with `npm run dev:echo`.
- `launchers/generate-shortcuts.bat`: create Windows desktop shortcuts with the SocketLens icon.

## apps/desktop

The main SocketLens application.

```text
apps/desktop/
  src/
  src-tauri/
  public/
  package.json
```

### Frontend

```text
apps/desktop/src/
  components/
  config/
  demo/
  dev/
  extensions/
  i18n/
  lib/
  models/
  store/
```

- `components/`: app shell, sidebar, top bar, timeline, inspector, settings, onboarding, logs, replay, proxy, AI, and session panels.
- `components/ui/`: small reusable UI primitives.
- `config/`: shared defaults such as local URLs and commands.
- `demo/`: simulated demo and investor-demo packet streams.
- `dev/`: developer/demo helpers.
- `extensions/`: contributor-facing contracts for packet decoders, analyzers, filters, exporters, AI providers, and replay strategies.
- `i18n/`: UI localization setup and locale JSON files.
- `lib/`: shared runtime helpers, Tauri wrappers, AI providers, proxy event mapping, formatting, session storage, user-facing errors, and validation.
- `models/`: typed domain models and pure helpers for connections, packets, sessions, filters, settings, replay history, and session files.
- `store/`: Zustand stores for connections, packets, sessions, UI state, and settings.

### Tauri/Rust Backend

```text
apps/desktop/src-tauri/src/
  app_state.rs
  commands.rs
  errors.rs
  lib.rs
  main.rs
  proxy.rs
  session.rs
```

- `commands.rs`: typed Tauri command surface.
- `proxy.rs`: local WebSocket proxy runtime.
- `session.rs`: native proxy session registry.
- `app_state.rs`: shared backend state.
- `errors.rs`: user-safe backend errors.
- `lib.rs` and `main.rs`: Tauri application entry points.

## apps/landing

React/Vite landing page package. It runs separately from the desktop app:

```bash
npm run dev:landing
```

## examples/echo-server

Node.js TypeScript WebSocket echo server used for real local testing.

```bash
npm run dev:echo
```

Default endpoint:

```text
ws://127.0.0.1:17787
```

Main file:

```text
examples/echo-server/src/server.ts
```

## examples/chat-demo

Small browser chat demo for local realtime experiments:

```bash
npm run dev:chat
```

## docs

Main contributor and user docs:

- `getting-started.md`: install and first run.
- `project-structure.md`: this map.
- `development.md`: contributor workflow.
- `contributor-guide.md`: where to start when adding focused extensions.
- `extension-points.md`: supported source-level extension contracts.
- `asyncapi-export.md`: experimental inferred AsyncAPI-like YAML draft export.
- `manual-qa.md`: release and feature QA checklist.
- `troubleshooting.md`: common failures and fixes.
- `release.md`: release process.
- `screenshots.md`: how to capture public screenshots.
- `ui-guide.md`: what each visible app panel does and which screenshots explain it.

## docs/assets

Public release assets:

```text
docs/assets/
  branding/
  screenshots/
  release/
  demo/
```

- `branding/`: logo, logo mark, dark logo, banner.
- `screenshots/`: README screenshot placeholders.
- `release/`: release icon and thumbnail placeholders.
- `demo/`: demo recording assets when added.

## Where WebSocket Logic Lives

Direct Mode:

- `apps/desktop/src/store/connection-store.ts`
- `apps/desktop/src/models/connection.ts`
- `apps/desktop/src/models/packet.ts`

Proxy Mode frontend:

- `apps/desktop/src/components/proxy-mode-panel.tsx`
- `apps/desktop/src/lib/tauri-commands.ts`
- `apps/desktop/src/lib/proxy-events.ts`

Proxy Mode backend:

- `apps/desktop/src-tauri/src/proxy.rs`
- `apps/desktop/src-tauri/src/commands.rs`
- `apps/desktop/src-tauri/src/session.rs`
- `apps/desktop/src-tauri/src/app_state.rs`

Demo Mode:

- `apps/desktop/src/demo/demo-stream.ts`
- `apps/desktop/src/demo/investor-demo.ts`

## Where Settings Live

- UI: `apps/desktop/src/components/settings-page.tsx`
- Store: `apps/desktop/src/store/settings-store.ts`
- Model: `apps/desktop/src/models/app-settings.ts`
- Persistence: `apps/desktop/src/lib/settings-persistence.ts`
- Localization: `apps/desktop/src/i18n`

## Where AI Logic Lives

- UI: `apps/desktop/src/components/ai-analysis-panel.tsx`
- Provider interfaces: `apps/desktop/src/lib/ai`
- Providers: `apps/desktop/src/lib/ai/providers`
- Settings: `apps/desktop/src/components/settings-page.tsx`

AI is optional and disabled by default.

## Where Session Files Live

- UI: `apps/desktop/src/components/session-persistence-panel.tsx`
- AsyncAPI draft helper: `apps/desktop/src/lib/asyncapi-export.ts`
- Session file schema: `apps/desktop/src/models/session-file.ts`
- Storage helpers: `apps/desktop/src/lib/session-file-storage.ts`
- Session store: `apps/desktop/src/store/session-store.ts`

## GitHub Metadata

```text
.github/
  workflows/
  ISSUE_TEMPLATE/
  PULL_REQUEST_TEMPLATE.md
  RELEASE_TEMPLATE.md
  labels.yml
```

- `workflows/ci.yml`: install, lint, typecheck, tests, build, Rust check.
- `workflows/release.yml`: release validation and Tauri platform builds.
- issue and PR templates: contributor intake.

## Rule Of Thumb

- UI belongs in `components`.
- Shared logic belongs in `models` or `lib`.
- Persistent app state belongs in `store`.
- Native-only behavior belongs in `src-tauri`.
- Simulated traffic belongs in `demo`.
- Documentation belongs in `docs`.

# GitHub Launch Guide

This guide is for maintainers and first-time contributors evaluating SocketLens as a public open-source alpha.

SocketLens should feel alive, practical, and honest: useful today for local WebSocket debugging, clear about alpha limitations, and easy to contribute to without guessing where to start.

## Current Priorities

The project is focused on making the existing debugger workflow reliable before expanding scope.

- First-run onboarding and demo clarity.
- Direct Mode reliability with local and real WebSocket servers.
- Proxy Mode stability in the native Tauri desktop app.
- Replay, session save/load, filters, and payload inspector polish.
- Friendly error states and diagnostics.
- Manual QA and focused automated tests.
- Release assets, screenshots, and unsigned desktop artifact validation.
- Privacy/security review for packet data, AI actions, local files, and logs.

## Final Public Launch Checklist

Use this list before making the repository public or announcing a new alpha build.

- README explains what SocketLens is, what works today, and what is still alpha.
- Quick Start starts with `npm install` and `npm run dev`.
- One-click launch files exist under `launchers/` for Windows and macOS/Linux.
- Optional Windows shortcut generation exists at `launchers/generate-shortcuts.bat`.
- Echo server is documented with `npm run dev:echo` and `ws://127.0.0.1:17787`.
- Desktop/Tauri prerequisites are documented before Proxy Mode or desktop builds.
- Screenshot placeholders exist and point to real files under `docs/assets/screenshots`.
- Branding placeholders exist under `docs/assets/branding`.
- License references consistently say `AGPL-3.0-only`.
- AI is described as optional and disabled by default.
- Privacy docs explain local-first behavior and no telemetry by default.
- Troubleshooting covers install, port conflicts, echo server, proxy, Tauri backend, invalid JSON, and Ollama.
- Manual QA covers Demo, Direct, Proxy, replay, sessions, filters, i18n, settings, AI disabled state, and errors.
- `npm run check` passes.
- `npm run release:prepare` passes.
- `cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml` passes on a machine with Cargo before desktop artifacts are published.
- No secrets, private URLs, customer payloads, production captures, or misleading demo claims are committed.

## Good First Issues

Good first issues should be small, testable, and tied to behavior that exists today.

Recommended issue examples:

- Improve one unclear empty state in the packet timeline, inspector, settings, or sidebar.
- Add one focused unit test for packet parsing, filtering, settings persistence, or session validation.
- Reproduce Direct Mode with a local WebSocket service and improve the docs if a step is confusing.
- Add missing Russian/English translation keys for existing UI text.
- Improve an error message with a concrete recovery suggestion.
- Capture a real screenshot following `docs/assets/screenshots/README.md`.
- Run `docs/manual-qa.md` on Windows, macOS, or Linux and report only reproducible gaps.
- Verify Proxy Mode in `npm run dev:desktop` and document OS-specific failures.

Avoid using good-first labels for architecture rewrites, cloud features, accounts, telemetry, billing, or broad proxy redesigns.

## Known Limitations

These are expected alpha limitations, not hidden promises:

- Desktop artifacts are unsigned until signing is configured.
- Browser development mode cannot run native proxy listeners or native file dialogs.
- Proxy Mode is a native MVP for local debugging, not a full enterprise proxy.
- Native checks require Rust, Cargo, and Tauri platform prerequisites.
- `Cargo.lock` must be generated from a Cargo-enabled machine before public native artifacts.
- Final captured screenshots and demo recordings still need release validation.
- AI is optional, disabled by default, provider-dependent, and not required for the debugger.
- API keys are stored locally, not in an OS keychain yet.
- Session exports are local JSON and are not automatically redacted.
- There is no telemetry, hosted sync, account system, cloud workspace, or paid service.

## How To Test

Use this minimum path for issue triage and pull request review:

```bash
npm install
npm run dev
```

Expected result: SocketLens opens at `http://127.0.0.1:1420/`.

Then test the local echo server:

```bash
npm run dev:echo
```

Expected result: the server listens on `ws://127.0.0.1:17787`.

In SocketLens:

1. Start Investor Demo Mode.
2. Select a packet and inspect Pretty, Raw, and Metadata.
3. Connect Direct Mode to `ws://127.0.0.1:17787`.
4. Send `{ "command": "ping" }`.
5. Replay the outgoing ping.

For code changes, run:

```bash
npm run check
```

For native backend or Proxy Mode changes, also run on a machine with Rust and Cargo:

```bash
cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml
npm run dev:desktop
```

For release candidates, follow [release.md](release.md) and [manual-qa.md](manual-qa.md).

## How To Report Bugs

Use the bug report template and include:

- OS and version.
- SocketLens commit or release version.
- Running mode: `npm run dev`, `npm run dev:desktop`, or downloaded artifact.
- Node/npm versions, and Rust/Cargo versions if desktop/proxy is involved.
- Capture mode: Demo, Direct, Proxy, replay, sessions, settings, AI, or docs.
- Exact reproduction steps.
- Expected result and actual result.
- Logs, diagnostics, screenshots, or recordings with secrets removed.

Before filing:

- Check [README.md](../README.md), [troubleshooting.md](troubleshooting.md), and [manual-qa.md](manual-qa.md).
- Try the local echo server first if the issue is connection-related.
- Remove tokens, private URLs, customer payloads, personal data, and production captures.
- Mention if the issue only happens in browser mode or only in native desktop mode.

## Label Recommendations

Use labels to keep triage boring and useful.

The canonical label recommendation file is [../.github/labels.yml](../.github/labels.yml). GitHub does not apply that file automatically; maintainers can import it with a label-sync tool or create the labels manually.

Type labels:

- `type: bug`
- `type: enhancement`
- `type: documentation`
- `type: test`
- `type: maintenance`
- `type: security`

Area labels:

- `area: onboarding`
- `area: demo`
- `area: direct-mode`
- `area: proxy-mode`
- `area: replay`
- `area: timeline`
- `area: inspector`
- `area: sessions`
- `area: settings`
- `area: i18n`
- `area: ai`
- `area: rust`
- `area: docs`
- `area: release`

Status labels:

- `status: needs-triage`
- `status: needs-repro`
- `status: blocked`
- `status: accepted`
- `status: help-wanted`

Difficulty labels:

- `good first issue`
- `difficulty: small`
- `difficulty: medium`
- `difficulty: large`

Priority labels:

- `priority: release-blocker`
- `priority: high`
- `priority: normal`
- `priority: low`

Do not use labels to imply paid support, enterprise readiness, or production stability.

## Release Process

The release process is source-first until downloadable artifacts are validated.

1. Confirm README, changelog, release notes, privacy/security docs, and manual QA are current.
2. Run:

   ```bash
   npm ci
   npm run check
   npm run release:prepare
   ```

3. On a Rust/Cargo machine, run:

   ```bash
   cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml
   cargo generate-lockfile --manifest-path apps/desktop/src-tauri/Cargo.toml
   npm run release:build
   ```

4. Validate Demo, Direct, replay, sessions, settings persistence, i18n, AI disabled state, and Proxy Mode if native artifacts are included.
5. Attach only artifacts produced by passing workflows.
6. Keep unsigned artifact warnings visible until signing is configured.
7. Use `docs/assets/release/release-notes-template.md` for GitHub Release text.

## What Not To Do Yet

Do not prioritize these until the local alpha is stable:

- Accounts or team workspaces.
- Cloud sync.
- Telemetry or product analytics.
- Billing or pricing pages.
- Enterprise proxy features.
- Plugin marketplace.
- AI-required workflows.
- Claims of production or commercial readiness.

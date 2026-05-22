# Contributing

Thanks for helping build SocketLens.

SocketLens is an alpha-stage open-source desktop developer tool. Contributions are welcome, especially when they make the app easier to install, safer to run, clearer to document, or more reliable for real WebSocket debugging workflows.

`v0.1.0-alpha` is in release-freeze mode. Before the alpha tag, please focus on release blockers, bug fixes, onboarding clarity, docs corrections, privacy/security wording, CI/release fixes, and small UI clarity improvements. See [docs/v0.1.0-alpha-freeze.md](docs/v0.1.0-alpha-freeze.md).

## License For Contributions

SocketLens is licensed under the GNU Affero General Public License v3.0 only (`AGPL-3.0-only`).

By contributing to this repository, you agree that your contribution is provided under `AGPL-3.0-only`. Please keep this simple rule in mind before submitting code, docs, images, examples, or other assets.

Do not contribute material that you do not have the right to license under AGPL-compatible terms. If your pull request includes third-party material, call it out clearly in the PR.

## Current Priorities

The most valuable work right now is practical and easy to verify:

- onboarding and first-run clarity,
- Direct Mode reliability,
- Proxy Mode stability in the native desktop app,
- session file safety and import/export validation,
- clear error handling and diagnostics,
- realistic docs, screenshots, and release notes,
- focused tests for existing behavior.

Cloud sync, accounts, telemetry, billing, and broad enterprise proxy features are intentionally out of scope until the local debugger workflow is more stable.

## Local setup

1. Install Node.js `20.19.0` or newer on the 20.x line, or Node.js `22.12.0` and newer. Use npm `10.0.0` or newer. Install Rust `1.77.2` or newer and the Tauri prerequisites only when testing the native desktop app, Proxy Mode, native file dialogs, or desktop builds.
2. Run `npm install`.
3. Run `npm run check` before opening a pull request.

Useful development commands:

```bash
npm run dev
npm run dev:desktop
npm run dev:echo
npm run typecheck
npm run test
npm run build
npm run check
```

For a more detailed contributor map, see [docs/development.md](docs/development.md).

## Where To Start

- UI panels and first-run experience: `apps/desktop/src/components`
- Packet parsing, filtering, search, and session files: `apps/desktop/src/models` and `apps/desktop/src/lib`
- Direct WebSocket lifecycle: `apps/desktop/src/store/connection-store.ts`
- Demo traffic: `apps/desktop/src/demo`
- Proxy Mode backend: `apps/desktop/src-tauri/src`
- Echo-server testing: `examples/echo-server`
- Documentation and manual QA: `docs`

## Good First Issues

Good first issues are usually small and easy to verify:

- improve one confusing empty state or error message,
- add a focused test for packet filtering or session validation,
- tighten getting-started or troubleshooting docs,
- add missing translations for existing UI,
- improve demo/Direct Mode manual QA steps,
- polish a small visual inconsistency without changing behavior.

Avoid starting with large rewrites, cloud features, account systems, telemetry, or proxy architecture changes unless there is an agreed issue.

## How To Test

Minimum local path:

```bash
npm install
npm run dev
npm run dev:echo
```

Expected result: SocketLens runs at `http://127.0.0.1:1420/`, Investor Demo Mode can start, and Direct Mode can connect to `ws://127.0.0.1:17787`.

Before opening a pull request:

```bash
npm run check
```

If your change touches the Rust/Tauri backend, Proxy Mode, native file dialogs, or desktop packaging, also run this on a machine with Rust and Cargo installed:

```bash
cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml
npm run dev:desktop
```

For a step-by-step release-style pass, use [docs/manual-qa.md](docs/manual-qa.md).

## How To Report Bugs

Use the GitHub bug report template and include:

- OS and version,
- SocketLens version or commit,
- running mode: `npm run dev`, `npm run dev:desktop`, or downloaded artifact,
- capture mode: Demo, Direct, Proxy, replay, sessions, settings, AI, or docs,
- exact reproduction steps,
- expected result and actual result,
- logs, diagnostics, screenshots, or recordings with secrets removed.

Please do not post real API keys, tokens, private endpoint URLs, customer payloads, personal data, or production captures. Security issues should follow [SECURITY.md](SECURITY.md).

## Labels

Maintainer label recommendations live in [.github/labels.yml](.github/labels.yml). Use labels to keep triage simple:

- `type:*` for the kind of work,
- `area:*` for the affected product area,
- `status:*` for triage state,
- `priority:*` for urgency,
- `good first issue` and `difficulty:*` for contributor fit.

The public launch maintainer guide is [docs/github-launch.md](docs/github-launch.md).

## Contribution flow

1. Choose a focused change. Good alpha contributions make SocketLens easier to install, clearer to understand, safer with packet data, or more reliable in Demo, Direct, Proxy, replay, session, settings, or documentation workflows.
2. Open or comment on an issue when the scope is unclear.
3. Create a branch and keep the patch small enough to review.
4. Run the narrow workflow while developing:

   ```bash
   npm run dev
   ```

5. Use the local echo server for real Direct Mode testing:

   ```bash
   npm run dev:echo
   ```

6. Use the native app for Proxy Mode or native file-dialog testing:

   ```bash
   npm run dev:desktop
   ```

7. Update docs when commands, setup, privacy behavior, capture modes, settings, session files, or release behavior change.
8. Run validation before opening a pull request:

   ```bash
   npm run check
   ```

If your change touches the Rust/Tauri backend, also run:

```bash
cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml
```

## Development expectations

- Keep changes focused and runnable.
- Do not add placeholder-only product features.
- Update documentation when behavior or commands change.
- Keep the first-run developer experience simple.
- Avoid dead code and unused dependencies.
- Keep packet data, URLs, user-entered values, and imported session contents local unless the user explicitly triggers an action that documents what will be sent.
- Keep demo behavior clearly labeled as demo behavior.

## Pull Requests

Please include:

- What changed
- How it was tested
- Screenshots or screen recordings for UI changes
- Any known limitations

Before opening a pull request, verify:

```bash
npm run check
```

If your change touches the native Tauri backend or proxy mode, also run this on a machine with Rust and Cargo installed:

```bash
cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml
npm run dev:desktop
```

## Documentation

Update README or the relevant file in `docs/` whenever commands, setup steps, privacy behavior, release behavior, session formats, or user-visible workflows change.

## Security

Do not commit real packet captures, API keys, tokens, customer data, or private endpoint URLs. If you find a vulnerability, follow [SECURITY.md](SECURITY.md) instead of opening a public issue.

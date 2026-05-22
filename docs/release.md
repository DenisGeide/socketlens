# Release Guide

SocketLens is `v0.1.0-alpha`. Releases should prioritize stability, reproducible setup, honest limitations, and real screenshots from implemented behavior.

## Version Files

Keep these synchronized:

- `package.json`
- `apps/desktop/package.json`
- `apps/desktop/src-tauri/Cargo.toml`
- `apps/desktop/src-tauri/tauri.conf.json`

Validate metadata:

```bash
npm run release:prepare
```

## Local Release Checks

Run:

```bash
npm ci
npm run check
npm run release:prepare
```

On a machine with Rust/Cargo:

```bash
cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml
npm run release:build
```

Expected result: repository checks pass, release metadata is valid, and Tauri build artifacts are created under:

```text
apps/desktop/src-tauri/target/release/bundle
```

## Alpha Release Checklist

- README says the project is `v0.1.0-alpha`.
- README explains Demo, Direct, Proxy, Echo Server, AI, Privacy, and License.
- README links to screenshots and screenshot instructions.
- `CHANGELOG.md` has the release entry.
- `docs/releases/v0.1.0-alpha.md` exists.
- `docs/manual-qa.md` has been run or skipped items are documented.
- CI passes.
- Release workflow passes before artifacts are attached.
- Desktop artifacts are clearly marked unsigned.
- Proxy Mode is documented as desktop/Tauri-only.
- AI is documented as optional and disabled by default.
- No secrets, private URLs, customer payloads, or production captures are committed.

## GitHub Release Workflow

`.github/workflows/release.yml` runs on manual dispatch and `v*` tags.

It checks:

- dependency install with `npm ci`,
- release metadata with `npm run release:prepare`,
- lint,
- typecheck,
- tests,
- frontend build,
- Rust `cargo check`,
- Tauri builds on Windows, macOS, and Linux.

Required secrets for unsigned artifacts: none.

Future signed releases may need platform signing secrets.

## Downloadable Releases

When builds are published, they should appear on GitHub Releases:

```text
https://github.com/DenisGeide/socketlens/releases
```

Expected artifact types:

- Windows: `.msi` or `.exe`
- macOS: `.dmg` or `.app`
- Linux: `.AppImage`, `.deb`, or `.rpm`

Current alpha builds are unsigned until signing is configured.

## Platform Notes

Windows:

- Node.js `20.19.0+` or `22.12.0+`
- npm `10+`
- Rust/Cargo with MSVC toolchain
- Microsoft C++ Build Tools
- WebView2

macOS:

- Node.js and npm
- Rust/Cargo
- Xcode Command Line Tools

Linux:

- Node.js and npm
- Rust/Cargo
- WebKitGTK 4.1 and Tauri build packages

Ubuntu/Debian native prerequisites:

```bash
sudo apt update
sudo apt install -y \
  libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libxdo-dev \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  patchelf
```

## Assets

Branding:

- `docs/assets/branding/icon.png`
- `docs/assets/branding/banner.png`

Screenshots:

- `docs/assets/screenshots/main-ui.png`
- `docs/assets/screenshots/demo-mode.png`
- `docs/assets/screenshots/direct-mode.png`
- `docs/assets/screenshots/packet-inspector.png`
- `docs/assets/screenshots/settings.png`
- `docs/assets/screenshots/proxy-mode.png`
- `docs/assets/screenshots/launcher-terminal.png`
- `docs/assets/screenshots/launcher-shortcuts.png`

Release assets:

- `docs/assets/release/release-notes-template.md`
- `.github/RELEASE_TEMPLATE.md`

Screenshot process: [screenshots.md](screenshots.md).

Native installer icons live in `apps/desktop/src-tauri/icons`. Regenerate them from the final brand mark before a stable signed release.

## Tagging

Example:

```bash
git tag v0.1.0-alpha
git push origin v0.1.0-alpha
```

Do not attach artifacts if any platform build fails.

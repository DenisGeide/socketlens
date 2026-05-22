# Changelog

All notable changes to SocketLens will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows semantic versioning after the first stable release.

## [0.1.0-alpha] - 2026-05-22

This is the first alpha release candidate for public GitHub launch. SocketLens is usable for local demo workflows, direct WebSocket debugging, session files, and native proxy testing, but it is not yet a stable `1.0` release.

### Added

- Initial monorepo structure.
- Tauri, React, TypeScript, Vite, TailwindCSS, and Zustand desktop app.
- Local WebSocket echo server example.
- Browser chat demo example.
- Project documentation and community files.
- Investor Demo Mode with guided offline realtime traffic.
- Direct WebSocket mode with manual send and packet replay.
- Native Rust proxy MVP for forwarding and capturing WebSocket traffic.
- Session save/load and packet import/export support.
- Optional AI analysis architecture with explicit user-triggered packet explanations.
- Russian default UI with English fallback and persisted language switching.
- Unit tests for packet filtering, search, parsing, URL validation, session serialization, and settings helpers.
- GitHub CI, release workflow, issue templates, pull request template, and release notes template.
- Security model, privacy guidance, troubleshooting, FAQ, and contributor documentation.
- Release preparation script, release notes template, Tauri bundle metadata, and placeholder app icons.
- React/Vite landing page workspace for SocketLens product marketing.

### Changed

- Relicensed SocketLens from MIT to GNU AGPL v3 only (`AGPL-3.0-only`).
- Polished public launch documentation, alpha status messaging, roadmap, and release guidance.
- Added `v0.1.0-alpha` freeze guidance and alpha readiness criteria.
- Aligned package, Tauri, and Cargo versions for `0.1.0-alpha`.

### Known Limitations

- Native desktop and proxy workflows require Rust, Cargo, and platform-specific Tauri prerequisites.
- Release artifacts are unsigned until project signing is configured.
- Proxy mode is an MVP focused on local development workflows.
- App icons are placeholders and should be replaced before a stable public release.
- AI analysis is optional, disabled by default, and depends on user-configured OpenAI-compatible or Ollama providers.

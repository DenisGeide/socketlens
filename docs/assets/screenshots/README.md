# Screenshot Guide

Store final captured screenshots here.

The current folder contains real captured alpha screenshots, not generated placeholder spam. Replace images only with newer captures from implemented app states.

The README expects these root-level screenshot files:

- `main-ui.png`
- `demo-mode.png`
- `direct-mode.png`
- `packet-inspector.png`
- `settings.png`
- `proxy-mode.png`
- `launcher-terminal.png`
- `launcher-shortcuts.png`

Replace them only with real screenshots captured from implemented SocketLens behavior. Do not edit fake packets, fake production data, or fake AI results into screenshots.

For the explanation of what each interface area shows, see `docs/ui-guide.md`.

## Naming Convention

```text
socketlens-v<version>-<sequence>-<area>-<state>-<theme>-<viewport>-<locale>.png
```

Recommended sequence:

```text
01-onboarding-first-run
02-investor-demo-active
03-packet-timeline-selected
04-payload-inspector-pretty
05-direct-echo-connected
06-manual-send-replay
07-proxy-native-running
08-settings-privacy-ai
09-launcher-terminal
10-windows-shortcuts
```

Optional detailed docs screenshots can use direct names when they explain a specific panel:

```text
memory-panel.png
diagnostics.png
logs-panel.png
manual-send-replay.png
session-files.png
packet-inspector-raw.png
packet-inspector-metadata.png
```

Examples:

```text
socketlens-v1.0.0-alpha-01-onboarding-first-run-dark-1440x900-ru.png
socketlens-v1.0.0-alpha-05-direct-echo-connected-dark-1440x900-en.png
```

## Capture Sizes

- Primary README screenshot: `1440x900`
- GitHub release screenshot: `1280x720`
- GIF / short-video source: `1920x1080`
- Detailed documentation screenshot: `1600x1000`
- QA/responsive screenshot: `390x844`

## Quality Rules

- Capture real UI from `npm run dev` or `npm run dev:desktop`.
- Follow `docs/demo-states.md` for the exact UI state each public screenshot should prove.
- Do not edit fake packets into screenshots.
- Do not show personal browser chrome, bookmarks, usernames, or local paths.
- Use Demo Mode or the local echo server unless a real target is intentionally documented.
- Keep packet payloads synthetic or local-only.
- Use Russian and English screenshots when localization changes are being shown.

# SocketLens Release Assets

This folder keeps public-facing assets for GitHub, release pages, screenshots, and investor demos.

## Structure

```text
docs/assets/
  branding/      app icon, wordmark, and social/banner artwork
  screenshots/   screenshot naming rules and captured product screenshots
  release/       release thumbnails and release-note templates
  demo/          demo recording guidelines and exported clips
```

## Current Assets

- [branding/logo.svg](branding/logo.svg)
- [branding/logo-dark.svg](branding/logo-dark.svg)
- [branding/logo-mark.svg](branding/logo-mark.svg)
- [branding/icon.png](branding/icon.png)
- [branding/icon.ico](branding/icon.ico)
- [branding/banner.png](branding/banner.png)
- [branding/socketlens-app-icon.svg](branding/socketlens-app-icon.svg)
- [branding/socketlens-wordmark.svg](branding/socketlens-wordmark.svg)
- [branding/socketlens-banner.svg](branding/socketlens-banner.svg)
- [release/icon.png](release/icon.png)
- [release/thumbnail.png](release/thumbnail.png)
- [release/socketlens-release-thumbnail.svg](release/socketlens-release-thumbnail.svg)
- [release/release-notes-template.md](release/release-notes-template.md)
- [screenshots/launcher-terminal.png](screenshots/launcher-terminal.png)
- [screenshots/launcher-shortcuts.png](screenshots/launcher-shortcuts.png)

## Visual Direction

- Dark developer-tool aesthetic.
- Calm graphite backgrounds with cyan and green signal accents.
- Product screenshots should show real implemented UI states only.
- Demo traffic must be clearly marked as simulated.
- Do not include production URLs, customer payloads, API keys, or personal data.

## Screenshot Naming

Use this pattern:

```text
socketlens-v<version>-<sequence>-<area>-<state>-<theme>-<viewport>-<locale>.<ext>
```

Examples:

```text
socketlens-v0.1.0-alpha-01-onboarding-first-run-dark-1440x900-ru.png
socketlens-v0.1.0-alpha-02-investor-demo-active-dark-1440x900-en.png
socketlens-v0.1.0-alpha-03-direct-echo-connected-dark-1440x900-ru.png
socketlens-v0.1.0-alpha-04-proxy-native-running-dark-1440x900-en.png
```

## Recommended Window Sizes

| Use case | Size | Notes |
| --- | --- | --- |
| README screenshots | `1440x900` | Best default for GitHub readability. |
| GitHub release images | `1280x720` | Matches release thumbnail aspect ratio. |
| Investor demos | `1920x1080` | Use when recording a clean full-screen walkthrough. |
| Mobile/responsive check | `390x844` | Use for layout QA, not primary marketing screenshots. |

## Capture Checklist

Before capturing screenshots or video:

1. Run `npm run dev`.
2. Use a clean profile or reset local app state.
3. Keep the UI in dark theme unless documenting light mode.
4. Start Investor Demo Mode for offline screenshots.
5. Start `npm run dev:echo` only for Direct Mode screenshots.
6. Use `ws://127.0.0.1:17787` for local examples.
7. Hide unrelated desktop apps, browser extensions, and personal bookmarks.
8. Verify no secret, token, private URL, customer payload, or personal data is visible.
9. Capture the real app state; do not mock UI in an image editor.

For the recommended public showcase order and platform-specific positioning, see [../showcase.md](../showcase.md).

## Demo Recording Recommendations

- Record at `1920x1080`, 30 FPS.
- Keep the primary cut under 45 seconds.
- Use Investor Demo Mode first, then Direct Mode with the local echo server.
- Show one selected packet, the payload inspector, and one replay action.
- If AI is disabled, show the offline demo explanation and keep the provider badge visible.
- Add captions in the video editor only if they describe real implemented behavior.
- Export a short `.mp4` for release assets and a lighter `.gif` only when GitHub preview needs it.

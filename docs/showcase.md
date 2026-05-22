# Public Showcase Guide

This guide prepares SocketLens for public sharing on GitHub, Reddit, Hacker News, Product Hunt, and Twitter/X.

The positioning should stay honest: SocketLens is an early alpha open-source developer tool. It is useful today for local WebSocket debugging and demos, but it is not a finished commercial product and should not claim traction, revenue, or production adoption.

## Short Tagline

Local-first WebSocket debugging for realtime apps.

Alternative shorter version:

Visual WebSocket debugging, built for realtime developers.

## One-Paragraph Pitch

SocketLens is an open-source desktop WebSocket debugger for developers building realtime apps. It gives you a focused local workspace to connect to `ws://` and `wss://` endpoints, inspect inbound and outbound frames, search/filter noisy sessions, replay outgoing messages, save session files, and demonstrate realistic traffic offline. It is alpha software, but the core workflows are runnable: Investor Demo Mode works without setup, Direct Mode works with the included echo server, and Proxy Mode is available in the native Tauri app for local client-to-target debugging.

## Why This Exists

Realtime bugs are hard to understand from scattered console logs and generic browser frame tables. Auth handshakes, heartbeats, chat messages, notifications, retries, and errors all happen in one long-lived stream. SocketLens exists to turn that stream into a readable local debugging session: timeline first, payload inspector beside it, replay when you need to reproduce behavior, and session files when you need to come back later.

## Strongest Features To Lead With

- Local-first by default, with no telemetry or hosted ingestion.
- Investor Demo Mode that shows realistic realtime traffic offline.
- Direct WebSocket Mode for connecting to local or remote `ws://` and `wss://` endpoints.
- Included echo server on `ws://127.0.0.1:17787` for a quick real round trip.
- Packet timeline with direction, event name, timestamps, payload preview, badges, search, and filters.
- Payload inspector with Pretty, Raw, and Metadata views.
- Manual send and replay for outbound packets.
- Local session save/load and packet export.
- Native Tauri/Rust proxy MVP for observing traffic from another client.
- Optional AI explain action, disabled by default and triggered only by explicit user action.
- Russian default UI with English available in Settings.

## Strongest Demo Workflow

Use this flow for screenshots, short videos, live demos, and launch posts.

1. Start with a clean app state.
2. Open SocketLens with `npm run dev`.
3. Show the first-run onboarding block briefly.
4. Click **Start Investor Demo**.
5. Let simulated auth, chat, heartbeat, notification, error, replay, and AI-preview packets appear.
6. Select a visually rich packet in the timeline.
7. Show Pretty JSON, Raw payload, and Metadata in the inspector.
8. Run `npm run dev:echo` in a second terminal.
9. Connect Direct Mode to `ws://127.0.0.1:17787`.
10. Send `{ "command": "ping" }`.
11. Show outbound ping, echoed frame, and `command.pong` response.
12. Replay the outgoing ping.
13. Close by mentioning Proxy Mode as native desktop alpha, not the first-run path.

Best demo length:

- 30-45 seconds for Twitter/X and Product Hunt.
- 60-90 seconds for GitHub README and Reddit.
- 2-3 minutes for Hacker News or investor walkthroughs.

## Screenshot Order Recommendation

Use real app states only. Do not mock screenshots in an image editor.

1. `01-onboarding-first-run`: first-run onboarding with the "Try SocketLens in 2 minutes" flow visible.
2. `02-investor-demo-active`: Investor Demo Mode running with guided cards and timeline activity.
3. `03-packet-selected`: selected packet in timeline plus Pretty JSON inspector.
4. `04-direct-echo-connected`: Direct Mode connected to `ws://127.0.0.1:17787` with a `command.pong` response.
5. `05-replay-workflow`: outgoing packet loaded into replay/manual send UI.
6. `06-filters-search`: search/filter chips active with a meaningful result count.
7. `07-settings-privacy-ai`: Settings showing AI disabled/default privacy copy.
8. `08-proxy-native-running`: native desktop Proxy Mode running with target URL and local proxy URL visible.

Recommended capture sizes and naming rules live in [assets/README.md](assets/README.md).

## Platform Positioning

### GitHub

Lead with runnable trust:

- "Clone, install, run, start demo."
- Show alpha status and limitations near the top.
- Link Quick Start, manual QA, privacy, release notes, and issue templates.
- Use screenshots that show implemented behavior, not speculative features.

Best angle: open-source local-first WebSocket debugger with a runnable demo and local echo server.

### Reddit

Lead with the problem and ask for practical feedback:

- "I am building an open-source WebSocket debugger for realtime apps."
- Mention what works today: offline demo, direct mode, echo server, replay, inspector.
- Ask people to try it with their local WebSocket services.
- Be upfront that native proxy mode is alpha and needs OS testing.

Best angle: developer pain and feedback request.

### Hacker News

Lead with technical clarity:

- Local-first desktop app.
- Tauri/Rust native proxy path.
- React/TypeScript frontend with typed packet/session models.
- No telemetry by default.
- AI optional and disabled by default.

Best angle: "Show HN: SocketLens, an open-source local WebSocket debugger for realtime apps."

### Product Hunt

Lead with the visual story:

- 30-45 second demo video.
- Screenshot 1: live packet timeline.
- Screenshot 2: selected payload inspector.
- Screenshot 3: Direct Mode with echo-server response.
- Keep AI as optional support, not the headline.

Best angle: polished developer workflow for realtime app debugging.

### Twitter/X

Lead with one concrete demo:

- "Debug WebSocket traffic locally."
- Show a short clip of demo packets, selected payload, direct echo ping, and replay.
- Keep the copy short and avoid claims about users, revenue, or production adoption.

Best angle: visual before/after of raw realtime traffic becoming an inspectable session.

## Suggested Launch Copy

### GitHub Intro

SocketLens is a local-first WebSocket debugger for developers building realtime apps. It lets you connect to WebSocket endpoints, inspect packet timelines, replay outbound messages, save sessions, and run an offline guided demo when no backend is available.

### Reddit / HN Post Body

I am building SocketLens, an open-source desktop debugger for WebSocket traffic. The goal is to make realtime sessions easier to inspect than scattered console logs or generic browser frame tables. The alpha currently has an offline Investor Demo Mode, Direct Mode for `ws://`/`wss://` endpoints, an included echo server, packet search/filtering, payload inspection, replay, session save/load, and a native Tauri/Rust proxy MVP. It is local-first, has no telemetry by default, and AI is optional/disabled unless the user explicitly runs an AI action. I would love feedback on the first-run flow, Direct Mode with real local servers, and Proxy Mode on different operating systems.

### Product Hunt Short Description

An open-source desktop WebSocket debugger for inspecting, replaying, and saving realtime traffic locally.

### Twitter/X Post

SocketLens is an open-source local WebSocket debugger for realtime apps.

Inspect frames, search noisy sessions, replay outgoing messages, save sessions, and run an offline demo without a backend.

Alpha, local-first, no telemetry by default.

## Confusing Terminology To Avoid Or Explain

- **Investor Demo Mode**: use "offline guided demo with simulated traffic" on first mention.
- **Demo Mode**: clarify whether you mean the guided investor demo or continuous synthetic demo stream.
- **Direct Mode**: explain that SocketLens opens the WebSocket connection itself.
- **Proxy Mode**: explain that another client connects through SocketLens; note that it requires the native Tauri app.
- **Packet** and **frame**: use "WebSocket frame" for technical audiences and "packet timeline" for product UI.
- **AI Explain**: describe it as optional and manual; do not imply automatic monitoring or required AI.
- **Sessions**: explain as local JSON debug sessions, not cloud workspaces.

## Weak Visual Areas Before Launch

These are not reasons to hide the project, but they should be watched before broad launch:

- Final captured screenshots and demo GIFs still need to be produced from real app states.
- Proxy Mode screenshots should only be captured from native desktop mode, not browser mode.
- Empty states should stay useful; avoid screenshots where the main timeline is blank unless showing onboarding.
- Settings can look dense, so use it only for privacy/AI proof, not as the lead image.
- Error states are useful for trust but should not be in the first screenshot.
- Light theme and small responsive layouts are secondary; the strongest launch visuals are dark desktop screenshots.
- AI should not be visually positioned as the main value, because it is optional and provider-dependent.

## Honest Claims Checklist

Use these claims:

- Open-source alpha.
- Local-first by default.
- No telemetry by default.
- Demo traffic is simulated and labeled.
- Direct Mode works with reachable WebSocket endpoints.
- Echo server is included for local testing.
- Proxy Mode is a native alpha MVP.
- AI is optional, disabled by default, and only sends selected data after a user click.

Avoid these claims:

- Production-ready.
- Enterprise-ready.
- Used by teams or companies, unless real public users exist.
- AI-powered debugger as the core promise.
- Secure for all sensitive production traffic.
- Signed downloadable releases, until signing is actually configured.
- Cross-platform proxy reliability, until it is validated on Windows, macOS, and Linux.


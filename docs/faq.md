# FAQ

## What is SocketLens?

SocketLens is a desktop WebSocket debugger for developers building realtime applications. It captures WebSocket frames, shows them in a packet timeline, lets you inspect payloads, and supports manual sends, replay, session files, demo mode, and native proxy capture.

## Is SocketLens production-ready?

SocketLens is early open-source software. The repository is structured as a real product, not a throwaway prototype, but you should still expect active iteration.

## Does SocketLens require a backend?

No. You can start with Investor Demo Mode, which works offline.

For real traffic, you can use:

- Direct Mode with any `ws://` or `wss://` endpoint
- Proxy Mode in the native desktop app
- the included echo server

## What is the difference between Direct Mode and Proxy Mode?

Direct Mode means SocketLens opens the WebSocket connection itself.

Proxy Mode means an external client connects through SocketLens, and SocketLens forwards traffic to your target server.

## Can I use SocketLens in the browser?

The development frontend runs in a browser with:

```bash
npm run dev
```

Direct Mode, demo mode, packet inspection, settings, manual send, replay, and browser fallback session files work there.

Native-only features such as Proxy Mode and OS file dialogs require:

```bash
npm run dev:desktop
```

## How do I test it quickly?

Run:

```bash
npm install
npm run dev
```

Then click **Start Investor Demo**.

## How do I test with a real local server?

Run:

```bash
npm run dev:echo
```

Then connect SocketLens to:

```text
ws://127.0.0.1:17787
```

## Does SocketLens store my packets?

Captured packets are kept in local app memory. They are written to disk only when you save or export a session file.

## Does SocketLens send telemetry?

No. SocketLens currently has no telemetry or hosted SocketLens analytics endpoint.

SocketLens is local-first. It does not make hidden analytics calls by default, and AI integrations are optional.

## Does AI run automatically?

No. AI is disabled by default. Packet data is sent to a configured provider only after you click an AI action.

## Which AI providers are supported?

SocketLens supports optional OpenAI-compatible and Ollama providers.

## Can I use SocketLens without AI?

Yes. Capture, timeline, inspector, replay, proxy, sessions, and settings work without AI.

## Why do old packets disappear?

SocketLens has a packet retention limit to avoid unbounded memory growth. The default is 10,000 packets. You can raise the limit in Settings or the Memory panel.

## What session file formats are supported?

SocketLens supports:

- `socketlens.session`
- `socketlens.packets`

Both are JSON formats documented in [sessions.md](sessions.md).

## Can I inspect binary frames?

Proxy and direct capture handle binary frames safely. Binary payload display is conservative and intended to avoid crashing the UI.

## Can I connect to secure WebSocket endpoints?

Yes. SocketLens accepts `wss://` URLs in Direct Mode and Proxy target URLs.

## Why does Proxy Mode require desktop mode?

Proxy Mode needs a native local listener and async Rust networking. Browser development mode cannot bind a local WebSocket proxy server from the frontend.

## How do I contribute?

Read [development.md](development.md) and [../CONTRIBUTING.md](../CONTRIBUTING.md). Before opening a pull request, run:

```bash
npm run lint
npm run typecheck
npm run build
```

## Where is the roadmap?

See [../ROADMAP.md](../ROADMAP.md).

## What license does SocketLens use?

SocketLens is released under the GNU Affero General Public License v3.0 only (`AGPL-3.0-only`). See [../LICENSE](../LICENSE) and [license.md](license.md).

## Can I use SocketLens at work?

Yes. You can use SocketLens at work to inspect WebSocket traffic and debug your own systems. Companies should review the AGPL terms with their own counsel if they plan to redistribute modified versions or offer modified SocketLens as a service.

## Can I modify SocketLens privately?

Yes. Personal and internal modifications are allowed. AGPL source-sharing obligations are usually triggered when you distribute a modified version or run a modified network-accessible version for others.

## Can I sell a hosted version?

AGPL does not automatically prohibit commercial use, but if you run a modified SocketLens as a network service for others, you generally need to provide the corresponding source code for that modified version under AGPL-compatible terms. Review [license.md](license.md) and get legal advice before building a commercial service.

## Can I fork SocketLens?

Yes. You can fork SocketLens. Forks and modified redistributed versions must follow AGPL.

## Do I need to open my modifications?

If you distribute a modified version, or run a modified version as a service for others, AGPL generally requires source availability for those modifications. Purely private/internal use is different; see [license.md](license.md).

## Does AGPL affect inspected WebSocket traffic?

No. AGPL applies to SocketLens code. It does not change the ownership or license of packet payloads, session data, endpoint URLs, customer data, or the applications you inspect.

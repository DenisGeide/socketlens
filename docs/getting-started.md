# Getting Started

Purpose: route a new user from a fresh clone to the right SocketLens workflow without repeating every detailed guide.

If you only read one page first, read [Quickstart](quickstart.md).

## What SocketLens Does

SocketLens gives WebSocket debugging a dedicated workspace:

- packet timeline;
- payload inspector;
- search, filters, and grouping;
- manual send and replay;
- session save/export/import;
- redaction before sharing;
- optional desktop proxy;
- optional AI explanations.

## Choose Your First Workflow

| Goal | Start here |
|---|---|
| Install from a fresh clone | [Installation](installation.md) |
| See the app working in two minutes | [Quickstart](quickstart.md) |
| Use simulated traffic without a server | [Demo Mode](demo-mode.md) |
| Test a real local WebSocket endpoint | [Direct Mode](direct-mode.md) |
| Inspect traffic from another client | [Proxy Mode](proxy-mode.md) |
| Learn the full UI | [Function Inventory](function-inventory.md) |
| Validate the repository before release | [Manual QA](manual-qa.md) |

## Minimal First Run

```bash
npm install
npm run dev
```

Expected result:

```text
http://127.0.0.1:1420/
```

Then click **Start Investor Demo**.

## Real Local Traffic

Open a second terminal:

```bash
npm run dev:echo
```

Connect SocketLens to:

```text
ws://127.0.0.1:17787
```

Send:

```json
{ "command": "ping" }
```

Expected result: the timeline shows outbound and inbound packets, and the inspector displays payload details.

## Browser Mode vs Desktop Mode

| Mode | Command | Best for | Requires Rust? |
|---|---|---|---|
| Browser mode | `npm run dev` | Demo Mode, Direct Mode, most frontend work | No |
| Desktop mode | `npm run dev:desktop` | Proxy Mode, native file dialogs, desktop QA | Yes |

## Related

- [Documentation Index](README.md)
- [Installation](installation.md)
- [Quickstart](quickstart.md)
- [Troubleshooting](troubleshooting.md)
- [Manual QA](manual-qa.md)

## Next Steps

- User: [Quickstart](quickstart.md)
- Contributor: [Contributor Guide](contributor-guide.md)
- Maintainer: [Final Alpha Summary](final-alpha-summary.md)


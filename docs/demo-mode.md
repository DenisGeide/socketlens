# Demo Mode

Purpose: explain the simulated demo traffic used for onboarding, screenshots, and investor demos.

Demo Mode exists so a new user can see SocketLens working without starting a WebSocket server.

## What Demo Mode Shows

Demo traffic can include:

- auth challenge/session accepted;
- chat messages;
- presence updates;
- notifications;
- heartbeat ping/pong;
- reconnect/resume;
- warning/error examples;
- streaming AI-like response examples;
- replay example markers.

## Investor Demo

The Investor Demo is a guided offline story. It creates a simulated session, fills the timeline, highlights useful packets, and lets the user inspect payloads immediately.

Use it for:

- first-run onboarding;
- screenshots;
- short product demos;
- checking timeline/inspector visuals without a server.

## Continuous Demo Packet Stream

The demo stream is a continuous synthetic generator. It is useful for:

- testing filters;
- testing grouping;
- checking timeline performance;
- producing screenshot-ready states.

## What Demo Mode Is Not

Demo Mode is not:

- production traffic;
- proof that a real server works;
- a hidden network call;
- a replacement for Direct Mode or Proxy Mode testing.

All demo data should remain clearly marked as simulated.

## Related

- [Quickstart](quickstart.md)
- [Demo States](demo-states.md)
- [Screenshots](screenshots.md)
- [Function Inventory](function-inventory.md)

## Next Steps

After demo mode, test real local traffic with [Direct Mode](direct-mode.md).


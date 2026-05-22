# Roadmap

Purpose: summarize the practical alpha roadmap without presenting planned work as complete.

The canonical project roadmap also lives in [../ROADMAP.md](../ROADMAP.md). This page is the docs-friendly navigation version.

## Current Focus

SocketLens is focused on:

- onboarding clarity;
- stable Direct Mode;
- reliable alpha Proxy Mode;
- replay usability;
- session export/redaction trust;
- clean documentation;
- contributor-friendly extension points.

## Near-term Priorities

- Improve manual QA coverage around Direct Mode, Proxy Mode, replay, sessions, redaction, and environments.
- Expand decoder tests for Socket.IO, GraphQL WS, and fallback behavior.
- Keep polishing the first-run experience and screenshots.
- Harden error handling around invalid URLs, server disconnects, malformed JSON, and backend unavailable states.
- Prepare unsigned alpha desktop artifacts when release workflow is ready.

## Experimental Areas

These exist, but should be treated carefully:

- Proxy Mode MVP;
- AsyncAPI-like inferred export;
- AI explanations;
- source-level plugin foundation;
- initial Socket.IO and GraphQL WS decoding.

## Not In This Alpha

- hosted cloud workspace;
- accounts/auth for SocketLens;
- telemetry;
- remote plugin marketplace;
- enterprise proxy gateway features;
- full Protobuf/MessagePack/BSON support;
- commercial paid product packaging.

## Related

- [Final Alpha Summary](final-alpha-summary.md)
- [Function Inventory](function-inventory.md)
- [Manual QA](manual-qa.md)
- [Release Guide](release.md)

## Next Steps

Before expanding scope, validate [Manual QA](manual-qa.md) and resolve release blockers.


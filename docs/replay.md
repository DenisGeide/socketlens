# Replay

Purpose: document the replay workflow and its current alpha limitations.

Replay lets developers resend an outbound WebSocket payload while debugging.

## What Works

Implemented replay behavior:

- replay selected outbound packet;
- edit payload before replay;
- replay edited payload;
- replay last outgoing packet;
- replay a selected sequence when available;
- configure delay between replayed frames;
- track replay status;
- keep replay history;
- block replay when disconnected.

## Requirements

Replay requires:

- an active Direct Mode WebSocket connection;
- an active session;
- an outgoing source packet or a payload entered in Manual Send.

Demo packets can show replay examples, but real replay needs an active connection.

## Workflow

1. Connect to a WebSocket endpoint.
2. Send a payload from Manual Send.
3. Select the outgoing packet.
4. Optionally edit the payload.
5. Click replay.

Expected result:

- a new outbound packet appears;
- replay status updates;
- replay history records the action;
- if the server responds, the inbound response appears in the timeline.

## Sequence Replay

Sequence replay uses recent outgoing packets and sends them with the configured delay.

Use it for:

- reproducing short flows;
- repeating a ping/auth/chat sequence;
- validating a local server response pattern.

Do not treat sequence replay as load testing. It is a debugging workflow, not a benchmark tool.

## Related

- [Direct Mode](direct-mode.md)
- [Manual QA](manual-qa.md)
- [Sessions](sessions.md)
- [Packet Relationships](packet-relationships.md)

## Next Steps

Use filters to find replayed frames: [Filters](filters.md).


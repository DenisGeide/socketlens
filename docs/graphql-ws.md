# GraphQL over WebSocket Support

SocketLens includes initial GraphQL over WebSocket decoding so subscription traffic is easier to read in the packet timeline.

Status: alpha. This is protocol awareness, not full GraphQL IDE tooling.

## Supported Message Shapes

SocketLens detects common JSON envelopes used by:

- `graphql-transport-ws`
- legacy `subscriptions-transport-ws`

Recognized examples:

```json
{
  "id": "sub-1",
  "type": "subscribe",
  "payload": {
    "operationName": "MessageAdded",
    "query": "subscription MessageAdded { messageAdded { id text } }"
  }
}
```

```json
{
  "id": "sub-1",
  "type": "next",
  "payload": {
    "data": {
      "messageAdded": {
        "id": "msg_1",
        "text": "Hello"
      }
    }
  }
}
```

```json
{
  "id": "legacy-1",
  "type": "start",
  "payload": {
    "operationName": "PresenceChanged",
    "query": "subscription PresenceChanged { presenceChanged { userId status } }"
  }
}
```

## What SocketLens Shows

Decoded GraphQL WS packets show:

- protocol badge: `GraphQL WS`,
- subscription start / next / error / complete labels,
- operation id,
- operation name when present or inferable from the query,
- operation kind when inferable,
- protocol family,
- decoded payload in Pretty view.

Raw view always keeps the original WebSocket payload exactly as captured.

## Fallback Behavior

SocketLens only uses the GraphQL WS decoder when the JSON envelope has a recognizable GraphQL WebSocket shape. Normal application JSON stays in the regular JSON decoder.

Unknown or malformed messages do not crash the inspector. They remain available through Raw view and the normal JSON/text fallback path.

## Manual Test Packets

Use Direct Mode against any WebSocket endpoint that accepts text frames, then send:

```json
{"id":"sub-1","type":"subscribe","payload":{"operationName":"MessageAdded","query":"subscription MessageAdded { messageAdded { id text } }"}}
```

```json
{"id":"sub-1","type":"next","payload":{"data":{"messageAdded":{"id":"msg_1","text":"Hello GraphQL"}}}}
```

```json
{"id":"sub-1","type":"error","payload":[{"message":"Subscription failed"}]}
```

```json
{"id":"sub-1","type":"complete"}
```

Expected result:

- timeline rows show `GraphQL WS`,
- event names show subscription lifecycle labels,
- Pretty view shows decoded metadata,
- Raw view shows the original JSON frame.

## Current Limitations

- No GraphQL schema introspection.
- No query editor or validation.
- No automatic operation-to-result correlation beyond the message id metadata.
- No persisted GraphQL collections.
- No heavy parser dependency; operation name inference is intentionally lightweight.

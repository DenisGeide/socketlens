# Sessions

A SocketLens session is one captured debugging run. It groups packets, connection metadata, timestamps, status, close details, and byte/packet counts.

## Session Sources

Sessions can come from:

- Investor Demo Mode
- continuous Demo mode
- Direct Mode WebSocket connections
- Proxy Mode client connections
- imported SocketLens session files
- imported packet export files

## Session Metadata

A session contains:

- id
- name
- connection id
- endpoint URL
- created/start/end timestamps
- status
- packet counters
- byte counters
- close code
- close reason

Session statuses are:

- `connecting`
- `connected`
- `closed`
- `error`

## Packet Metadata

Each packet contains:

- id
- connection id
- session id
- direction: `inbound` or `outbound`
- payload kind: `json`, `text`, or `binary`
- payload text
- size in bytes
- timestamp

## Save a Session

Use **Session files** in the sidebar after selecting a session.

1. Optionally edit the session name.
2. Click **Save**.
3. SocketLens writes a `.socketlens-session.json` file.

Desktop mode uses a native save dialog. Browser development mode downloads a JSON file.

## Export Packets

Use **Export** to write only packets and metadata. Packet-only exports use `.socketlens-packets.json`.

Packet exports are useful when you want to share packet data without the full session object.

## Load a Session

Click **Load** and choose a SocketLens JSON file.

Supported formats:

- `socketlens.session`
- `socketlens.packets`

Imported files are added as historical sessions. SocketLens remaps ids during import so loaded data does not collide with active captures.

## File Format

Full session files use:

```json
{
  "metadata": {
    "appName": "SocketLens",
    "format": "socketlens.session",
    "version": 1,
    "sessionName": "Local echo debug",
    "createdAt": "2026-05-21T12:00:00.000Z",
    "exportedAt": "2026-05-21T12:10:00.000Z",
    "packetCount": 2,
    "sourceSessionId": "session-id",
    "endpointUrl": "ws://127.0.0.1:17787"
  },
  "session": {
    "id": "session-id",
    "name": "Local echo debug",
    "connectionId": "connection-id",
    "endpointUrl": "ws://127.0.0.1:17787",
    "createdAt": 1779364800000,
    "startedAt": 1779364800000,
    "endedAt": 1779365400000,
    "status": "closed",
    "packetsReceived": 1,
    "packetsSent": 1,
    "bytesReceived": 21,
    "bytesSent": 21,
    "closeCode": 1000,
    "closeReason": "Client disconnected"
  },
  "packets": [
    {
      "id": "packet-id",
      "connectionId": "connection-id",
      "sessionId": "session-id",
      "direction": "outbound",
      "payloadKind": "json",
      "payload": "{ \"command\": \"ping\" }",
      "sizeBytes": 21,
      "timestamp": 1779364860000
    }
  ]
}
```

Packet-only exports omit the `session` object and use:

```json
{
  "metadata": {
    "appName": "SocketLens",
    "format": "socketlens.packets",
    "version": 1,
    "sessionName": "Packet export",
    "createdAt": "2026-05-21T12:00:00.000Z",
    "exportedAt": "2026-05-21T12:10:00.000Z",
    "packetCount": 1,
    "sourceSessionId": null,
    "endpointUrl": null
  },
  "packets": []
}
```

## Validation

Imported files are validated before entering app state. SocketLens rejects:

- non-JSON files
- unsupported formats
- unsupported file versions
- missing metadata
- invalid session status values
- invalid packet direction or payload kind values
- packet entries missing required fields

## Privacy

Session files may contain sensitive payloads and endpoint URLs. Treat exported files as debugging artifacts and review them before sharing.

See [privacy.md](privacy.md).

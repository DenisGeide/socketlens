import { describe, expect, it } from "vitest";
import { getConnectionName, isWebSocketUrl, redactUrlForDisplay, validateWebSocketUrl } from "@/models";

describe("WebSocket URL validation", () => {
  it("accepts ws and wss URLs and trims user input", () => {
    expect(validateWebSocketUrl(" ws://127.0.0.1:17787/socket ")).toEqual({
      ok: true,
      url: "ws://127.0.0.1:17787/socket",
    });

    expect(validateWebSocketUrl("wss://example.com/realtime?token=dev")).toEqual({
      ok: true,
      url: "wss://example.com/realtime?token=dev",
    });
  });

  it("rejects empty, malformed, non-WebSocket, and fragmented URLs", () => {
    expect(validateWebSocketUrl("")).toEqual({
      message: "Enter a WebSocket URL before connecting.",
      ok: false,
    });
    expect(validateWebSocketUrl("not a url").ok).toBe(false);
    expect(validateWebSocketUrl("https://example.com/socket")).toEqual({
      message: "Endpoint must start with ws:// or wss://.",
      ok: false,
    });
    expect(validateWebSocketUrl("ws://example.com/socket#debug")).toEqual({
      message: "WebSocket URLs cannot include URL fragments.",
      ok: false,
    });
  });

  it("supports boolean checks and readable connection names", () => {
    expect(isWebSocketUrl("ws://localhost:17787")).toBe(true);
    expect(isWebSocketUrl("http://localhost:17787")).toBe(false);
    expect(getConnectionName("wss://example.com/realtime")).toBe("example.com");
    expect(getConnectionName("not a url")).toBe("not a url");
  });

  it("redacts URL credentials and query strings for logs and AI prompts", () => {
    expect(redactUrlForDisplay("wss://api.example.com/realtime?token=secret&workspace=acme")).toBe(
      "wss://api.example.com/realtime?...",
    );
    expect(redactUrlForDisplay("wss://alice:secret@example.com/socket")).toBe("wss://user:***@example.com/socket");
    expect(redactUrlForDisplay("not a url")).toBe("not a url");
  });
});

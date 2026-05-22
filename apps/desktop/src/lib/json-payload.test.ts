import { describe, expect, it } from "vitest";
import { getJsonCommand, getJsonStringField, getJsonType, parseJsonObject, parseJsonPayload } from "@/lib/json-payload";

describe("json payload helpers", () => {
  it("reads string fields from object payloads", () => {
    const payload = JSON.stringify({ command: "ping", type: "command.ping" });

    expect(getJsonCommand(payload)).toBe("ping");
    expect(getJsonType(payload)).toBe("command.ping");
    expect(getJsonStringField(payload, "command")).toBe("ping");
  });

  it("ignores invalid JSON, arrays, and non-string fields", () => {
    expect(parseJsonObject("{")).toBeNull();
    expect(parseJsonObject("[]")).toBeNull();
    expect(getJsonCommand(JSON.stringify({ command: 42 }))).toBeNull();
  });

  it("distinguishes invalid JSON from valid non-object JSON", () => {
    expect(parseJsonPayload("{")).toEqual({ ok: false });
    expect(parseJsonPayload("[]")).toEqual({ ok: true, value: [] });
  });
});

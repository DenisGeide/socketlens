export type JsonPayloadParseResult =
  | {
      ok: true;
      value: unknown;
    }
  | {
      ok: false;
    };

export function getJsonStringField(payload: string, field: string) {
  const parsed = parseJsonObject(payload);

  return typeof parsed?.[field] === "string" ? parsed[field] : null;
}

export function getJsonCommand(payload: string) {
  return getJsonStringField(payload, "command");
}

export function getJsonType(payload: string) {
  return getJsonStringField(payload, "type");
}

export function parseJsonObject(payload: string): Record<string, unknown> | null {
  const parsed = parseJsonPayload(payload);

  if (!parsed.ok) {
    return null;
  }

  return parsed.value && typeof parsed.value === "object" && !Array.isArray(parsed.value)
    ? (parsed.value as Record<string, unknown>)
    : null;
}

export function parseJsonPayload(payload: string): JsonPayloadParseResult {
  try {
    const parsed = JSON.parse(payload) as unknown;

    return {
      ok: true,
      value: parsed,
    };
  } catch {
    return {
      ok: false,
    };
  }
}

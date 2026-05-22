import { redactUrlForDisplay } from "./connection";
import { hasPacketAnnotations, type Packet, type PacketAnnotations } from "./packet";
import type { SocketLensRedactionMetadata } from "./session-file";
import type { Session } from "./session";

export const defaultRedactionReplacement = "[REDACTED]";

export type SessionRedactionOptions = {
  customRules?: string[];
  enabled?: boolean;
  replacement?: string;
};

export type SessionRedactionPreviewPacket = {
  after: string;
  before: string;
  packetId: string;
  replacements: number;
};

export type SessionRedactionSummary = {
  applied: boolean;
  customRuleCount: number;
  invalidCustomRules: string[];
  packetCount: number;
  previewPacket: SessionRedactionPreviewPacket | null;
  redactedPacketCount: number;
  replacement: string;
  replacements: number;
  sensitiveDataDetected: boolean;
};

export type SessionRedactionResult = {
  packets: Packet[];
  session: Session | null;
  summary: SessionRedactionSummary;
};

type CompiledCustomRule = {
  label: string;
  regex: RegExp;
};

type RedactionStats = {
  previewPacket: SessionRedactionPreviewPacket | null;
  redactedPacketCount: number;
  replacements: number;
};

type RedactionContext = {
  customRules: CompiledCustomRule[];
  replacement: string;
};

const encoder = new TextEncoder();
const sensitiveKeyNames = new Set([
  "authorization",
  "cookie",
  "cookies",
  "setcookie",
  "xapikey",
  "apikey",
  "accesstoken",
  "refreshtoken",
  "idtoken",
  "authtoken",
  "sessiontoken",
  "csrftoken",
  "xsrftoken",
  "password",
  "passwd",
  "secret",
  "clientsecret",
  "jwt",
]);

const textRedactionRules: Array<{
  regex: RegExp;
  replace: (match: string, prefix?: string, value?: string, suffix?: string) => string;
}> = [
  {
    regex: /\b(authorization\s*:\s*)([^\r\n]+)/gi,
    replace: (_match, prefix = "") => `${prefix}${defaultRedactionReplacement}`,
  },
  {
    regex: /\b(cookie\s*:\s*)([^\r\n]+)/gi,
    replace: (_match, prefix = "") => `${prefix}${defaultRedactionReplacement}`,
  },
  {
    regex: /\b(set-cookie\s*:\s*)([^\r\n]+)/gi,
    replace: (_match, prefix = "") => `${prefix}${defaultRedactionReplacement}`,
  },
  {
    regex:
      /(["']?(?:authorization|cookie|set-cookie|x-api-key|api-key|access_token|refresh_token|id_token|auth_token|token|password|secret|jwt)["']?\s*[:=]\s*["'])([^"'\r\n]+)(["'])/gi,
    replace: (_match, prefix = "", _value = "", suffix = "") => `${prefix}${defaultRedactionReplacement}${suffix}`,
  },
  {
    regex: /\b(Bearer\s+)([A-Za-z0-9._~+/=-]{8,})/g,
    replace: (_match, prefix = "") => `${prefix}${defaultRedactionReplacement}`,
  },
  {
    regex:
      /\b((?:access_token|refresh_token|id_token|auth_token|token|api_key|apikey|password|secret|jwt)=)([^&\s;,"'}]+)/gi,
    replace: (_match, prefix = "") => `${prefix}${defaultRedactionReplacement}`,
  },
  {
    regex:
      /([?&](?:access_token|refresh_token|id_token|auth_token|token|api_key|apikey|password|secret|jwt)=)([^&#\s]+)/gi,
    replace: (_match, prefix = "") => `${prefix}${defaultRedactionReplacement}`,
  },
];

export function normalizeCustomRedactionRules(rules: string | string[] | undefined) {
  const rawRules = Array.isArray(rules) ? rules : (rules ?? "").split(/\r?\n/);

  return rawRules.map((rule) => rule.trim()).filter(Boolean);
}

export function createSessionRedactionPreview(input: {
  customRules?: string[];
  packets: Packet[];
  replacement?: string;
  session?: Session | null;
}): SessionRedactionSummary {
  return redactSessionForExport({
    ...input,
    enabled: true,
  }).summary;
}

export function redactSessionForExport({
  customRules,
  enabled = true,
  packets,
  replacement = defaultRedactionReplacement,
  session = null,
}: {
  customRules?: string[];
  enabled?: boolean;
  packets: Packet[];
  replacement?: string;
  session?: Session | null;
}): SessionRedactionResult {
  const normalizedCustomRules = normalizeCustomRedactionRules(customRules);
  const compiledCustomRules = compileCustomRules(normalizedCustomRules);
  const context: RedactionContext = {
    customRules: compiledCustomRules.rules,
    replacement,
  };

  if (!enabled) {
    return {
      packets: packets.map((packet) => ({ ...packet })),
      session: session ? { ...session } : null,
      summary: createSummary({
        applied: false,
        customRuleCount: compiledCustomRules.rules.length,
        invalidCustomRules: compiledCustomRules.invalidRules,
        packetCount: packets.length,
        previewPacket: null,
        redactedPacketCount: 0,
        replacement,
        replacements: 0,
      }),
    };
  }

  const stats: RedactionStats = {
    previewPacket: null,
    redactedPacketCount: 0,
    replacements: 0,
  };
  const redactedPackets = packets.map((packet) => redactPacket(packet, context, stats));
  const redactedSession = session ? redactSession(session, context, stats) : null;

  return {
    packets: redactedPackets,
    session: redactedSession,
    summary: createSummary({
      applied: true,
      customRuleCount: compiledCustomRules.rules.length,
      invalidCustomRules: compiledCustomRules.invalidRules,
      packetCount: packets.length,
      previewPacket: stats.previewPacket,
      redactedPacketCount: stats.redactedPacketCount,
      replacement,
      replacements: stats.replacements,
    }),
  };
}

export function createSocketLensRedactionMetadata(
  summary: SessionRedactionSummary,
  redactedAt = Date.now(),
): SocketLensRedactionMetadata {
  return {
    applied: summary.applied,
    customRuleCount: summary.customRuleCount,
    invalidCustomRules: summary.invalidCustomRules,
    redactedAt: new Date(redactedAt).toISOString(),
    redactedPacketCount: summary.redactedPacketCount,
    replacement: summary.replacement,
    replacements: summary.replacements,
    sensitiveDataDetected: summary.sensitiveDataDetected,
  };
}

function redactPacket(packet: Packet, context: RedactionContext, stats: RedactionStats): Packet {
  const payloadResult = redactPayload(packet.payload, context);
  const annotationResult = redactPacketAnnotations(packet.annotations, context);
  const replacements = payloadResult.replacements + annotationResult.replacements;
  const changed = replacements > 0;

  if (changed) {
    stats.redactedPacketCount += 1;
    stats.replacements += replacements;

    if (!stats.previewPacket) {
      stats.previewPacket = {
        after: payloadResult.replacements > 0 ? payloadResult.value : JSON.stringify(annotationResult.annotations, null, 2),
        before: payloadResult.replacements > 0 ? packet.payload : JSON.stringify(packet.annotations, null, 2),
        packetId: packet.id,
        replacements,
      };
    }
  }

  const redactedPacket = {
    ...packet,
    payload: payloadResult.value,
    sizeBytes: encoder.encode(payloadResult.value).byteLength,
  };

  if (annotationResult.annotations) {
    redactedPacket.annotations = annotationResult.annotations;
  } else {
    delete redactedPacket.annotations;
  }

  return redactedPacket;
}

function redactPacketAnnotations(
  annotations: PacketAnnotations | undefined,
  context: RedactionContext,
): { annotations: PacketAnnotations | undefined; replacements: number } {
  if (!annotations) {
    return {
      annotations,
      replacements: 0,
    };
  }

  const noteResult = redactString(annotations.note, context, { customOnly: true });
  let replacements = noteResult.replacements;
  const tags = annotations.tags.map((tag) => {
    const tagResult = redactString(tag, context, { customOnly: true });
    replacements += tagResult.replacements;
    return tagResult.value;
  });
  const nextAnnotations = {
    ...annotations,
    note: noteResult.value,
    tags,
  };

  return {
    annotations: hasPacketAnnotations(nextAnnotations) ? nextAnnotations : undefined,
    replacements,
  };
}

function redactSession(session: Session, context: RedactionContext, stats: RedactionStats): Session {
  const endpointResult = redactString(session.endpointUrl, context);
  const closeReasonResult = session.closeReason ? redactString(session.closeReason, context) : { replacements: 0, value: null };
  const sessionNameResult = redactString(session.name, context, { customOnly: true });
  const replacements = endpointResult.replacements + closeReasonResult.replacements + sessionNameResult.replacements;

  stats.replacements += replacements;

  return {
    ...session,
    closeReason: closeReasonResult.value,
    endpointUrl: endpointResult.value,
    name: sessionNameResult.value,
  };
}

function redactPayload(payload: string, context: RedactionContext) {
  try {
    const parsed = JSON.parse(payload) as unknown;
    const redacted = redactJsonValue(parsed, context);

    if (redacted.replacements === 0) {
      return {
        replacements: 0,
        value: payload,
      };
    }

    return {
      replacements: redacted.replacements,
      value: JSON.stringify(redacted.value, null, 2),
    };
  } catch {
    return redactString(payload, context);
  }
}

function redactJsonValue(value: unknown, context: RedactionContext, key: string | null = null): { replacements: number; value: unknown } {
  if (key && isSensitiveKey(key)) {
    return redactWholeValue(value, context.replacement);
  }

  if (Array.isArray(value)) {
    let replacements = 0;
    const redactedItems = value.map((item) => {
      const result = redactJsonValue(item, context);
      replacements += result.replacements;
      return result.value;
    });

    return {
      replacements,
      value: redactedItems,
    };
  }

  if (isRecord(value)) {
    let replacements = 0;
    const redactedRecord: Record<string, unknown> = {};

    for (const [entryKey, entryValue] of Object.entries(value)) {
      const result = redactJsonValue(entryValue, context, entryKey);
      replacements += result.replacements;
      redactedRecord[entryKey] = result.value;
    }

    return {
      replacements,
      value: redactedRecord,
    };
  }

  if (typeof value === "string") {
    return redactString(value, context);
  }

  return {
    replacements: 0,
    value,
  };
}

function redactWholeValue(value: unknown, replacement: string): { replacements: number; value: unknown } {
  if (Array.isArray(value)) {
    return {
      replacements: value.length,
      value: value.map(() => replacement),
    };
  }

  if (isRecord(value)) {
    const entries = Object.keys(value);

    return {
      replacements: entries.length,
      value: Object.fromEntries(entries.map((entryKey) => [entryKey, replacement])),
    };
  }

  return {
    replacements: value === null || value === undefined ? 0 : 1,
    value: value === null || value === undefined ? value : replacement,
  };
}

function redactString(value: string, context: RedactionContext, options: { customOnly?: boolean } = {}) {
  let nextValue = value;
  let replacements = 0;

  if (!options.customOnly) {
    const urlResult = redactStandaloneUrl(nextValue);
    nextValue = urlResult.value;
    replacements += urlResult.replacements;

    for (const rule of textRedactionRules) {
      const result = replaceAndCount(nextValue, rule.regex, (...args) =>
        rule.replace(args[0] ?? "", args[1], args[2], args[3]).replaceAll(defaultRedactionReplacement, context.replacement),
      );
      nextValue = result.value;
      replacements += result.replacements;
    }
  }

  for (const rule of context.customRules) {
    const result = replaceAndCount(nextValue, rule.regex, context.replacement);
    nextValue = result.value;
    replacements += result.replacements;
  }

  return {
    replacements,
    value: nextValue,
  };
}

function redactStandaloneUrl(value: string) {
  try {
    const parsedUrl = new URL(value);
    const hasSensitiveParts = Boolean(parsedUrl.username || parsedUrl.password || parsedUrl.search);

    if (!hasSensitiveParts) {
      return {
        replacements: 0,
        value,
      };
    }

    return {
      replacements: 1,
      value: redactUrlForDisplay(value),
    };
  } catch {
    return {
      replacements: 0,
      value,
    };
  }
}

function replaceAndCount(
  value: string,
  regex: RegExp,
  replacement: string | ((...args: string[]) => string),
): { replacements: number; value: string } {
  let replacements = 0;
  regex.lastIndex = 0;
  const nextValue = value.replace(regex, (...args: unknown[]) => {
    replacements += 1;
    const stringArgs = args.map((arg) => (typeof arg === "string" ? arg : ""));

    return typeof replacement === "function" ? replacement(...stringArgs) : replacement;
  });

  return {
    replacements,
    value: nextValue,
  };
}

function compileCustomRules(rules: string[]) {
  const invalidRules: string[] = [];
  const compiledRules: CompiledCustomRule[] = [];

  for (const rule of rules) {
    const compiled = compileCustomRule(rule);

    if (compiled) {
      compiledRules.push(compiled);
    } else {
      invalidRules.push(rule);
    }
  }

  return {
    invalidRules,
    rules: compiledRules,
  };
}

function compileCustomRule(rule: string): CompiledCustomRule | null {
  const regexMatch = rule.match(/^\/(.+)\/([dgimsuvy]*)$/);

  try {
    if (regexMatch) {
      const flags = regexMatch[2]?.includes("g") ? regexMatch[2] : `${regexMatch[2] ?? ""}g`;

      return {
        label: rule,
        regex: new RegExp(regexMatch[1] ?? "", flags),
      };
    }

    return {
      label: rule,
      regex: new RegExp(escapeRegExp(rule), "g"),
    };
  } catch {
    return null;
  }
}

function createSummary({
  applied,
  customRuleCount,
  invalidCustomRules,
  packetCount,
  previewPacket,
  redactedPacketCount,
  replacement,
  replacements,
}: Omit<SessionRedactionSummary, "sensitiveDataDetected">): SessionRedactionSummary {
  return {
    applied,
    customRuleCount,
    invalidCustomRules,
    packetCount,
    previewPacket,
    redactedPacketCount,
    replacement,
    replacements,
    sensitiveDataDetected: replacements > 0 || invalidCustomRules.length > 0,
  };
}

function isSensitiveKey(key: string) {
  const normalizedKey = key.replace(/[^a-z0-9]/gi, "").toLowerCase();

  return (
    sensitiveKeyNames.has(normalizedKey) ||
    normalizedKey.endsWith("token") ||
    normalizedKey.endsWith("secret") ||
    normalizedKey.endsWith("apikey") ||
    normalizedKey.endsWith("password")
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

import { describe, expect, it } from "vitest";
import { createUserFacingError, getUnknownErrorDetails } from "@/lib/user-facing-errors";

const t = ((key: string) => {
  const messages: Record<string, string> = {
    "errors.user.invalidUrl.message": "Invalid URL.",
    "errors.user.invalidUrl.suggestion": "Use ws:// or wss://.",
    "errors.user.invalidUrl.title": "Invalid URL",
  };

  return messages[key] ?? key;
}) as never;

describe("user-facing errors", () => {
  it("creates localized user copy with technical details kept separate", () => {
    const error = createUserFacingError("invalidUrl", t, {
      technicalDetails: "URL parser rejected protocol",
    });

    expect(error.title).toBe("Invalid URL");
    expect(error.message).toBe("Invalid URL.");
    expect(error.suggestion).toBe("Use ws:// or wss://.");
    expect(error.technicalDetails).toBe("URL parser rejected protocol");
  });

  it("keeps stack traces in copyable details instead of user copy", () => {
    const cause = new Error("boom");
    const details = getUnknownErrorDetails(cause);

    expect(details).toContain("message: boom");
    expect(details).toContain("stack:");
  });
});

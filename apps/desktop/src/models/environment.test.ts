import { describe, expect, it } from "vitest";
import {
  createEnvironmentExport,
  createPresetEnvironment,
  getEnvironmentVariableNames,
  hasEnvironmentVariables,
  interpolateEnvironmentVariables,
  parseEnvironmentExport,
  redactEnvironmentSecrets,
} from "./environment";

describe("environment variables", () => {
  it("interpolates WebSocket URL variables", () => {
    const environment = createPresetEnvironment("local", 1);
    const result = interpolateEnvironmentVariables("{{base_url}}?token={{auth_token}}", environment);

    expect(result).toEqual({
      ok: true,
      usedVariables: ["base_url", "auth_token"],
      value: "ws://127.0.0.1:17787?token=local-demo-token",
    });
  });

  it("interpolates after variable detection", () => {
    const environment = createPresetEnvironment("local", 1);
    const template = "{{base_url}}";

    expect(hasEnvironmentVariables(template)).toBe(true);
    expect(getEnvironmentVariableNames(template)).toEqual(["base_url"]);
    expect(interpolateEnvironmentVariables(template, environment)).toMatchObject({
      ok: true,
      value: "ws://127.0.0.1:17787",
    });
  });

  it("reports missing variables without dropping the original token", () => {
    const environment = createPresetEnvironment("local", 1);
    const result = interpolateEnvironmentVariables("{{missing_url}}/socket", environment);

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.missingVariables).toEqual(["missing_url"]);
      expect(result.value).toBe("{{missing_url}}/socket");
    }
  });

  it("extracts unique variable names", () => {
    expect(getEnvironmentVariableNames("{{base_url}}/{{base_url}}?token={{ auth_token }}")).toEqual([
      "base_url",
      "auth_token",
    ]);
  });

  it("redacts secret values from previews", () => {
    const environment = createPresetEnvironment("local", 1);

    expect(redactEnvironmentSecrets("ws://127.0.0.1:17787?token=local-demo-token", environment)).toBe(
      "ws://127.0.0.1:17787?token=••••",
    );
  });

  it("round-trips exported environment files", () => {
    const environments = [createPresetEnvironment("local", 1)];
    const exported = createEnvironmentExport(environments, 2);

    expect(parseEnvironmentExport(exported)).toHaveLength(1);
  });
});

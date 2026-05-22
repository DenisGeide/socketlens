import { createEntityId, type EntityId } from "./ids";

export type EnvironmentPreset = "local" | "staging" | "production";

export type EnvironmentVariable = {
  id: EntityId;
  isSecret: boolean;
  key: string;
  value: string;
};

export type EnvironmentConnectionProfile = {
  endpointUrl: string;
  id: EntityId;
  name: string;
};

export type AppEnvironment = {
  connectionProfiles: EnvironmentConnectionProfile[];
  createdAt: number;
  description: string;
  id: EntityId;
  name: string;
  preset?: EnvironmentPreset;
  updatedAt: number;
  variables: EnvironmentVariable[];
};

export type EnvironmentExportFile = {
  environments: AppEnvironment[];
  exportedAt: number;
  version: 1;
};

export type EnvironmentInterpolationResult =
  | {
      ok: true;
      usedVariables: string[];
      value: string;
    }
  | {
      missingVariables: string[];
      ok: false;
      usedVariables: string[];
      value: string;
    };

export const environmentExportVersion = 1;
export const defaultEnvironmentIds = {
  local: "env-local",
  production: "env-production",
  staging: "env-staging",
} as const satisfies Record<EnvironmentPreset, EntityId>;

const variableTokenPattern = /\{\{\s*([A-Za-z_][A-Za-z0-9_.-]*)\s*\}\}/g;
const variableKeyPattern = /^[A-Za-z_][A-Za-z0-9_.-]*$/;

export function createDefaultEnvironments(now = Date.now()): AppEnvironment[] {
  return [
    createPresetEnvironment("local", now),
    createPresetEnvironment("staging", now),
    createPresetEnvironment("production", now),
  ];
}

export function createPresetEnvironment(preset: EnvironmentPreset, now = Date.now()): AppEnvironment {
  const common = {
    createdAt: now,
    preset,
    updatedAt: now,
  };

  switch (preset) {
    case "local":
      return {
        ...common,
        connectionProfiles: [
          {
            endpointUrl: "{{base_url}}",
            id: "profile-local-echo",
            name: "Local echo",
          },
        ],
        description: "Local development endpoints.",
        id: defaultEnvironmentIds.local,
        name: "Local",
        variables: [
          createEnvironmentVariable({ id: "variable-local-base-url", key: "base_url", value: "ws://127.0.0.1:17787" }),
          createEnvironmentVariable({
            id: "variable-local-auth-token",
            isSecret: true,
            key: "auth_token",
            value: "local-demo-token",
          }),
        ],
      };
    case "staging":
      return {
        ...common,
        connectionProfiles: [
          {
            endpointUrl: "{{base_url}}?token={{auth_token}}",
            id: "profile-staging-default",
            name: "Staging WebSocket",
          },
        ],
        description: "Shared pre-production endpoints.",
        id: defaultEnvironmentIds.staging,
        name: "Staging",
        variables: [
          createEnvironmentVariable({ id: "variable-staging-base-url", key: "base_url", value: "wss://staging.example.com/socket" }),
          createEnvironmentVariable({ id: "variable-staging-auth-token", isSecret: true, key: "auth_token", value: "" }),
        ],
      };
    case "production":
      return {
        ...common,
        connectionProfiles: [
          {
            endpointUrl: "{{base_url}}?token={{auth_token}}",
            id: "profile-production-default",
            name: "Production WebSocket",
          },
        ],
        description: "Production endpoints. Review secrets before connecting.",
        id: defaultEnvironmentIds.production,
        name: "Production",
        variables: [
          createEnvironmentVariable({ id: "variable-production-base-url", key: "base_url", value: "wss://api.example.com/socket" }),
          createEnvironmentVariable({ id: "variable-production-auth-token", isSecret: true, key: "auth_token", value: "" }),
        ],
      };
  }
}

export function createEnvironment(input: { description?: string; name?: string; now?: number } = {}): AppEnvironment {
  const now = input.now ?? Date.now();
  const name = input.name?.trim() || "New environment";

  return {
    connectionProfiles: [
      {
        endpointUrl: "{{base_url}}",
        id: createEntityId(),
        name: "Default WebSocket",
      },
    ],
    createdAt: now,
    description: input.description?.trim() ?? "",
    id: createEntityId(),
    name,
    updatedAt: now,
    variables: [createEnvironmentVariable({ key: "base_url", value: "ws://127.0.0.1:17787" })],
  };
}

export function duplicateEnvironment(environment: AppEnvironment, now = Date.now()): AppEnvironment {
  return {
    ...environment,
    connectionProfiles: environment.connectionProfiles.map((profile) => ({
      ...profile,
      id: createEntityId(),
    })),
    createdAt: now,
    id: createEntityId(),
    name: `${environment.name} copy`,
    preset: undefined,
    updatedAt: now,
    variables: environment.variables.map((variable) => ({
      ...variable,
      id: createEntityId(),
    })),
  };
}

export function createEnvironmentVariable(input: {
  id?: EntityId;
  isSecret?: boolean;
  key: string;
  value?: string;
}): EnvironmentVariable {
  return {
    id: input.id ?? createEntityId(),
    isSecret: input.isSecret ?? false,
    key: normalizeEnvironmentVariableKey(input.key),
    value: input.value ?? "",
  };
}

export function createEnvironmentProfile(input: { endpointUrl?: string; name?: string } = {}): EnvironmentConnectionProfile {
  return {
    endpointUrl: input.endpointUrl ?? "{{base_url}}",
    id: createEntityId(),
    name: input.name?.trim() || "WebSocket profile",
  };
}

export function interpolateEnvironmentVariables(
  template: string,
  environment: AppEnvironment | null | undefined,
): EnvironmentInterpolationResult {
  const usedVariables = getEnvironmentVariableNames(template);

  if (usedVariables.length === 0) {
    return {
      ok: true,
      usedVariables,
      value: template.trim(),
    };
  }

  const variableMap = new Map<string, string>();

  for (const variable of environment?.variables ?? []) {
    const key = normalizeEnvironmentVariableKey(variable.key);

    if (key && !variableMap.has(key)) {
      variableMap.set(key, variable.value);
    }
  }

  const missingVariables = new Set<string>();
  variableTokenPattern.lastIndex = 0;

  const value = template.replace(variableTokenPattern, (match, key: string) => {
    const normalizedKey = normalizeEnvironmentVariableKey(key);
    const variableValue = variableMap.get(normalizedKey);

    if (variableValue === undefined || variableValue === "") {
      missingVariables.add(normalizedKey);
      return match;
    }

    return variableValue;
  });

  if (missingVariables.size > 0) {
    return {
      missingVariables: Array.from(missingVariables),
      ok: false,
      usedVariables,
      value: value.trim(),
    };
  }

  return {
    ok: true,
    usedVariables,
    value: value.trim(),
  };
}

export function getEnvironmentVariableNames(template: string): string[] {
  const keys = new Set<string>();

  variableTokenPattern.lastIndex = 0;

  for (const match of template.matchAll(variableTokenPattern)) {
    const key = normalizeEnvironmentVariableKey(match[1] ?? "");

    if (key) {
      keys.add(key);
    }
  }

  return Array.from(keys);
}

export function hasEnvironmentVariables(template: string) {
  variableTokenPattern.lastIndex = 0;
  const result = variableTokenPattern.test(template);

  variableTokenPattern.lastIndex = 0;

  return result;
}

export function isValidEnvironmentVariableKey(key: string) {
  return variableKeyPattern.test(normalizeEnvironmentVariableKey(key));
}

export function normalizeEnvironmentVariableKey(key: string) {
  return key.trim();
}

export function getActiveEnvironment(environments: AppEnvironment[], activeEnvironmentId: EntityId | null) {
  return environments.find((environment) => environment.id === activeEnvironmentId) ?? environments[0] ?? null;
}

export function redactEnvironmentSecrets(value: string, environment: AppEnvironment | null | undefined) {
  let redactedValue = value;

  for (const variable of environment?.variables ?? []) {
    if (!variable.isSecret || !variable.value) {
      continue;
    }

    redactedValue = redactedValue.split(variable.value).join("••••");
  }

  return redactedValue;
}

export function normalizeEnvironmentsState(input: {
  activeEnvironmentId?: EntityId | null;
  environments?: AppEnvironment[];
}): { activeEnvironmentId: EntityId; environments: AppEnvironment[] } {
  const now = Date.now();
  const fallbackEnvironments = createDefaultEnvironments(now);
  const environments = sanitizeEnvironments(input.environments, now);
  const nextEnvironments = environments.length > 0 ? environments : fallbackEnvironments;
  const activeEnvironmentId =
    input.activeEnvironmentId && nextEnvironments.some((environment) => environment.id === input.activeEnvironmentId)
      ? input.activeEnvironmentId
      : nextEnvironments[0]?.id;

  return {
    activeEnvironmentId: activeEnvironmentId ?? defaultEnvironmentIds.local,
    environments: nextEnvironments,
  };
}

export function createEnvironmentExport(environments: AppEnvironment[], exportedAt = Date.now()): EnvironmentExportFile {
  return {
    environments,
    exportedAt,
    version: environmentExportVersion,
  };
}

export function parseEnvironmentExport(input: unknown): AppEnvironment[] {
  if (!input || typeof input !== "object") {
    throw new Error("Environment import file must be a JSON object.");
  }

  const maybeFile = input as Partial<EnvironmentExportFile>;

  if (maybeFile.version !== environmentExportVersion || !Array.isArray(maybeFile.environments)) {
    throw new Error("Environment import file is not compatible with SocketLens.");
  }

  return normalizeEnvironmentsState({ environments: maybeFile.environments }).environments;
}

function sanitizeEnvironments(environments: AppEnvironment[] | undefined, now: number) {
  if (!Array.isArray(environments)) {
    return [];
  }

  return environments
    .filter((environment): environment is AppEnvironment => Boolean(environment?.id && environment.name))
    .map((environment) => ({
      connectionProfiles: sanitizeConnectionProfiles(environment.connectionProfiles),
      createdAt: typeof environment.createdAt === "number" ? environment.createdAt : now,
      description: typeof environment.description === "string" ? environment.description : "",
      id: String(environment.id),
      name: String(environment.name),
      preset: isEnvironmentPreset(environment.preset) ? environment.preset : undefined,
      updatedAt: typeof environment.updatedAt === "number" ? environment.updatedAt : now,
      variables: sanitizeVariables(environment.variables),
    }));
}

function sanitizeVariables(variables: EnvironmentVariable[] | undefined) {
  if (!Array.isArray(variables)) {
    return [];
  }

  return variables
    .filter((variable) => isValidEnvironmentVariableKey(variable?.key ?? ""))
    .map((variable) => ({
      id: String(variable.id || createEntityId()),
      isSecret: Boolean(variable.isSecret),
      key: normalizeEnvironmentVariableKey(variable.key),
      value: typeof variable.value === "string" ? variable.value : "",
    }));
}

function sanitizeConnectionProfiles(profiles: EnvironmentConnectionProfile[] | undefined) {
  if (!Array.isArray(profiles)) {
    return [];
  }

  return profiles
    .filter((profile) => profile?.name && profile.endpointUrl)
    .map((profile) => ({
      endpointUrl: String(profile.endpointUrl),
      id: String(profile.id || createEntityId()),
      name: String(profile.name),
    }));
}

function isEnvironmentPreset(value: unknown): value is EnvironmentPreset {
  return value === "local" || value === "staging" || value === "production";
}

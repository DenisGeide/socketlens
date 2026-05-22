# Adding An AI Provider

AI in SocketLens is optional, disabled by default, and privacy-first. A new provider must not be required for the app to capture, inspect, replay, filter, save, or export packets.

## Files

```text
apps/desktop/src/extensions/types.ts
apps/desktop/src/extensions/ai-provider.ts
apps/desktop/src/lib/ai
apps/desktop/src/lib/ai/providers
apps/desktop/src/models/app-settings.ts
apps/desktop/src/components/ai-analysis-panel.tsx
```

Tests should live next to the AI helper being changed, for example:

```text
apps/desktop/src/lib/ai/prompts.test.ts
```

## Contract

The source-level extension contract is `AIProvider`:

```ts
export type AIProvider = {
  analyze: (settings: AppAiProviderSettings, input: AiAnalysisInput) => Promise<AiProviderResult<AiAnalysisResult>>;
  id: Exclude<AppAiProvider, "disabled">;
  label: string;
  privacyBoundary: "local" | "external";
  validateConfiguration: (settings: AppAiProviderSettings) => AiProviderValidation;
};
```

Built-in providers today:

- `openai-compatible`
- `ollama`

The mock provider in `apps/desktop/src/lib/ai/providers/mock.ts` is for tests and offline demo-style responses. It is not a normal Settings provider.

## Step-By-Step

1. Add a provider settings shape in `apps/desktop/src/models/app-settings.ts`.
2. Extend `AppAiProvider` with the provider id.
3. Update `defaultAppSettings` and `normalizeAppSettings()`.
4. Add provider runtime code under `apps/desktop/src/lib/ai/providers`.
5. Return typed `AiProviderResult` values; do not throw raw network errors into UI.
6. Register the provider in `apps/desktop/src/extensions/ai-provider.ts`.
7. Add Settings UI only after validation and runtime code exist.
8. Add tests for validation, disabled state, and provider error mapping.
9. Update [docs/ai.md](ai.md) and [docs/privacy.md](privacy.md) if user-visible behavior changes.

## Privacy Requirements

A provider must:

- keep API keys local,
- validate configuration before network calls,
- send packet/session data only after explicit user action,
- never run automatically on capture,
- show whether the provider is local or external,
- produce clear errors for invalid configuration and unavailable providers.

Do not add hidden telemetry, background analysis, or automatic packet upload.

## Prompt Requirements

Prompts should ask the model to:

- explain likely packet purpose,
- identify event type,
- identify suspicious errors,
- summarize payload,
- state uncertainty when unsure.

Prompts should not ask the model to claim certainty from incomplete packet context.

## Error Handling

Map provider failures to stable user-facing codes:

- `ai_disabled`
- `invalid_configuration`
- `network_error`
- `provider_error`
- `response_parse_error`

Avoid raw `Failed to fetch` in UI when a more useful message is possible.

## Tests

Run:

```bash
npm run test --workspace @socketlens/desktop
npm run check
```

Test:

- disabled mode returns a safe disabled state,
- missing URL/model/key returns validation errors,
- unavailable provider returns a readable network/provider error,
- malformed provider response returns `response_parse_error`,
- no automatic analysis runs without user action.

## What Not To Do

- Do not make AI required for core workflows.
- Do not hardcode API keys.
- Do not store provider secrets outside local settings.
- Do not send packets automatically on selection.
- Do not add marketing claims that imply AI is production-grade.

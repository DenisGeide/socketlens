# AI

SocketLens includes optional AI analysis architecture. AI is disabled by default and is not required for the app to work.

## Current AI Actions

The implemented UI actions are:

- **Explain selected packet**
- **Explain selected sequence**
- **Summarize session**
- **Explain auth/reconnect flow**

When configured and clicked, SocketLens sends only the bounded context needed for that action. The prompts ask the provider to explain likely behavior, identify event types or flow phases, call out suspicious errors, summarize payload/session context, and avoid claiming certainty when unsure.

Every AI result is shown as a debugging hint. Raw packets, logs, and the actual server behavior remain the source of truth.

## Demo AI Explanation

Investor Demo Mode includes an offline AI explanation sample when AI is disabled. The codebase also includes a deterministic mock provider for tests and offline demo fixtures.

This is clearly marked as:

- demo-only
- offline
- no provider called
- not a real AI result

It is there so first-run users can understand the feature without sending any packet data.

## Future Direction: Session-To-Mock Server

One future idea is AI-assisted mock server generation: record a real debugging session, review and sanitize it, then generate a local mock server draft that can replay representative event flows for development or tests.

This does not exist in the app today. SocketLens does not currently generate mock servers, does not expose a mock-server button, and does not claim recorded sessions can become production-ready mocks automatically.

Before this should be built, the project needs stronger foundations:

- stable versioned session format,
- conservative flow analysis,
- replay sequence modeling,
- sanitized export and redaction workflows,
- reliable optional AI provider behavior,
- clear provider unavailable/error states.

If implemented later, the output should be treated as a reviewed developer draft, not as a guaranteed contract or a replacement for real backend tests.

## Providers

SocketLens supports:

- **Disabled**: default mode; no AI network calls.
- **OpenAI-compatible**: a chat-completions-compatible endpoint.
- **Ollama**: a local or configured Ollama endpoint.

Provider settings live in **Settings > AI Provider**.

## OpenAI-Compatible Setup

In Settings:

1. Set provider to **OpenAI-compatible**.
2. Enter the base URL.
3. Enter the model name.
4. Enter the API key.
5. Click **Validate settings**.

Validation checks local completeness. Analysis requests are sent only after a user clicks an AI action.

## Ollama Setup

In Settings:

1. Set provider to **Ollama**.
2. Enter the Ollama URL, usually:

   ```text
   http://127.0.0.1:11434
   ```

3. Load the model list or enter a local model name manually.
4. Click **Validate settings**.

SocketLens sends packet excerpts to the configured Ollama endpoint only after an AI action is clicked.

If the model list cannot load, SocketLens should show a friendly error. The usual cause is that Ollama is not running, the URL is wrong, the model is not installed, or browser access to the local Ollama endpoint is blocked.

## What Data Is Sent

For **Explain selected packet**, SocketLens sends:

- selected packet metadata
- selected packet payload excerpt
- instructions to avoid overclaiming certainty

For **Explain selected sequence**, SocketLens sends:

- selected packet metadata and payload excerpt
- a small nearby packet window around the selected packet
- instructions to label inferred relationships as inferred

For **Summarize session**, SocketLens sends:

- bounded retained packet context for the current session
- event names, directions, timestamps, payload kinds, sizes, and payload excerpts
- instructions to keep the summary compact and uncertain where evidence is incomplete

For **Explain auth/reconnect flow**, SocketLens sends:

- packets whose decoded event names look related to auth, session, reconnect, resume, token, challenge, or connection state
- instructions to call out missing acknowledgements, retry loops, auth failures, and reconnect gaps

SocketLens does not automatically analyze live traffic. All AI actions require an explicit click.

## What Data Is Not Sent Automatically

SocketLens does not automatically send:

- captured packet streams
- session files
- endpoint history
- API keys to SocketLens servers
- telemetry

AI provider calls happen only after explicit user action.

## Troubleshooting AI

### Provider Not Configured

Keep provider set to **Disabled** unless you intentionally want AI analysis. With AI disabled, SocketLens still supports Demo Mode, Direct Mode, Proxy Mode, packet inspection, replay, and session files.

### Ollama Unavailable

If Settings or **Explain selected packet** reports that Ollama is unavailable:

- confirm Ollama is running locally,
- confirm the base URL is usually `http://127.0.0.1:11434`,
- confirm a model is installed in Ollama,
- load the model list again or enter the model name manually,
- keep AI disabled if you are only testing WebSocket capture.

### OpenAI-Compatible Endpoint Unavailable

If an OpenAI-compatible request fails:

- check the base URL,
- check the model name,
- check the API key,
- confirm the endpoint supports chat-completions-style requests,
- confirm your network allows the app to reach that endpoint.

## Privacy Warning

Do not enable AI analysis for captures containing secrets, personal data, customer content, regulated data, production credentials, or private tokens unless your configured provider is approved for that data.

See [privacy.md](privacy.md) and [security-model.md](security-model.md).

## Developer Notes

AI code lives under `apps/desktop/src/lib/ai`.

The provider abstraction supports:

- OpenAI-compatible chat completions
- Ollama chat
- a local mock provider for tests/offline demos

Add new actions by updating:

- `types.ts`
- `prompts.ts`
- provider implementations if the response contract changes
- the relevant UI component
- privacy documentation if new data is sent

Keep AI optional. Capture, timeline, inspector, replay, session persistence, demo mode, and proxy mode must continue to work with provider set to **Disabled**.

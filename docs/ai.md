# AI

SocketLens includes optional AI analysis architecture. AI is disabled by default and is not required for the app to work.

## Current AI Action

The implemented UI action is:

- **Explain selected packet**

When configured and clicked, SocketLens asks the provider to explain what the selected packet likely does, identify the event type, call out suspicious errors, summarize the payload, and avoid claiming certainty when unsure.

## Demo AI Explanation

Investor Demo Mode includes an offline AI explanation sample when AI is disabled.

This is clearly marked as:

- demo-only
- offline
- no provider called

It is there so first-run users can understand the feature without sending any packet data.

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

For **Explain selected packet**, SocketLens sends a bounded packet-focused prompt containing:

- selected packet metadata
- selected packet payload excerpt
- small session context where needed
- instructions to avoid overclaiming certainty

SocketLens does not automatically analyze live traffic.

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

Add new actions by updating:

- `types.ts`
- `prompts.ts`
- provider implementations if the response contract changes
- the relevant UI component
- privacy documentation if new data is sent

Keep AI optional. Capture, timeline, inspector, replay, session persistence, demo mode, and proxy mode must continue to work with provider set to **Disabled**.

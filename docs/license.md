# License

SocketLens is licensed under the GNU Affero General Public License v3.0 only (`AGPL-3.0-only`).

The full license text is in [../LICENSE](../LICENSE).

This document explains the licensing model in plain language for users, contributors, and companies. It is educational only and is not legal advice. If you are making business or compliance decisions, talk to a qualified lawyer.

## What AGPL Means

AGPL is a strong copyleft open-source license.

In practical terms:

- You can use SocketLens freely.
- You can study the source code.
- You can modify SocketLens.
- You can fork SocketLens.
- You can use SocketLens at work.
- If you distribute a modified version, you generally need to provide the corresponding source code under AGPL-compatible terms.
- If you run a modified version as a network service for others, AGPL generally requires you to make the corresponding source code available to those users.

The network-service part is the main difference between AGPL and licenses that only focus on distributing binaries.

## Why SocketLens Uses AGPL

SocketLens is a developer tool for inspecting realtime application traffic. The project should stay open even if someone modifies it, distributes it, or hosts a modified version.

AGPL helps protect the project from closed commercial forks while keeping normal open-source use possible.

The intent is simple:

- users can use SocketLens,
- contributors can improve it,
- companies can evaluate and use it,
- meaningful modified/distributed/service versions should share their source changes.

## What Users Can Do

You can:

- run SocketLens locally,
- use it for personal projects,
- use it at work,
- inspect your own WebSocket endpoints,
- save local debug sessions,
- modify the app for your own use,
- fork the repository,
- share unmodified copies with the license included.

## What Companies Can Do

Companies can use SocketLens for internal debugging and evaluation.

Common allowed scenarios include:

- developers running SocketLens locally,
- teams testing local WebSocket services,
- internal evaluation of the project,
- private experiments with modifications.

Companies should review AGPL obligations carefully before distributing modified builds, shipping SocketLens inside another product, or offering modified SocketLens as a hosted service.

## What Requires Sharing Source

AGPL source-sharing obligations generally matter when you:

- distribute a modified version of SocketLens,
- provide modified SocketLens binaries to others,
- run a modified SocketLens version as a network-accessible service for others.

In those cases, you generally need to provide the corresponding source code for the modified SocketLens version under AGPL-compatible terms.

## Personal Use

Personal use means you run SocketLens yourself and do not distribute modified versions or provide a modified network service to others.

You can modify SocketLens privately for your own experiments. If the modified version stays private, AGPL source-sharing obligations are generally not triggered.

## Internal Company Use

Internal company use means employees use SocketLens inside the company for development, debugging, or evaluation.

AGPL does not prevent this. If the company modifies SocketLens and keeps those modifications internal, the source-sharing question is different from public redistribution or public service usage.

Companies should still review their own policies and legal requirements before adopting AGPL software.

## Redistribution

Redistribution means you give copies of SocketLens or modified SocketLens to other people.

If you redistribute SocketLens:

- keep the AGPL license text,
- preserve relevant copyright and license notices,
- provide source code as required by AGPL,
- make sure modified versions remain under AGPL-compatible terms.

## SaaS Or Service Usage

AGPL includes a network interaction requirement. If you run a modified version of SocketLens as a service that other people interact with over a network, you generally need to provide the corresponding source code for that modified version to those users.

This is one of the reasons SocketLens uses AGPL: hosted or network-served modified versions should remain open.

## Commercial Usage

AGPL does not automatically ban commercial use.

You can use SocketLens commercially, including at work. You can also build a business around AGPL software if you follow the license.

What AGPL tries to prevent is taking a modified version of SocketLens, distributing it or serving it to users, and keeping the modified source code closed.

If you want to sell a hosted or redistributed modified SocketLens product, get legal advice first.

## Does AGPL Affect Inspected Traffic?

No.

AGPL applies to SocketLens code. It does not change the ownership, confidentiality, or license of:

- WebSocket packet payloads,
- endpoint URLs,
- session files,
- logs,
- customer data,
- your application code,
- APIs you inspect with SocketLens.

Treat captured traffic as sensitive because it may contain secrets or personal data, but it does not become AGPL-licensed just because you inspected it with SocketLens.

## Privacy And Telemetry

The license does not change SocketLens privacy behavior.

SocketLens is local-first:

- no telemetry by default,
- no hidden analytics by default,
- no hosted SocketLens ingestion service by default,
- AI integrations are optional,
- AI actions send selected data only after an explicit user click,
- session files stay local unless you save, export, upload, or share them yourself.

See [privacy.md](privacy.md) and [security-model.md](security-model.md) for the data-flow details.

## Contributor Expectations

Contributions to SocketLens are accepted under `AGPL-3.0-only`.

By opening a pull request, you agree that your contribution can be distributed under the project license.

Please do not contribute code, docs, images, examples, or other assets unless you have the right to license them under AGPL-compatible terms.

If your contribution includes third-party material, mention it clearly in the pull request.

## FAQ

### Can I use SocketLens at work?

Yes. You can use SocketLens at work. Companies should review AGPL before distributing modified builds or offering modified SocketLens as a service.

### Can I modify it privately?

Yes. Private personal or internal modifications are allowed. Source-sharing obligations generally matter when you distribute modified versions or run modified versions as a service for others.

### Can I sell a hosted version?

Commercial use is not automatically forbidden, but a hosted modified version generally needs to provide corresponding source code under AGPL-compatible terms. Get legal advice before doing this.

### Can I fork it?

Yes. Forks are allowed. Forks must keep following AGPL.

### Do I need to open my modifications?

If you distribute modified SocketLens, or run a modified network-accessible version for others, you generally need to provide the corresponding source code. Purely private/internal use is different.

### Does AGPL affect inspected WebSocket traffic?

No. It applies to SocketLens code, not to the WebSocket traffic, payloads, sessions, URLs, or application code you inspect.


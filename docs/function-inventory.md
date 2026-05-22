# SocketLens Function Inventory

Этот документ описывает фактические функции SocketLens в текущем репозитории. Он не является roadmap и не описывает будущие возможности как готовые. Если возможность является демо-сценарием, экспериментом или архитектурной основой, это отмечено явно.

## 1. Product Summary

SocketLens - локальный WebSocket debugging workspace для разработчиков realtime-приложений. Приложение помогает подключаться к WebSocket endpoint, видеть входящие и исходящие фреймы в ленте, инспектировать payload, отправлять сообщения вручную, повторять исходящие фреймы, сохранять сессии и запускать демонстрационный поток без production backend.

Текущий статус: `v0.1.0-alpha`.

Основные режимы:

- **Demo Mode**: симулированный offline-трафик для первого запуска, screenshots и investor demo. Не является реальным production-трафиком.
- **Direct Mode**: браузерный WebSocket-клиент внутри SocketLens подключается напрямую к `ws://` или `wss://` endpoint.
- **Proxy Mode**: desktop/Tauri режим запускает локальный Rust proxy, через который внешний клиент может подключиться к целевому WebSocket серверу.

Что можно считать стабильной alpha-основой:

- основной desktop/web layout;
- demo stream и investor demo;
- Direct Mode для обычных WebSocket endpoint;
- packet timeline, selection, inspector, search/filter, grouping;
- manual send и replay для активного Direct Mode соединения;
- session JSON save/export/import;
- redaction перед экспортом;
- settings, i18n, diagnostics, command palette;
- source-level extension contracts для декодеров, фильтров, экспортов, AI providers и replay.

Что остается experimental/foundation:

- Proxy Mode: рабочий MVP, но требует Tauri desktop backend и имеет alpha-ограничения;
- AsyncAPI draft export: экспериментальный вывод на основе inferred packet flows;
- Socket.IO и GraphQL WS support: initial decoding/fallback, не полный protocol debugger;
- MessagePack/BSON: только документированная future/foundation стратегия, не готовая поддержка;
- plugin registry: source-level локальная архитектура, не marketplace и не runtime remote plugins;
- AI: опционально, выключено по умолчанию, зависит от локального/внешнего provider и запускается только по клику пользователя.

## 2. UI Feature Inventory

### Top Bar

| Элемент | Что делает | Enabled/disabled | Состояние/сервис | Поведение |
|---|---|---|---|---|
| App logo/status | Показывает SocketLens, текущий статус соединения и endpoint | Всегда видим | `connection-store`, `ui-store` | Статус меняется между idle/connecting/connected/disconnected/error/demo |
| Frame counter | Показывает количество текущих пакетов | Всегда видим | `packet-store`, selected session | Счетчик обновляется при приходе/очистке пакетов |
| GitHub Star CTA | Открывает GitHub репозиторий | Всегда доступен | `open-external-url` | В браузере открывает внешнюю ссылку; счетчик не используется как реальная метрика |
| Clear | Запускает подтверждение очистки пакетов | Disabled при 0 пакетах | `packet-store`, `App.tsx` confirmation dialog | Не удаляет файлы сессий; очищает текущую ленту после confirm |
| Command Palette | Открывает палитру команд | Доступно в desktop layout; кнопка скрывается на узких экранах | `command-palette.tsx`, `App.tsx` command list | Также открывается через `Ctrl+K` / `Cmd+K` |
| Settings | Переключает workspace/settings view | Всегда доступно | `ui-store` | Открывает/закрывает страницу настроек |
| Reset Demo | Сбрасывает investor demo | Показывается при активном investor demo | `demo/investor-demo.ts`, `ui-store` | Возвращает demo walkthrough к началу |
| Start/Stop Investor Demo | Запускает или останавливает guided demo | Start disabled при активном connection/demo busy state; Stop доступен в demo | `investor-demo.ts`, `packet-store`, `session-store`, `ui-store` | Создает симулированную demo session и пакеты |
| Connect/Disconnect | Direct Mode connect/disconnect | Connect disabled при connecting/demo active; Disconnect доступен при active connection | `connection-store` | Открывает new connection flow или закрывает WebSocket |

### Sidebar / Connections

Sidebar - основной навигационный и управляющий столбец. Он намеренно компактный и разделен на cards/collapsible sections.

#### Connection Manager

- Показывает заголовок Connection Manager и кнопку **New**.
- Кнопка **New** открывает модальное окно создания direct WebSocket connection.
- В модальном окне вводятся connection name и WebSocket URL.
- URL валидируется как `ws://` или `wss://`.
- Созданное подключение сохраняется в local recent connections, если включена privacy setting для recent connections.

#### Quick Start / onboarding cards

Фактически реализованные onboarding cards:

- Quick Start panel для первого запуска;
- Investor Demo card;
- Demo Packet Stream card.

Поведение:

- cards можно закрыть кнопкой `X`;
- закрывается только конкретная card;
- dismissed state сохраняется локально;
- **Restart onboarding / Перезапустить обучение** в Settings восстанавливает onboarding cards и сбрасывает прогресс;
- onboarding не удаляет данные, сессии или настройки соединений.

#### Capture mode cards

Sidebar показывает два способа получения пакетов:

- **Direct connection**: SocketLens сам подключается к WebSocket endpoint.
- **Proxy mode**: внешнее приложение подключается к локальному SocketLens proxy URL.

Это UI-переключатель рабочего контекста. Он не делает proxy доступным в browser-only mode без Tauri backend.

#### Quick Connect: Echo Server

- Показывает команду `npm run dev:echo`.
- Показывает URL `ws://127.0.0.1:17787`.
- Кнопка **Connect echo** быстро создает/использует direct connection к локальному echo-server.
- **Save endpoint** сохраняет endpoint в список подключений.

#### Active Direct Connection

При активном direct connection показываются:

- connection name;
- endpoint;
- connected/disconnected badge;
- количество захваченных пакетов в текущей сессии;
- actions: Disconnect/Reconnect.

#### Saved WS Endpoints

- Collapsible список сохраненных WebSocket endpoint.
- Показывает last connected time и статус.
- Позволяет выбрать endpoint и переподключиться.

#### Collapsible sections

Sidebar содержит collapsible sections:

- Diagnostics;
- Memory;
- Bookmarks / annotated packets;
- Manual Send;
- Session Files;
- Sessions.

Они нужны, чтобы secondary tools не конкурировали с основной timeline.

### Demo Mode

Demo Mode в SocketLens имеет два уровня:

#### Investor Demo

- Guided сценарий для первого запуска и demo screenshots.
- Создает симулированную сессию с endpoint вида `demo://...`.
- Добавляет реалистичные synthetic packets.
- Показывает packet highlights и walkthrough cards.
- Может показывать demo AI explanation без обращения к реальному AI provider, если AI выключен.

Сгенерированные типы событий:

- auth/challenge/session accepted;
- chat message created/sent;
- presence cursor/user state;
- notification;
- heartbeat ping/pong;
- reconnect/resume;
- error/warning path;
- streaming AI-like response;
- replay example marker.

Ограничения:

- traffic полностью simulated;
- demo не доказывает работу production endpoint;
- demo packets не должны восприниматься как реальные customer данные.

#### Demo Packet Stream

- Continuous synthetic stream для проверки timeline, filters и inspector.
- Start/Stop управляют генератором.
- Пакеты появляются live в timeline.
- Используется для stress/visual проверки, но не заменяет direct/proxy testing.

### Packet Timeline

Timeline - главный рабочий центр приложения.

Функции:

- виртуализированная лента пакетов для больших сессий;
- входящие и исходящие фреймы;
- direction rail/icon;
- event name;
- payload preview;
- timestamp;
- packet size;
- protocol badge, если decoder смог определить протокол;
- badges для error, demo, replay, source, bookmark, suspicious, tags;
- selected packet state;
- hover state;
- grouping repeated events/flows;
- empty state с подсказками;
- loading/paused visual states.

#### Packet selection

- Ручной выбор пакета переводит selection mode в `manual`.
- Новые пакеты больше не перезаписывают выбранный старый пакет.
- Follow/latest behavior отделен от selected packet.
- Кнопка/indicator **Go to latest / К последнему** возвращает к свежим пакетам.
- Если новые пакеты пришли, пока пользователь смотрит старый packet, UI показывает индикатор новых пакетов.

#### Search and filters

В timeline есть:

- debounced search по payload/event/direction;
- text/regex search mode;
- direction filters: all/incoming/outgoing;
- JSON only;
- errors only;
- hide ping/pong;
- hide heartbeat;
- smart filter query;
- filter presets/favorites;
- clear filters;
- result counters.

Invalid regex/smart filter не должен ломать UI: отображается validation issue, результаты безопасно пустеют или фильтр не применяется.

#### Grouping

Реализована группировка realtime-потока:

- repeated events;
- heartbeat storms;
- reconnect/auth related sequences;
- expandable groups;
- возможность выключить grouping.

Группировка не удаляет исходные пакеты: пользователь может раскрыть group и inspect original packets.

#### Clear packets confirmation

- Clear не удаляет пакеты мгновенно.
- Открывается confirmation dialog.
- Confirm очищает captured frames.
- Cancel закрывает dialog без изменений.
- При 0 пакетах clear disabled/no-op.

### Payload Inspector

Inspector расположен справа и показывает детали выбранного пакета.

#### Empty state

Если packet не выбран:

- показывается понятная empty state;
- Pretty/Raw/Metadata не отображают фиктивных данных;
- AI panel остается в disabled/provider state и не отправляет данные.

#### Header and metadata summary

Для выбранного packet показывается:

- event name;
- direction;
- size;
- timestamp;
- incoming/outgoing badge;
- Copy action.

#### Pretty JSON view

- Форматирует JSON payload, если payload валидный JSON.
- Безопасно обрабатывает invalid JSON.
- Использует scroll для длинных строк и больших payload.
- Не переводит содержимое payload.

#### Raw view

- Показывает исходный payload text.
- Не изменяет и не форматирует пользовательские данные.

#### Metadata view

Показывает:

- event name;
- direction;
- timestamp;
- size;
- payload kind;
- connection ID;
- session ID;
- packet ID.

#### Expanded Payload Viewer modal

- Кнопка **Open large view / Развернуть** открывает большую centered modal.
- Modal содержит Pretty/Raw payload view.
- Есть copy и close.
- Есть scroll по вертикали и горизонтали для длинного JSON.
- Ниже payload показывается metadata grid.
- Выбранный packet state сохраняется.

#### Packet relationships

Если Packet Relationship logic нашла связи:

- inspector показывает related packets;
- связи помечаются как inferred, когда это предположение;
- навигация не скрывает raw packet.

### Manual Send

Manual Send находится в sidebar.

Функции:

- payload examples: ping, auth, chat;
- JSON/raw input mode;
- format JSON;
- textarea для payload;
- send frame;
- disabled states при отсутствии active WebSocket connection;
- отображение composer validation error.

Connection requirements:

- отправка работает только при active/open WebSocket;
- в disconnected/browser fallback state кнопки остаются disabled;
- SocketLens не отправляет payload скрыто.

### Replay

Replay является частью Manual Send panel и connection store.

Реализовано:

- replay selected outgoing packet;
- edit payload before replay;
- replay edited payload;
- replay last outgoing packet;
- replay selected sequence из последних исходящих packets;
- delay controls между replay frames;
- replay count controls;
- replay history;
- replay status: idle/running/success/error;
- disabled state, если нет active connection;
- replay source marker в packet metadata/history.

Ограничения:

- реальный replay требует активного Direct Mode WebSocket соединения;
- demo packets могут показывать replay examples, но не являются реальной отправкой на сервер;
- replay не пытается автоматически восстановить закрытое соединение.

### Sessions

Session Files panel находится в sidebar.

Функции:

- session name;
- save current session JSON;
- export packets JSON;
- import/upload previous session JSON;
- packet count;
- created date/status display;
- native Tauri filesystem APIs в desktop mode;
- browser fallback через download/upload JSON.

Форматы:

- `socketlens.session` для полной сессии;
- `socketlens.packets` для экспорта пакетов.

#### Redaction

Перед сохранением/экспортом есть redaction layer:

- redaction warning;
- redaction enabled/disabled toggle;
- redaction preview;
- replacement statistics;
- custom redaction rules;
- warning при unsafe export без redaction, если найдены sensitive данные.

Важно:

- redaction применяется к export/save copy;
- active live session не мутируется автоматически;
- payload structure сохраняется настолько, насколько возможно.

#### AsyncAPI draft

Есть experimental export:

- генерирует AsyncAPI-like YAML draft;
- выводит inferred channels/messages/operations;
- маркирует inferred fields;
- предназначен как черновик, не как точная спецификация.

### Environments

Environments доступны на Settings page.

Реализовано:

- Local/Staging/Production presets;
- environment name/description;
- variables;
- secret variables;
- interpolation syntax `{{base_url}}` и `{{auth_token}}`;
- connection profiles;
- add variable/profile;
- create new environment;
- duplicate environment;
- delete environment;
- import/export environments JSON;
- active environment switching.

Поведение:

- значения хранятся локально;
- secrets скрываются в UI preview;
- exported environment files включают значения переменных, включая secrets, поэтому UI предупреждает пользователя;
- captured packets не переписываются при смене environment.

### Diagnostics

Diagnostics panel находится в sidebar.

Показывает:

- app version;
- platform;
- Tauri backend status;
- connection status;
- active environment;
- socket ready state;
- redacted endpoint;
- proxy status;
- packet counters;
- memory/retention limit;
- AI provider status;
- session id;
- reconnect state;
- last close/error, если есть.

Actions:

- Copy diagnostics;
- Export diagnostics JSON.

Privacy behavior:

- diagnostics bundle не включает payload packets;
- не включает значения environment variables;
- не включает provider secrets;
- не включает последние log messages как raw данные;
- endpoint redacted перед выводом в bundle.

### Settings

Settings page использует один вертикальный desktop flow.

#### Language

- Русский - язык по умолчанию.
- English - второй язык.
- Переключение мгновенное, без reload.
- UI strings переводятся через i18n.
- Payload, JSON, raw messages, URLs, traffic logs и session files не переводятся.

#### Appearance

- Theme: dark/light/system.
- Compact mode.
- Auto-scroll by default.

#### Workspace

- Packet retention limit.
- Presets: 10k/25k/50k.
- Custom numeric input.
- Retention ограничивает память и удаляет старые packets при достижении лимита.

#### Environments

- Встроенный environment manager описан выше.

#### AI Provider

- Disabled by default.
- OpenAI-compatible.
- Ollama.
- Provider validation.
- Load Ollama models.

#### Privacy

- Local-first capture explanation.
- Persist recent connections toggle.
- Show timeline payload previews toggle.

#### Settings actions

- Restart onboarding.
- Reset settings.

### Command Palette

Command Palette находится в `components/command-palette.tsx`.

Shortcut:

- `Ctrl+K` / `Cmd+K`;
- также поддерживается `Ctrl+Shift+P` / `Cmd+Shift+P`.

Действия:

- start demo;
- open settings;
- open diagnostics;
- connect;
- disconnect;
- reconnect;
- switch environment;
- switch session;
- bookmark selected packet;
- replay selected packet;
- clear timeline;
- export session;
- reset filters;
- toggle incoming/outgoing/json/errors/hide ping-pong filters.

Поведение:

- поиск работает по названию, описанию, group и keywords;
- disabled actions показывают причину;
- Enter запускает выбранное действие;
- Escape закрывает palette;
- стрелки вверх/вниз меняют выбранный action.

### AI Panel / AI Features

AI в SocketLens опционален и выключен по умолчанию.

UI actions в AI panel:

- explain selected packet;
- explain selected sequence;
- summarize session;
- explain auth/reconnect flow.

Provider states:

- Disabled;
- OpenAI-compatible;
- Ollama;
- validation error;
- provider unavailable/network error;
- loading;
- markdown result.

Privacy behavior:

- AI не отправляет данные автоматически;
- данные уходят только после явного клика AI action;
- UI показывает privacy warning и uncertainty note;
- demo explanation может работать offline для investor demo без реального provider call.

Ограничения:

- AI output является подсказкой, не source of truth;
- provider credentials хранятся локально;
- качество ответа зависит от выбранного provider/model;
- SocketLens не скрывает факт неопределенности и не должен делать definitive claims по неоднозначному payload.

### Bookmarks / Notes / Tags

Inspector поддерживает packet annotations:

- bookmark packet;
- suspicious flag;
- tags;
- local note.

Sidebar содержит Bookmarks/annotated packets section:

- показывает packets с annotations;
- позволяет выбрать annotated packet;
- показывает первые tags/note preview;
- ограничивает список, чтобы sidebar не разрастался бесконечно.

Persistence/export behavior:

- annotations являются частью packet data;
- session export/import сохраняет annotations;
- redaction может применяться к annotations при export, если включены соответствующие правила.

### Logs

Bottom logs panel:

- показывает события приложения: connect/disconnect, received/sent frames, demo, proxy, errors;
- можно очистить logs;
- panel можно collapse/expand;
- collapsed mode показывает status strip/latest state;
- logs не являются raw traffic payload archive.

## 3. Core Logic Inventory

### Packet Model

Файл: `apps/desktop/src/models/packet.ts`.

Основные поля packet:

- `id`: уникальный packet ID;
- `connectionId`: связь с connection;
- `sessionId`: связь с session;
- `direction`: `inbound` или `outbound`;
- `timestamp`: Unix timestamp в миллисекундах;
- `payload`: исходная строка payload;
- `payloadKind`: `json`, `text` или `binary`;
- `sizeBytes`: размер payload в bytes;
- `sendSource`: `manual` или `replay`, если packet создан отправкой;
- `sourcePacketId`: исходный packet для replay;
- `annotations`: bookmark/note/suspicious/tags.

`createPacket`:

- определяет `payloadKind`;
- вычисляет byte size;
- создает timestamp/id;
- не переводит и не изменяет payload.

### Connection System

Файл: `apps/desktop/src/store/connection-store.ts`.

Direct connection работает через browser WebSocket API.

State:

- `status`;
- `socket`;
- `endpointUrl`;
- `connections`;
- `activeConnectionId`;
- `selectedConnectionId`;
- `activeSessionId`;
- `isConnected`;
- `error/errorDetails`;
- reconnect metadata.

Lifecycle:

1. Validate URL.
2. Interpolate active environment variables, если URL содержит `{{...}}`.
3. Создать/обновить connection entry.
4. Открыть WebSocket.
5. На `open` создать session и выставить connected.
6. На `message` создать inbound packet.
7. На manual send создать outbound packet.
8. На `close` закрыть session и выставить disconnected.
9. На `error` создать friendly error и toast/log.

Поддержка URL:

- `ws://`;
- `wss://`.

### Proxy System

Proxy Mode требует desktop/Tauri backend.

Frontend:

- `apps/desktop/src/components/proxy-mode-panel.tsx`;
- `apps/desktop/src/lib/tauri-commands.ts`;
- `apps/desktop/src/lib/proxy-events.ts`.

Rust backend:

- `apps/desktop/src-tauri/src/proxy.rs`;
- `commands.rs`;
- `app_state.rs`;
- `session.rs`;
- `errors.rs`.

Поведение:

- пользователь вводит target WebSocket URL;
- Rust backend запускает локальный proxy на `127.0.0.1` со свободным портом;
- UI показывает local proxy URL;
- внешний client подключается к local proxy URL;
- proxy соединяется с target URL;
- frames client -> target и target -> client пересылаются;
- text/binary/ping/pong/close/error события отправляются во frontend как proxy events;
- captured frames появляются в timeline.

Ограничения:

- browser dev mode не может открыть native proxy port;
- advanced auth/header rewriting не входит в текущий scope;
- proxy MVP alpha, не hardened enterprise gateway;
- proxy intended for local debugging.

### Demo Packet Generator

Файлы:

- `apps/desktop/src/demo/demo-stream.ts`;
- `apps/desktop/src/demo/investor-demo.ts`.

Synthetic packets:

- создаются локально;
- маркируются как demo;
- пишутся в packet/session stores;
- позволяют проверить timeline, inspector, filters, grouping и screenshots без сервера.

Start/stop/reset:

- start создает demo session/flow;
- stop прекращает генерацию;
- reset очищает demo walkthrough/progress.

### Store / State Management

SocketLens использует Zustand stores.

#### connection-store

Файл: `apps/desktop/src/store/connection-store.ts`.

Отвечает за:

- direct WebSocket lifecycle;
- connection history;
- active session id;
- send message;
- reconnect/disconnect;
- URL validation/interpolation;
- connection errors.

Persistence:

- recent connections сохраняются локально, если включена privacy setting.

#### packet-store

Файл: `apps/desktop/src/store/packet-store.ts`.

Отвечает за:

- packet list;
- batched add packet/add packets;
- clear packets;
- annotation updates;
- retention trimming.

Persistence:

- packets live in memory;
- сохраняются только через session export/save.

#### session-store

Файл: `apps/desktop/src/store/session-store.ts`.

Отвечает за:

- sessions;
- start/update/import/remove/rename;
- packet counters;
- bytes in/out;
- session status.

Persistence:

- runtime state in memory;
- session files через save/export/import.

#### settings-store

Файл: `apps/desktop/src/store/settings-store.ts`.

Отвечает за:

- theme/language/compact mode;
- auto-scroll default;
- packet/log retention;
- AI provider settings;
- privacy settings;
- onboarding state;
- filter presets/grouping/log panel collapsed settings.

Persistence:

- local storage/settings storage.

#### ui-store

Файл: `apps/desktop/src/store/ui-store.ts`.

Отвечает за:

- selected packet/session;
- packet selection mode;
- filters;
- demo state;
- logs;
- toasts;
- composer draft/mode/error;
- replay history/status.

Persistence:

- преимущественно runtime-only; settings-related pieces живут в settings store.

#### environment-store

Файл: `apps/desktop/src/store/environment-store.ts`.

Отвечает за:

- Local/Staging/Production environments;
- active environment;
- variables;
- secrets;
- profiles;
- import/export.

Persistence:

- localStorage key `socketlens.environments.v1`.

### Persistence

Локальное хранение:

- settings;
- onboarding progress/dismissed cards;
- recent connections;
- environments;
- log panel/filter/grouping preferences;
- session files только при явном save/export.

Session file behavior:

- сохраняется versioned JSON;
- import нормализует IDs и статусы;
- corrupted import обрабатывается через user-facing error;
- browser mode использует download/upload fallback.

### Filtering Engine

Файл: `apps/desktop/src/extensions/filter-engine.ts`.

Функции:

- text search;
- regex search;
- direction filters;
- payload kind filter;
- errors only;
- hide heartbeat;
- hide ping/pong;
- event query;
- min/max size;
- JSON-path-like smart conditions с `==` и `!=`.

Примеры поддерживаемого smart query:

```text
payload.type != "heartbeat"
payload.event == "chat.message"
payload.user.id == "123"
```

Производительность:

- parsed JSON payload cache через `WeakMap`;
- если filter inactive, возвращается исходный массив;
- invalid compiled filter безопасно дает пустой результат.

### Decoder System

Файл: `apps/desktop/src/extensions/packet-decoder.ts`.

Реализовано:

- `DecoderRegistry`;
- decoder priority;
- safe fallback;
- decoded summary for timeline/inspector;
- default decoders:
  - Socket.IO decoder;
  - GraphQL WS decoder;
  - JSON decoder;
  - raw binary decoder;
  - fallback decoder.

#### JSON Decoder

- Парсит JSON payload.
- Выводит event name из `type`, `event`, `action` или fallback `json.frame`.

#### Socket.IO Decoder

- Initial support.
- Определяет Engine.IO/Socket.IO frame prefixes.
- Извлекает packet type, namespace, ack id, event name, preview.
- При unknown frame fallback не ломает raw view.

#### GraphQL WS Decoder

- Initial support.
- Определяет common GraphQL WebSocket message shapes.
- Показывает operation name/kind, если они есть.
- Labels: connection init/ack, subscribe/start, next/data, error, complete, ping/pong.

#### Binary Decoder Foundation

- Raw binary decoder есть.
- MessagePack/BSON stubs существуют как documented future/foundation strategy, но не подключены как готовая поддержка.
- Protobuf/MessagePack/BSON полноценного декодирования сейчас нет.

### Replay Logic

Файлы:

- `apps/desktop/src/extensions/replay-strategy.ts`;
- `apps/desktop/src/components/manual-send-panel.tsx`;
- `apps/desktop/src/store/connection-store.ts`.

Validation:

- replay requires active WebSocket connection;
- replay requires selected outgoing packet or source payload;
- replay requires active session.

Payload:

- можно использовать original payload;
- можно передать edited payload override;
- replay creates history item and outbound packet with `sendSource: "replay"`.

Timing:

- delay controls применяются между frames при sequence replay.

### Redaction Logic

Файл: `apps/desktop/src/models/session-redaction.ts`.

Default redaction covers:

- authorization headers;
- cookies/set-cookie;
- API keys;
- access/refresh/id/auth tokens;
- password/secret/jwt fields;
- bearer tokens;
- token query params;
- URLs с credentials/query secrets.

Custom rules:

- одна строка = одно правило;
- literal text или `/regex/flags`;
- invalid custom rules показываются в preview/error state.

Export-only behavior:

- original live session не меняется автоматически;
- redaction применяется к save/export copy.

### Diagnostics Logic

Файл: `apps/desktop/src/lib/diagnostics-bundle.ts`.

Собирает:

- app metadata;
- runtime/platform/backend;
- active mode/environment;
- connection/proxy state;
- packet counters;
- retention info;
- AI provider state;
- session/reconnect/last error metadata.

Исключает:

- packet payloads;
- environment variable values;
- provider secrets;
- raw log messages.

### AI Provider Logic

Файлы:

- `apps/desktop/src/lib/ai/*`;
- `apps/desktop/src/extensions/ai-provider.ts`;
- `apps/desktop/src/components/ai-analysis-panel.tsx`.

Providers:

- disabled;
- OpenAI-compatible;
- Ollama;
- mock provider for tests/demo.

Actions:

- explain selected packet;
- explain sequence;
- summarize session;
- explain auth/reconnect flow;
- prompt foundation also includes detect event flow.

Prompt behavior:

- compact Markdown output;
- asks model to identify purpose/event type/suspicious errors/payload summary;
- requires uncertainty;
- tells model not to invent behavior/endpoints/credentials.

Error handling:

- provider validation;
- network/provider parse errors;
- user-facing errors and toasts;
- disabled/not configured state.

### Tauri Bridge

Файлы:

- `apps/desktop/src/lib/tauri-commands.ts`;
- `apps/desktop/src/lib/proxy-events.ts`;
- `apps/desktop/src/lib/tauri-runtime.ts`.

Frontend calls native commands through safe wrappers:

- `healthCheck`;
- `getBackendStatus`;
- `getProxyStatus`;
- `startProxy`;
- `stopProxy`.

Behavior:

- wrappers return `{ ok: true, data }` или `{ ok: false, error }`;
- browser dev mode returns `tauri_unavailable`;
- event listeners register only in Tauri runtime;
- cleanup prevents duplicate proxy listeners.

### Rust Backend

Файлы:

- `apps/desktop/src-tauri/src/app_state.rs`;
- `apps/desktop/src-tauri/src/commands.rs`;
- `apps/desktop/src-tauri/src/errors.rs`;
- `apps/desktop/src-tauri/src/proxy.rs`;
- `apps/desktop/src-tauri/src/session.rs`;
- `apps/desktop/src-tauri/src/lib.rs`;
- `apps/desktop/src-tauri/src/main.rs`.

Responsibilities:

- Tauri command registration;
- app state with proxy manager/session registry;
- local WebSocket proxy;
- proxy events to frontend;
- typed command errors;
- file/dialog/opener plugins.

No panics for user errors:

- invalid URL, bind failure, already running proxy и unavailable state возвращаются как typed errors.

## 4. File/Module Map

| File/folder | Responsibility | Related feature | Notes for contributors |
|---|---|---|---|
| `apps/desktop/src/App.tsx` | Главная композиция UI, wiring stores/actions/modals | App shell, commands, clear confirmation, session actions | Не перегружать новой domain logic |
| `apps/desktop/src/main.tsx` | React bootstrap | App startup, i18n init | Точка входа web/Tauri UI |
| `apps/desktop/src/index.css` | Global theme, density, typography | Visual system | Изменять осторожно, влияет на весь UI |
| `apps/desktop/src/components/` | React UI components | Sidebar, timeline, inspector, settings | Feature UI держать здесь или в feature-specific subfolder |
| `apps/desktop/src/components/layout/app-shell.tsx` | Desktop panel layout | Sidebar/center/inspector/logs | Базовая структура рабочего пространства |
| `apps/desktop/src/components/ui/` | Small reusable UI primitives | Button/input/badge/panel/textarea | Не добавлять business logic |
| `apps/desktop/src/config/app-metadata.ts` | Version/name/repo metadata | Diagnostics, top bar, docs | Синхронизировать с package/Cargo versions |
| `apps/desktop/src/config/runtime-defaults.ts` | Local echo constants | Quick connect | Используется для onboarding/direct flow |
| `apps/desktop/src/demo/` | Synthetic demo flows | Investor demo, demo stream | Demo-only; не смешивать с production proxy/direct logic |
| `apps/desktop/src/dev/` | Dev/demo payload helpers | Manual send examples | Только helpers/sample data |
| `apps/desktop/src/extensions/types.ts` | Extension contracts | Decoders, filters, exporters, AI, replay | Главный contract layer |
| `apps/desktop/src/extensions/packet-decoder.ts` | Decoder registry/default decoders | JSON, Socket.IO, GraphQL WS, fallback | Новый protocol decoder добавлять через этот contract |
| `apps/desktop/src/extensions/packet-analyzer.ts` | Packet classification | Badges/semantic analysis | Держать быстрым и deterministic |
| `apps/desktop/src/extensions/filter-engine.ts` | Default filter implementation | Search/filter timeline | Не мутировать packets |
| `apps/desktop/src/extensions/export-adapter.ts` | Export adapter foundation | Session/packet JSON export | Новый export format добавлять здесь |
| `apps/desktop/src/extensions/ai-provider.ts` | AI provider contract | AI integrations | AI всегда optional |
| `apps/desktop/src/extensions/replay-strategy.ts` | Replay validation/preparation | Replay | Не отправляет сам; готовит payload/history |
| `apps/desktop/src/extensions/plugin-registry.ts` | Local source-level plugin registry | Contributor extension foundation | Не remote marketplace |
| `apps/desktop/src/i18n/` | i18next setup/locales | RU/EN UI | Payload/session/raw traffic не переводить |
| `apps/desktop/src/lib/ai/` | AI providers/prompts/validation | AI panel/settings | No hardcoded keys |
| `apps/desktop/src/lib/tauri-commands.ts` | Safe invoke wrappers | Proxy/backend status | Browser fallback обязателен |
| `apps/desktop/src/lib/proxy-events.ts` | Tauri event listeners | Proxy packet capture | Следить за cleanup/listener duplication |
| `apps/desktop/src/lib/session-file-storage.ts` | Native/browser file IO | Save/load/export/import | UI вызывает через App callbacks |
| `apps/desktop/src/lib/diagnostics-bundle.ts` | Diagnostics serialization | Diagnostics copy/export | Sensitive data excluded |
| `apps/desktop/src/lib/asyncapi-export.ts` | Experimental AsyncAPI draft | Session export | Mark experimental |
| `apps/desktop/src/lib/packet-grouping.ts` | Grouping packets | Timeline grouping | Must preserve original packet order |
| `apps/desktop/src/lib/packet-relationships.ts` | Relationship inference | Inspector/timeline hints | Avoid false certainty |
| `apps/desktop/src/lib/flow-analysis.ts` | Flow detection | Flow summary | Keep understandable |
| `apps/desktop/src/lib/json-payload.ts` | JSON parsing helpers | Inspector/send/tests | Safe invalid JSON handling |
| `apps/desktop/src/lib/user-facing-errors.ts` | Friendly error model | Errors/toasts | No raw stack traces in UI |
| `apps/desktop/src/models/` | Domain types/helpers | Packets, sessions, settings, filters, environments | Keep pure and testable |
| `apps/desktop/src/store/connection-store.ts` | WebSocket direct lifecycle | Direct Mode | Owns socket side effects |
| `apps/desktop/src/store/packet-store.ts` | Packet list/batching/retention | Timeline/session stats | Performance sensitive |
| `apps/desktop/src/store/session-store.ts` | Sessions and stats | Session list/files | No file IO here |
| `apps/desktop/src/store/settings-store.ts` | Persisted settings/onboarding | Settings/i18n/privacy | Keep migrations compatible |
| `apps/desktop/src/store/ui-store.ts` | UI runtime state | Selection/logs/toasts/filters/replay | Avoid long-term persistence here |
| `apps/desktop/src/store/environment-store.ts` | Environments/profiles | Variables/interpolation | Local-first; no secret logging |
| `apps/desktop/src-tauri/src/app_state.rs` | Shared native state | Proxy/session registry | Rust backend state container |
| `apps/desktop/src-tauri/src/commands.rs` | Tauri commands | health/backend/proxy | Typed command boundary |
| `apps/desktop/src-tauri/src/errors.rs` | Backend command errors | Proxy/user errors | User errors must not panic |
| `apps/desktop/src-tauri/src/proxy.rs` | Rust WebSocket proxy | Proxy Mode | Async forwarding/capture |
| `apps/desktop/src-tauri/src/session.rs` | Native proxy sessions | Proxy counters/events | Keeps proxy IDs/stats |
| `apps/desktop/src-tauri/src/lib.rs` | Tauri builder/plugin setup | Desktop app | Registers commands/plugins/state |
| `apps/desktop/src-tauri/src/main.rs` | Native entrypoint | Desktop startup | Thin wrapper |
| `examples/echo-server/` | Node/ws echo server | Direct Mode QA | `npm run dev:echo` |
| `examples/socketio-demo/` | Socket.IO demo | Socket.IO decoder QA | `npm run dev:socketio` |
| `examples/chat-demo/` | Browser chat example | Demo/manual QA | Workspace example |
| `apps/landing/` | Marketing/landing package | Public site | Separate from desktop app |
| `docs/` | Project docs | Onboarding/contribution/release | Keep commands aligned with package scripts |
| `docs/assets/` | Branding/screenshots/release assets | README/GitHub presentation | Screenshots should reflect real app states |
| `launchers/` | One-click launch scripts | Windows/macOS/Linux launch UX | Use real npm scripts only |
| `scripts/` | Repo maintenance scripts | clean/lint/encoding/release prep | Root npm scripts call these |

## 5. User Workflows

### First run

Steps:

1. Run `npm install`.
2. Run `npm run dev`.
3. Open `http://127.0.0.1:1420/`.
4. Read Quick Start panel in sidebar.
5. Start Investor Demo or connect echo-server.

Expected result:

- app opens in browser dev mode;
- sidebar explains Demo/Direct/Proxy;
- no backend proxy is available until desktop/Tauri mode.

Common failure:

- port `1420` already in use.

Fix:

- close the existing Vite process/window or stop the terminal that started it.

### Demo mode

Steps:

1. Click **Start Investor Demo**.
2. Watch packets appear in timeline.
3. Select a highlighted packet.
4. Open Pretty/Raw/Metadata in inspector.
5. Reset demo if needed.

Expected result:

- synthetic packets appear;
- inspector shows payload/metadata;
- demo traffic is labeled as simulated/demo.

Common failure:

- Start button disabled because an active WebSocket connection exists.

Fix:

- disconnect first.

### Direct echo-server connection

Steps:

1. Run `npm run dev:echo` in a second terminal.
2. In SocketLens click **Connect echo** or create connection to `ws://127.0.0.1:17787`.
3. Wait for connected status.
4. Watch welcome/periodic packets.

Expected result:

- connection status becomes connected;
- inbound packets appear in timeline;
- logs record received frames.

Common failure:

- connection refused.

Fix:

- verify `npm run dev:echo` is running and port `17787` is free.

### Manual send

Steps:

1. Connect to echo-server.
2. Open Manual Send.
3. Choose `Ping` or enter `{"command":"ping"}`.
4. Click send.

Expected result:

- outbound packet appears;
- echo-server returns inbound response;
- sent frame enters replay history.

Common failure:

- send button disabled.

Fix:

- connect first.

### Replay selected packet

Steps:

1. Send an outgoing packet.
2. Select outgoing packet in timeline or choose it from previous outgoing.
3. Optionally edit payload.
4. Click replay/replay edited.

Expected result:

- new outbound replay packet appears;
- source marker/history item is recorded;
- echo-server response appears if server is running.

Common failure:

- replay blocked with no connection.

Fix:

- reconnect Direct Mode endpoint.

### Inspect payload

Steps:

1. Select any packet.
2. Use Pretty/Raw/Metadata tabs.
3. Click copy or large view.

Expected result:

- Pretty formats JSON;
- Raw preserves original text;
- Metadata shows IDs/timestamps/size;
- large modal supports horizontal scroll for long JSON lines.

Common failure:

- invalid JSON cannot format.

Fix:

- use Raw view; payload is still available.

### Export sanitized session

Steps:

1. Capture or demo some packets.
2. Open Session Files.
3. Keep redaction enabled.
4. Review preview.
5. Save/export.

Expected result:

- JSON file downloads/saves;
- sensitive tokens/cookies/auth-like values are redacted in exported copy.

Common failure:

- custom regex invalid.

Fix:

- correct or remove the custom rule.

### Use environments

Steps:

1. Open Settings.
2. Open Environments.
3. Choose Local/Staging/Production.
4. Edit `base_url` or profiles.
5. Use a profile URL like `{{base_url}}`.

Expected result:

- variables interpolate before connection;
- secret values are hidden in UI preview.

Common failure:

- unresolved variable.

Fix:

- add the missing variable or remove the `{{...}}` token.

### Copy diagnostics

Steps:

1. Open Diagnostics in sidebar.
2. Click Copy diagnostics or Export.

Expected result:

- JSON bundle contains app/runtime/status/counters;
- payloads and secrets are excluded.

Common failure:

- clipboard blocked by browser.

Fix:

- use Export diagnostics instead.

### Use command palette

Steps:

1. Press `Ctrl+K` / `Cmd+K`.
2. Type an action name.
3. Press Enter.

Expected result:

- enabled action runs;
- disabled action shows a reason.

Common failure:

- action disabled because connection/session/packet is missing.

Fix:

- follow disabled reason, for example connect first or select a packet.

## 6. Contributor Extension Guide Summary

Where to add new work:

- New UI feature: `apps/desktop/src/components/`, with state in an existing store only if needed.
- New protocol decoder: implement `PacketDecoder` in `apps/desktop/src/extensions/packet-decoder.ts` or a dedicated extension file, then register it through `defaultPacketDecoders` or a local plugin.
- New filter: implement `FilterEngine` or extend `models/filter-state.ts` + `extensions/filter-engine.ts`.
- New AI provider: implement `AIProvider` in `apps/desktop/src/lib/ai/providers/` and expose settings/validation explicitly.
- New exporter: implement `ExportAdapter` in `apps/desktop/src/extensions/export-adapter.ts`.
- New replay behavior: implement `ReplayStrategy` without coupling it to UI.
- New Rust/native capability: add typed command in `src-tauri/src/commands.rs`, typed error in `errors.rs`, safe frontend wrapper in `lib/tauri-commands.ts`.

What not to touch unless necessary:

- Do not put protocol parsing in React components.
- Do not mutate packet payloads in filters/decoders.
- Do not send AI data automatically.
- Do not add remote plugin execution.
- Do not mix demo generator with production proxy/direct logic.
- Do not bypass redaction for share/export flows.
- Do not rely on browser-only APIs for desktop-only proxy behavior without fallback.

How to add a new decoder without touching core UI:

1. Implement the `PacketDecoder` contract.
2. Give it a stable `id`, `label`, and priority.
3. Make `canDecode` fast and safe.
4. Return decoded event name/protocol/metadata from `decode`.
5. Add tests with known payloads and fallback cases.
6. Register the decoder in the decoder list or local plugin.
7. Timeline and inspector will consume decoded summaries through existing helpers.

## 7. Alpha Limitations

Current limitations:

- Project is `v0.1.0-alpha`, not stable commercial software.
- Desktop builds are unsigned.
- Proxy Mode requires Tauri desktop runtime; browser dev mode cannot accept external proxy clients.
- Proxy Mode is local debugging MVP, not enterprise proxy/gateway.
- Advanced proxy features such as header rewriting/auth rewriting are not implemented.
- Socket.IO support is initial decoding, not full Socket.IO debugging suite.
- GraphQL WS support is initial message-shape detection, not full GraphQL inspector.
- AsyncAPI export is experimental inferred draft.
- MessagePack/BSON/Protobuf are not implemented as real decoders yet.
- Plugin architecture is source-level only; no plugin marketplace/runtime remote execution.
- AI is optional, disabled by default, and may be wrong.
- No telemetry by default.
- Captured packets stay in memory unless user saves/exports a session.
- Large sessions depend on packet retention settings and local machine resources.

## 8. Verification Checklist

Use real root package scripts only.

Setup:

- [ ] Run `npm install`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run test`.
- [ ] Run `npm run build`.
- [ ] Run `npm run check` before release freeze.

App startup:

- [ ] Run `npm run dev`.
- [ ] App opens at `http://127.0.0.1:1420/`.
- [ ] Quick Start/onboarding appears on a clean profile.

Demo:

- [ ] Click Start Investor Demo.
- [ ] Demo packets appear.
- [ ] Select packet and inspect Pretty/Raw/Metadata.
- [ ] Demo reset works.

Direct Mode:

- [ ] Run `npm run dev:echo`.
- [ ] Connect to `ws://127.0.0.1:17787`.
- [ ] Packets appear in timeline.
- [ ] Manual send `{"command":"ping"}` works.
- [ ] Echo response appears.

Selection/latest behavior:

- [ ] Select an older packet.
- [ ] Let new packets arrive.
- [ ] Selected packet does not auto-jump.
- [ ] New packet indicator appears.
- [ ] Go to latest moves back to newest packet.

Timeline:

- [ ] Search/filter works.
- [ ] Invalid regex/smart filter does not crash UI.
- [ ] Grouping on/off works.
- [ ] Clear opens confirmation.
- [ ] Confirm clears packets; cancel keeps packets.

Inspector:

- [ ] Copy payload works.
- [ ] Large payload view opens.
- [ ] Large view copy/close works.
- [ ] Long JSON line scrolls horizontally.

Sessions:

- [ ] Save/export session works.
- [ ] Import/upload session works.
- [ ] Redaction preview works.
- [ ] Unsafe export warning appears when redaction is disabled and sensitive data is detected.
- [ ] Experimental AsyncAPI draft export is labeled as experimental.

Environments:

- [ ] Switch Local/Staging/Production.
- [ ] `{{base_url}}` interpolates.
- [ ] Secret values are hidden.
- [ ] Import/export environment file works.

Diagnostics:

- [ ] Copy diagnostics works.
- [ ] Export diagnostics works.
- [ ] Bundle excludes payloads/secrets.

Command Palette:

- [ ] `Ctrl+K` / `Cmd+K` opens palette.
- [ ] Enabled action runs.
- [ ] Disabled action explains why.

Settings/i18n:

- [ ] Russian UI works.
- [ ] English UI works.
- [ ] Language persists after reload.
- [ ] Packet payload/raw messages are not translated.
- [ ] Settings persist after reload.

AI:

- [ ] Disabled state is clear.
- [ ] Provider not configured state is clear.
- [ ] Demo explanation does not call external provider.
- [ ] Real AI action sends data only after click.

Proxy Mode:

- [ ] Run desktop mode with `npm run dev:desktop`.
- [ ] Start echo-server with `npm run dev:echo`.
- [ ] Start proxy to `ws://127.0.0.1:17787`.
- [ ] External client connects to local proxy URL.
- [ ] Proxy packets appear in timeline.
- [ ] Stop proxy cleans up state.


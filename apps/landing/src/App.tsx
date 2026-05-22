import {
  Activity,
  Bot,
  Braces,
  CheckCircle2,
  CircleDot,
  Clock3,
  Code2,
  Download,
  Eye,
  FileJson,
  Github,
  GitPullRequest,
  Lock,
  Play,
  PlugZap,
  Radio,
  RotateCcw,
  Search,
  ServerCog,
  ShieldCheck,
  Sparkles,
  Terminal,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

type Feature = {
  accent: string;
  description: string;
  icon: LucideIcon;
  title: string;
};

type RoadmapItem = {
  state: "Now" | "Next" | "Later";
  text: string;
};

const features: Feature[] = [
  {
    accent: "text-cyan",
    description: "Inspect inbound and outbound frames with event names, sizes, status, and timing.",
    icon: Activity,
    title: "Packet timeline",
  },
  {
    accent: "text-green",
    description: "Run direct connections, replay payloads, and test against a local echo server.",
    icon: PlugZap,
    title: "Direct debugging",
  },
  {
    accent: "text-amber",
    description: "Start a local Rust proxy and point external clients at a capture URL.",
    icon: ServerCog,
    title: "Proxy mode",
  },
  {
    accent: "text-rose",
    description: "Save sessions, load them later, and keep AI analysis optional and explicit.",
    icon: FileJson,
    title: "Portable sessions",
  },
];

const roadmap: RoadmapItem[] = [
  { state: "Now", text: "Direct mode, proxy MVP, replay, sessions, and guided demo." },
  { state: "Next", text: "Protocol presets, better diffing, and session collaboration exports." },
  { state: "Later", text: "Signed releases, plugin hooks, and richer offline analysis." },
];

const demoHighlights: Feature[] = [
  {
    accent: "text-cyan",
    description: "Synthetic traffic, clearly marked as demo.",
    icon: CheckCircle2,
    title: "No backend required",
  },
  {
    accent: "text-cyan",
    description: "Packets arrive in sequence for a realistic session.",
    icon: Clock3,
    title: "Live timeline",
  },
  {
    accent: "text-cyan",
    description: "Shows how an outgoing packet can be reused.",
    icon: RotateCcw,
    title: "Replay example",
  },
  {
    accent: "text-cyan",
    description: "AI demo result is offline when provider is disabled.",
    icon: ShieldCheck,
    title: "Privacy copy",
  },
];

const openSourceHighlights: Feature[] = [
  {
    accent: "text-green",
    description: "Tauri, Rust, React, TypeScript, TailwindCSS, and Zustand in a readable monorepo.",
    icon: Code2,
    title: "Clean architecture",
  },
  {
    accent: "text-green",
    description: "No telemetry by default. AI is disabled until a user configures and clicks an action.",
    icon: Lock,
    title: "Local-first privacy",
  },
  {
    accent: "text-green",
    description: "CI, release docs, tests, security notes, and examples are part of the repo.",
    icon: GitPullRequest,
    title: "Contributor ready",
  },
];

const packetRows = [
  ["IN", "auth.session.ready", "1.2 KB", "ok", "text-green"],
  ["OUT", "chat.message.send", "842 B", "json", "text-cyan"],
  ["IN", "notification.created", "614 B", "new", "text-amber"],
  ["IN", "server.error", "366 B", "warn", "text-rose"],
  ["OUT", "heartbeat.ping", "28 B", "ping", "text-cyan"],
];

export function App() {
  return (
    <main className="min-h-screen overflow-hidden bg-carbon text-frost">
      <Header />
      <Hero />
      <Problem />
      <Features />
      <Screenshots />
      <DemoMode />
      <OpenSource />
      <GithubCta />
      <Roadmap />
      <Footer />
    </main>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-carbon/82 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <a className="flex items-center gap-3" href="#top" aria-label="SocketLens home">
          <span className="flex size-9 items-center justify-center rounded-md border border-line bg-white/[0.06]">
            <Eye className="size-5 text-cyan" aria-hidden="true" />
          </span>
          <span className="text-sm font-semibold">SocketLens</span>
        </a>
        <nav className="hidden items-center gap-7 text-sm text-mist md:flex" aria-label="Main navigation">
          <a className="transition hover:text-white" href="#features">
            Features
          </a>
          <a className="transition hover:text-white" href="#demo">
            Demo
          </a>
          <a className="transition hover:text-white" href="#roadmap">
            Roadmap
          </a>
        </nav>
        <a
          className="inline-flex h-10 items-center gap-2 rounded-md border border-line bg-white/[0.06] px-4 text-sm font-medium text-white transition hover:border-white/25 hover:bg-white/[0.10]"
          href="https://github.com/socketlens/socketlens"
        >
          <Github className="size-4" aria-hidden="true" />
          GitHub
        </a>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section id="top" className="relative min-h-[86svh] overflow-hidden border-b border-line">
      <HeroScene />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,#050506_0%,rgba(5,5,6,0.84)_38%,rgba(5,5,6,0.28)_100%)]" />
      <div className="relative mx-auto flex min-h-[86svh] max-w-7xl items-center px-5 py-20 sm:px-8">
        <div className="max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-white/[0.06] px-3 py-1.5 text-xs text-mist">
            <CircleDot className="size-3 text-green" aria-hidden="true" />
            Desktop WebSocket debugging, built in the open
          </div>
          <h1 className="max-w-3xl text-5xl font-semibold leading-[1.02] text-white sm:text-6xl lg:text-7xl">
            SocketLens
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-mist sm:text-xl">
            A professional desktop debugger for realtime apps. Inspect WebSocket traffic, replay frames, save sessions,
            and demo the workflow without setup.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-white px-5 text-sm font-semibold text-black transition hover:bg-zinc-200"
              href="https://github.com/socketlens/socketlens"
            >
              <Github className="size-4" aria-hidden="true" />
              View on GitHub
            </a>
            <a
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-line bg-white/[0.06] px-5 text-sm font-semibold text-white transition hover:border-white/25 hover:bg-white/[0.10]"
              href="#demo"
            >
              <Play className="size-4" aria-hidden="true" />
              See demo mode
            </a>
          </div>
          <div className="mt-9 grid max-w-2xl grid-cols-3 gap-3 text-sm text-mist">
            <Metric value="10k+" label="retained packets" />
            <Metric value="0" label="telemetry by default" />
            <Metric value="AGPL" label="open-source" />
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroScene() {
  return (
    <div className="pointer-events-none absolute inset-y-0 right-[-12rem] hidden w-[72rem] items-center lg:flex">
      <div className="relative h-[42rem] w-[62rem] rotate-[-2deg] rounded-lg border border-line bg-ink shadow-glow">
        <div className="flex h-12 items-center justify-between border-b border-line px-4">
          <div className="flex items-center gap-2">
            <span className="size-3 rounded-full bg-rose" />
            <span className="size-3 rounded-full bg-amber" />
            <span className="size-3 rounded-full bg-green" />
          </div>
          <div className="font-mono text-xs text-mist">ws://127.0.0.1:17787</div>
        </div>
        <div className="grid h-[calc(100%-3rem)] grid-cols-[15rem_1fr_19rem]">
          <div className="border-r border-line bg-white/[0.03] p-4">
            <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase text-mist">
              <Radio className="size-4 text-green" aria-hidden="true" />
              Sessions
            </div>
            {["Investor demo", "Local echo", "Proxy capture"].map((item, index) => (
              <div
                key={item}
                className={`mb-2 rounded-md border px-3 py-3 text-sm ${
                  index === 0 ? "border-cyan/40 bg-cyan/10 text-white" : "border-line bg-white/[0.04] text-mist"
                }`}
              >
                {item}
              </div>
            ))}
          </div>
          <div className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase text-mist">Packet timeline</p>
                <p className="text-sm text-white">Realtime chat app traffic</p>
              </div>
              <div className="rounded-md border border-line bg-white/[0.05] px-3 py-1.5 text-xs text-mist">Live</div>
            </div>
            <PacketTable />
          </div>
          <div className="border-l border-line bg-white/[0.03] p-4">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
              <Braces className="size-4 text-cyan" aria-hidden="true" />
              Payload
            </div>
            <pre className="h-[28rem] overflow-hidden rounded-md border border-line bg-black/40 p-4 font-mono text-xs leading-6 text-mist">
{`{
  "type": "chat.message",
  "roomId": "launch-room",
  "user": "Mira",
  "text": "The deploy is live",
  "latencyMs": 42
}`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

function PacketTable() {
  return (
    <div className="overflow-hidden rounded-md border border-line bg-black/30">
      {packetRows.map(([direction, event, size, status, color]) => (
        <div key={event} className="grid grid-cols-[4rem_1fr_4rem_4rem] items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
          <span className={`font-mono text-xs ${color}`}>{direction}</span>
          <span className="truncate font-mono text-sm text-white">{event}</span>
          <span className="font-mono text-xs text-mist">{size}</span>
          <span className="rounded border border-line bg-white/[0.05] px-2 py-1 text-center font-mono text-xs text-mist">
            {status}
          </span>
        </div>
      ))}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-white/[0.05] px-4 py-3">
      <div className="text-xl font-semibold text-white">{value}</div>
      <div className="mt-1 text-xs text-mist">{label}</div>
    </div>
  );
}

function Problem() {
  return (
    <Section id="problem" eyebrow="Problem" title="Realtime bugs hide between frames.">
      <div className="grid gap-3 md:grid-cols-3">
        {[
          ["Browser logs are noisy", "Important event order gets lost in console output and ad hoc debug prints."],
          ["Payloads are hard to compare", "Auth, heartbeat, notifications, and chat events all arrive in different shapes."],
          ["Demos need setup", "Investors and contributors should see the product working before they configure a server."],
        ].map(([title, description]) => (
          <article key={title} className="rounded-lg border border-line bg-white/[0.05] p-5 shadow-soft">
            <h3 className="text-base font-semibold text-white">{title}</h3>
            <p className="mt-3 text-sm leading-6 text-mist">{description}</p>
          </article>
        ))}
      </div>
    </Section>
  );
}

function Features() {
  return (
    <Section id="features" eyebrow="Features" title="A debugger shaped around realtime work.">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {features.map(({ accent, description, icon: Icon, title }) => (
          <article key={title} className="rounded-lg border border-line bg-panel p-5">
            <Icon className={`size-5 ${accent}`} aria-hidden="true" />
            <h3 className="mt-5 text-base font-semibold text-white">{title}</h3>
            <p className="mt-3 text-sm leading-6 text-mist">{description}</p>
          </article>
        ))}
      </div>
    </Section>
  );
}

function Screenshots() {
  return (
    <Section id="screenshots" eyebrow="Screenshots" title="Designed like a serious developer tool.">
      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <article className="rounded-lg border border-line bg-ink p-3 shadow-glow">
          <div className="flex items-center justify-between border-b border-line px-3 pb-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Terminal className="size-4 text-cyan" aria-hidden="true" />
              Packet workspace
            </div>
            <span className="font-mono text-xs text-green">connected</span>
          </div>
          <div className="grid gap-3 p-3 md:grid-cols-[1fr_18rem]">
            <PacketTable />
            <div className="rounded-md border border-line bg-black/35 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                <Search className="size-4 text-amber" aria-hidden="true" />
                Filters
              </div>
              {["incoming", "json only", "errors only", "hide heartbeat"].map((filter) => (
                <div key={filter} className="mb-2 rounded-md border border-line bg-white/[0.05] px-3 py-2 text-sm text-mist">
                  {filter}
                </div>
              ))}
            </div>
          </div>
        </article>
        <article className="rounded-lg border border-line bg-panel p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Bot className="size-4 text-green" aria-hidden="true" />
            AI explain
          </div>
          <p className="mt-4 text-sm leading-6 text-mist">
            Optional and explicit. SocketLens sends selected packet context only after the user clicks explain.
          </p>
          <div className="mt-5 rounded-md border border-line bg-black/35 p-4 text-sm leading-6 text-mist">
            <p className="font-semibold text-white">Likely purpose</p>
            <p className="mt-2">This packet appears to acknowledge a chat event and update room state.</p>
          </div>
        </article>
      </div>
    </Section>
  );
}

function DemoMode() {
  return (
    <Section id="demo" eyebrow="Demo mode" title="Open the app and see the story immediately.">
      <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-lg border border-line bg-panel p-6">
          <Sparkles className="size-6 text-amber" aria-hidden="true" />
          <h3 className="mt-5 text-xl font-semibold text-white">Investor Demo Mode</h3>
          <p className="mt-4 text-sm leading-6 text-mist">
            A guided offline session shows auth, chat, heartbeat, notifications, errors, replay, and an AI explain
            sample without setup.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {["Auth flow", "Live packets", "Replay", "Offline AI"].map((item) => (
              <span key={item} className="rounded-full border border-line bg-white/[0.05] px-3 py-1.5 text-xs text-mist">
                {item}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-line bg-ink p-4 shadow-soft">
          <div className="grid gap-3 sm:grid-cols-2">
            {demoHighlights.map(({ description, icon: Icon, title }) => (
              <div key={title} className="rounded-md border border-line bg-white/[0.05] p-4">
                <Icon className="size-5 text-cyan" aria-hidden="true" />
                <h4 className="mt-4 text-sm font-semibold text-white">{title}</h4>
                <p className="mt-2 text-sm leading-6 text-mist">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

function OpenSource() {
  return (
    <Section id="open-source" eyebrow="Open source" title="Built for developers who want to inspect the stack.">
      <div className="grid gap-4 md:grid-cols-3">
        {openSourceHighlights.map(({ description, icon: Icon, title }) => (
          <article key={title} className="rounded-lg border border-line bg-white/[0.05] p-5">
            <Icon className="size-5 text-green" aria-hidden="true" />
            <h3 className="mt-5 text-base font-semibold text-white">{title}</h3>
            <p className="mt-3 text-sm leading-6 text-mist">{description}</p>
          </article>
        ))}
      </div>
    </Section>
  );
}

function GithubCta() {
  return (
    <section className="border-y border-line bg-white/[0.04]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-12 sm:px-8 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase text-cyan">GitHub CTA</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold leading-tight text-white">
            Clone it, run it, and debug realtime traffic locally.
          </h2>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <a
            className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-white px-5 text-sm font-semibold text-black transition hover:bg-zinc-200"
            href="https://github.com/socketlens/socketlens"
          >
            <Github className="size-4" aria-hidden="true" />
            Star on GitHub
          </a>
          <a
            className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-line bg-white/[0.05] px-5 text-sm font-semibold text-white transition hover:border-white/25 hover:bg-white/[0.10]"
            href="https://github.com/socketlens/socketlens#quick-start"
          >
            <Download className="size-4" aria-hidden="true" />
            Quick start
          </a>
        </div>
      </div>
    </section>
  );
}

function Roadmap() {
  return (
    <Section id="roadmap" eyebrow="Roadmap" title="Focused, useful, and shippable.">
      <div className="grid gap-3 md:grid-cols-3">
        {roadmap.map((item) => (
          <article key={item.state} className="rounded-lg border border-line bg-panel p-5">
            <span className="rounded-full border border-line bg-white/[0.06] px-3 py-1 text-xs font-semibold text-cyan">
              {item.state}
            </span>
            <p className="mt-5 text-sm leading-6 text-mist">{item.text}</p>
          </article>
        ))}
      </div>
    </Section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 text-sm text-mist sm:px-8 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Eye className="size-4 text-cyan" aria-hidden="true" />
          <span>SocketLens - AGPL licensed WebSocket debugging.</span>
        </div>
        <div className="flex gap-5">
          <a className="transition hover:text-white" href="https://github.com/socketlens/socketlens">
            GitHub
          </a>
          <a className="transition hover:text-white" href="https://github.com/socketlens/socketlens/blob/main/docs/privacy.md">
            Privacy
          </a>
          <a className="transition hover:text-white" href="https://github.com/socketlens/socketlens/blob/main/ROADMAP.md">
            Roadmap
          </a>
        </div>
      </div>
    </footer>
  );
}

function Section({
  children,
  eyebrow,
  id,
  title,
}: {
  children: ReactNode;
  eyebrow: string;
  id: string;
  title: string;
}) {
  return (
    <section id={id} className="border-b border-line">
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="mb-10 max-w-3xl">
          <p className="text-sm font-semibold uppercase text-cyan">{eyebrow}</p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight text-white sm:text-4xl">{title}</h2>
        </div>
        {children}
      </div>
    </section>
  );
}

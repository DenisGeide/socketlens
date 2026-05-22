import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const workspaceArgIndex = args.indexOf("--workspace");
const workspaceScope = workspaceArgIndex >= 0 ? args[workspaceArgIndex + 1] : null;
const failures = [];

const rootPackage = readJson("package.json");
const workspacePackages = [
  { path: "apps/desktop/package.json", requiredScripts: ["dev", "dev:desktop", "build", "build:desktop", "typecheck", "test", "lint", "clean"] },
  { path: "apps/landing/package.json", requiredScripts: ["dev", "build", "typecheck", "lint", "clean"] },
  { path: "examples/echo-server/package.json", requiredScripts: ["dev", "build", "typecheck", "lint", "clean"] },
  { path: "examples/chat-demo/package.json", requiredScripts: ["dev", "build", "typecheck", "lint", "clean"] },
];

if (workspaceScope) {
  lintWorkspace(workspaceScope);
} else {
  lintRoot();
  for (const workspacePackage of workspacePackages) {
    lintWorkspace(path.dirname(workspacePackage.path));
  }
  lintDocsAndWorkflows();
  lintHardcodedSecrets();
  lintNetworkAndTelemetry();
}

if (failures.length > 0) {
  console.error("SocketLens lint failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(workspaceScope ? `Lint passed for ${workspaceScope}.` : "Lint passed.");

function lintRoot() {
  const requiredRootScripts = [
    "dev",
    "dev:desktop",
    "dev:landing",
    "dev:echo",
    "build",
    "build:desktop",
    "build:landing",
    "typecheck",
    "test",
    "lint",
    "check",
    "clean",
    "release:prepare",
    "release:build",
  ];

  if (rootPackage.packageManager !== "npm@11.9.0") {
    failures.push('Root package.json must declare "packageManager": "npm@11.9.0".');
  }

  if (!existsSync(path.join(rootDir, "package-lock.json"))) {
    failures.push("package-lock.json must be present because SocketLens uses npm.");
  }

  for (const forbiddenLockfile of ["pnpm-lock.yaml", "yarn.lock", "bun.lock", "bun.lockb"]) {
    if (existsSync(path.join(rootDir, forbiddenLockfile))) {
      failures.push(`${forbiddenLockfile} must not be committed while npm is the documented package manager.`);
    }
  }

  for (const scriptName of requiredRootScripts) {
    if (!rootPackage.scripts?.[scriptName]) {
      failures.push(`Root package.json is missing script "${scriptName}".`);
    }
  }

  for (const oldScriptName of ["desktop:dev", "desktop:build", "example:echo", "example:chat"]) {
    if (rootPackage.scripts?.[oldScriptName]) {
      failures.push(`Root package.json still contains old duplicate script "${oldScriptName}".`);
    }
  }
}

function lintWorkspace(workspacePath) {
  const workspacePackage = workspacePackages.find((item) => path.dirname(item.path) === workspacePath);

  if (!workspacePackage) {
    failures.push(`Unknown workspace lint scope: ${workspacePath}.`);
    return;
  }

  const packageJson = readJson(workspacePackage.path);

  for (const scriptName of workspacePackage.requiredScripts) {
    if (!packageJson.scripts?.[scriptName]) {
      failures.push(`${workspacePackage.path} is missing script "${scriptName}".`);
    }
  }

  for (const oldScriptName of ["tauri:dev", "tauri:build"]) {
    if (packageJson.scripts?.[oldScriptName]) {
      failures.push(`${workspacePackage.path} still contains old duplicate script "${oldScriptName}".`);
    }
  }
}

function lintDocsAndWorkflows() {
  const filesToScan = [
    "README.md",
    "ROADMAP.md",
    "CHANGELOG.md",
    "CONTRIBUTING.md",
    "SECURITY.md",
    "CODE_OF_CONDUCT.md",
    ...listRepositoryFiles(path.join(rootDir, "docs"), new Set())
      .filter((file) => path.extname(file) === ".md")
      .map((file) => path.relative(rootDir, file).replaceAll("\\", "/")),
    ...listRepositoryFiles(path.join(rootDir, ".github"), new Set())
      .filter((file) => [".md", ".yml", ".yaml"].includes(path.extname(file)))
      .map((file) => path.relative(rootDir, file).replaceAll("\\", "/")),
    ...listRepositoryFiles(rootDir, new Set([".git", "dist", "gen", "node_modules", "target"]))
      .filter((file) => {
        const relativePath = path.relative(rootDir, file).replaceAll("\\", "/");
        const extension = path.extname(file);

        return (
          !["package-lock.json", "scripts/lint.mjs"].includes(relativePath) &&
          [".html", ".json", ".mjs", ".rs", ".toml", ".ts", ".tsx"].includes(extension)
        );
      })
      .map((file) => path.relative(rootDir, file).replaceAll("\\", "/")),
  ];
  const uniqueFilesToScan = [...new Set(filesToScan)];
  const forbiddenCommandReferences = [
    "npm run desktop:dev",
    "npm run desktop:build",
    "npm run example:echo",
    "npm run example:chat",
    "npm run tauri:dev",
    "npm run tauri:build",
    "pnpm install",
    "pnpm run",
    "yarn install",
    "yarn run",
  ];

  for (const file of uniqueFilesToScan) {
    const contents = readText(file);

    for (const forbiddenReference of forbiddenCommandReferences) {
      if (contents.includes(forbiddenReference)) {
        failures.push(`${file} contains outdated or unsupported command reference: ${forbiddenReference}`);
      }
    }
  }

  for (const buildOutput of ["apps/desktop/dist", "apps/landing/dist", "examples/chat-demo/dist", "examples/echo-server/dist"]) {
    if (existsSync(path.join(rootDir, buildOutput))) {
      failures.push(`${buildOutput} is generated build output. Run npm run clean before committing.`);
    }
  }
}

function lintHardcodedSecrets() {
  const ignoredDirectories = new Set([".git", "dist", "gen", "node_modules", "target"]);
  const scannedExtensions = new Set([
    ".css",
    ".html",
    ".js",
    ".json",
    ".md",
    ".mjs",
    ".rs",
    ".toml",
    ".ts",
    ".tsx",
    ".yaml",
    ".yml",
  ]);
  const ignoredFiles = new Set(["package-lock.json"]);
  const secretPatterns = [
    { label: "private key block", pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
    { label: "GitHub token", pattern: /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/ },
    { label: "OpenAI-style API key", pattern: /\bsk-[A-Za-z0-9]{20,}\b/ },
    { label: "Slack token", pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/ },
    { label: "Stripe live secret key", pattern: /\bsk_live_[A-Za-z0-9]{6,}\b/ },
    { label: "Stripe test secret key", pattern: /\bsk_test_[A-Za-z0-9]{6,}\b/ },
  ];

  for (const file of listRepositoryFiles(rootDir, ignoredDirectories)) {
    const relativePath = path.relative(rootDir, file).replaceAll("\\", "/");

    if (ignoredFiles.has(path.basename(file)) || !scannedExtensions.has(path.extname(file))) {
      continue;
    }

    const contents = readFileSync(file, "utf8");

    for (const { label, pattern } of secretPatterns) {
      if (pattern.test(contents)) {
        failures.push(`${relativePath} contains a possible hardcoded secret (${label}). Use environment/local settings instead.`);
      }
    }
  }
}

function lintNetworkAndTelemetry() {
  const telemetryPackages = new Set([
    "@amplitude/analytics-browser",
    "@sentry/browser",
    "@sentry/react",
    "@segment/analytics-next",
    "amplitude-js",
    "mixpanel-browser",
    "plausible-tracker",
    "posthog-js",
    "react-ga",
    "react-ga4",
  ]);
  const packageFiles = ["package.json", ...workspacePackages.map((workspacePackage) => workspacePackage.path)];

  for (const packageFile of packageFiles) {
    const packageJson = readJson(packageFile);
    const dependencyNames = [
      ...Object.keys(packageJson.dependencies ?? {}),
      ...Object.keys(packageJson.devDependencies ?? {}),
      ...Object.keys(packageJson.optionalDependencies ?? {}),
    ];

    for (const dependencyName of dependencyNames) {
      if (telemetryPackages.has(dependencyName)) {
        failures.push(`${packageFile} includes telemetry/crash-reporting package "${dependencyName}". Document and approve telemetry before adding it.`);
      }
    }
  }

  const allowedNetworkUses = new Map([
    ["apps/desktop/src/lib/ai/fetch-with-timeout.ts", new Set(["fetch"])],
    ["apps/desktop/src/store/connection-store.ts", new Set(["websocket"])],
    ["examples/chat-demo/src/main.tsx", new Set(["websocket"])],
  ]);
  const ignoredDirectories = new Set([".git", "dist", "gen", "node_modules", "target"]);
  const scannedExtensions = new Set([".js", ".mjs", ".ts", ".tsx"]);
  const networkPatterns = [
    { key: "beacon", label: "navigator.sendBeacon", pattern: /navigator\.sendBeacon\s*\(/ },
    { key: "eventsource", label: "EventSource", pattern: /new\s+EventSource\s*\(/ },
    { key: "fetch", label: "fetch", pattern: /\bfetch\s*\(/ },
    { key: "websocket", label: "WebSocket client", pattern: /new\s+WebSocket\s*\(/ },
    { key: "xhr", label: "XMLHttpRequest", pattern: /new\s+XMLHttpRequest\s*\(/ },
  ];

  for (const file of listRepositoryFiles(rootDir, ignoredDirectories)) {
    const relativePath = path.relative(rootDir, file).replaceAll("\\", "/");

    if (relativePath === "scripts/lint.mjs" || !scannedExtensions.has(path.extname(file))) {
      continue;
    }

    const contents = readFileSync(file, "utf8");

    for (const { key, label, pattern } of networkPatterns) {
      if (!pattern.test(contents)) {
        continue;
      }

      if (!allowedNetworkUses.get(relativePath)?.has(key)) {
        failures.push(
          `${relativePath} contains ${label}. Network calls must be explicit, documented, and added to the SocketLens allowlist.`,
        );
      }
    }
  }
}

function listRepositoryFiles(directory, ignoredDirectories) {
  const files = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        files.push(...listRepositoryFiles(path.join(directory, entry.name), ignoredDirectories));
      }
      continue;
    }

    if (entry.isFile()) {
      files.push(path.join(directory, entry.name));
    }
  }

  return files;
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function readText(relativePath) {
  return readFileSync(path.join(rootDir, relativePath), "utf8");
}

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ignoredDirectories = new Set([".git", "dist", "gen", "node_modules", "target"]);
const scannedExtensions = new Set([
  ".css",
  ".html",
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
const localeFiles = ["apps/desktop/src/i18n/locales/ru.json", "apps/desktop/src/i18n/locales/en.json"];

const suspiciousPatterns = [
  {
    label: "question-mark placeholder run",
    pattern: /\?{4,}/,
  },
  {
    label: "Unicode replacement character",
    pattern: /\uFFFD/,
  },
  {
    label: "UTF-8 read as Latin-1 mojibake",
    pattern: /[\u00D0\u00D1][\u0080-\u00BF]?/,
  },
  {
    label: "UTF-8 read as Windows-1251 mojibake",
    pattern: /(?:\u0420[\u0080-\u00BF\u0400-\u045F]|\u0421[\u0080-\u00BF\u0400-\u045F]){2,}/,
  },
  {
    label: "emoji mojibake marker",
    pattern: /\u0440\u045F/,
  },
];

const failures = [];

for (const localeFile of localeFiles) {
  const absolutePath = path.join(rootDir, localeFile);

  if (!existsSync(absolutePath)) {
    failures.push(`${localeFile} is missing.`);
    continue;
  }

  try {
    JSON.parse(readFileSync(absolutePath, "utf8"));
  } catch (error) {
    failures.push(`${localeFile} is not valid UTF-8 JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const ruLocalePath = path.join(rootDir, "apps/desktop/src/i18n/locales/ru.json");

if (existsSync(ruLocalePath)) {
  const ruLocale = JSON.parse(readFileSync(ruLocalePath, "utf8"));
  const requiredRussianValues = [
    ["settings.language.title", "Язык"],
    ["settings.workspace.description", "Держите"],
    ["errors.websocket.empty", "Введите"],
    ["errors.user.invalidUrl.title", "Некорректный"],
    ["onboarding.quickStart.title", "Быстрый старт"],
  ];

  for (const [key, expectedFragment] of requiredRussianValues) {
    const value = ruLocale[key];

    if (typeof value !== "string" || !value.includes(expectedFragment)) {
      failures.push(`${key} in ru.json does not contain expected Russian text.`);
    }
  }
}

for (const file of listRepositoryFiles(rootDir)) {
  const relativePath = path.relative(rootDir, file).replaceAll("\\", "/");

  if (ignoredFiles.has(path.basename(file)) || !scannedExtensions.has(path.extname(file))) {
    continue;
  }

  const contents = readFileSync(file, "utf8");
  const lines = contents.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    for (const { label, pattern } of suspiciousPatterns) {
      if (pattern.test(lines[index])) {
        failures.push(`${relativePath}:${index + 1} contains ${label}.`);
      }
    }
  }
}

if (failures.length > 0) {
  console.error("SocketLens encoding audit failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Encoding audit passed.");

function listRepositoryFiles(directory) {
  const files = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        files.push(...listRepositoryFiles(path.join(directory, entry.name)));
      }
      continue;
    }

    if (entry.isFile()) {
      files.push(path.join(directory, entry.name));
    }
  }

  return files;
}

import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

const rootPackage = readJson("package.json");
const desktopPackage = readJson("apps/desktop/package.json");
const tauriConfig = readJson("apps/desktop/src-tauri/tauri.conf.json");
const cargoToml = readText("apps/desktop/src-tauri/Cargo.toml");
const cargoVersion = cargoToml.match(/^version\s*=\s*"([^"]+)"/m)?.[1];
const rustVersion = cargoToml.match(/^rust-version\s*=\s*"([^"]+)"/m)?.[1];
const versions = {
  "package.json": rootPackage.version,
  "apps/desktop/package.json": desktopPackage.version,
  "apps/desktop/src-tauri/tauri.conf.json": tauriConfig.version,
  "apps/desktop/src-tauri/Cargo.toml": cargoVersion,
};
const version = rootPackage.version;

for (const [file, fileVersion] of Object.entries(versions)) {
  if (!fileVersion) {
    failures.push(`${file} does not declare a version.`);
  } else if (fileVersion !== version) {
    failures.push(`${file} version ${fileVersion} does not match root version ${version}.`);
  }
}

if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
  failures.push(`Version "${version}" must be SemVer-compatible, for example 0.1.0 or 0.1.0-beta.1.`);
}

if (tauriConfig.productName !== "SocketLens") {
  failures.push('Tauri productName must be "SocketLens".');
}

if (tauriConfig.identifier !== "dev.socketlens.app") {
  failures.push('Tauri identifier must stay stable as "dev.socketlens.app" until the project intentionally migrates app identity.');
}

if (rustVersion !== "1.77.2") {
  failures.push('Cargo.toml rust-version must stay explicit as "1.77.2" until the minimum Rust version is intentionally changed.');
}

if (tauriConfig.bundle?.active !== true) {
  failures.push("Tauri bundle.active must be true for downloadable releases.");
}

if (!tauriConfig.app?.security?.csp || tauriConfig.app.security.csp === null) {
  failures.push("Tauri app.security.csp must be configured before public release builds.");
}

if (tauriConfig.bundle?.category !== "DeveloperTool") {
  failures.push('Tauri bundle.category should be "DeveloperTool".');
}

for (const field of ["publisher", "homepage", "copyright", "license", "shortDescription", "longDescription"]) {
  if (!tauriConfig.bundle?.[field]) {
    failures.push(`Tauri bundle.${field} must be set for release metadata.`);
  }
}

if (!tauriConfig.bundle?.licenseFile) {
  failures.push("Tauri bundle.licenseFile must point to the repository license.");
} else {
  const licensePath = path.resolve(rootDir, "apps/desktop/src-tauri", tauriConfig.bundle.licenseFile);
  if (!existsSync(licensePath)) {
    failures.push(`Tauri bundle.licenseFile does not resolve to an existing file: ${tauriConfig.bundle.licenseFile}`);
  }
}

const requiredIcons = [
  "icons/32x32.png",
  "icons/128x128.png",
  "icons/128x128@2x.png",
  "icons/icon.ico",
  "icons/icon.icns",
];
const configuredIcons = new Set(tauriConfig.bundle?.icon ?? []);

for (const icon of requiredIcons) {
  if (!configuredIcons.has(icon)) {
    failures.push(`Tauri bundle.icon is missing ${icon}.`);
  }

  const iconPath = path.join(rootDir, "apps/desktop/src-tauri", icon);
  if (!existsSync(iconPath)) {
    failures.push(`Missing release icon asset: apps/desktop/src-tauri/${icon}`);
  } else if (statSync(iconPath).size === 0) {
    failures.push(`Release icon asset is empty: apps/desktop/src-tauri/${icon}`);
  }
}

const requiredDocs = [
  "README.md",
  "CHANGELOG.md",
  "docs/release.md",
  `docs/releases/v${version}.md`,
  ".github/RELEASE_TEMPLATE.md",
];

for (const docPath of requiredDocs) {
  if (!existsSync(path.join(rootDir, docPath))) {
    failures.push(`${docPath} must exist before preparing a release.`);
  }
}

if (!readText("CHANGELOG.md").includes(`## [${version}]`)) {
  failures.push(`CHANGELOG.md must contain a section for ${version}.`);
}

if (!readText("README.md").includes("## Downloadable Releases")) {
  failures.push("README.md must include a Downloadable Releases section.");
}

if (!rootPackage.scripts?.["release:build"] || !rootPackage.scripts?.["release:prepare"]) {
  failures.push("Root package.json must expose release:prepare and release:build scripts.");
}

if (failures.length > 0) {
  console.error("SocketLens release preparation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`SocketLens ${version} release preparation checks passed.`);
console.log("Next step: run npm run release:build on a machine with Rust, Cargo, and platform Tauri prerequisites installed.");

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function readText(relativePath) {
  return readFileSync(path.join(rootDir, relativePath), "utf8");
}

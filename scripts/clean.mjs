import { rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scopes = new Set(process.argv.slice(2));

const cleanTargets = [
  { path: "apps/desktop/dist", scope: "apps/desktop" },
  { path: "apps/desktop/src-tauri/gen", scope: "apps/desktop" },
  { path: "apps/desktop/src-tauri/target", scope: "apps/desktop" },
  { path: "apps/landing/dist", scope: "apps/landing" },
  { path: "examples/chat-demo/dist", scope: "examples/chat-demo" },
  { path: "examples/echo-server/dist", scope: "examples/echo-server" },
  { path: "examples/socketio-demo/dist", scope: "examples/socketio-demo" },
];

let removedCount = 0;

for (const target of cleanTargets) {
  if (scopes.size > 0 && !scopes.has(target.scope)) {
    continue;
  }

  const absoluteTarget = path.resolve(rootDir, target.path);

  if (!isInsideRoot(absoluteTarget)) {
    throw new Error(`Refusing to clean outside the repository: ${absoluteTarget}`);
  }

  await rm(absoluteTarget, { force: true, recursive: true });
  removedCount += 1;
}

console.log(`Cleaned ${removedCount} build output location${removedCount === 1 ? "" : "s"}.`);

function isInsideRoot(targetPath) {
  const relativePath = path.relative(rootDir, targetPath);

  return relativePath && !relativePath.startsWith("..") && !path.isAbsolute(relativePath);
}

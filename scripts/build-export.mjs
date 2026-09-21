import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const apiDir = path.join(root, "src/app/api");
const hiddenDir = path.join(root, ".api-export-stash");
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");

fs.rmSync(path.join(root, ".next", "dev"), { recursive: true, force: true });

const hasApi = fs.existsSync(apiDir);
if (hasApi) {
  fs.renameSync(apiDir, hiddenDir);
}

let result;
try {
  result = spawnSync(process.execPath, [nextBin, "build"], {
    stdio: "inherit",
    cwd: root,
    env: { ...process.env, NEXT_STATIC_EXPORT: "1" },
  });
} finally {
  if (hasApi) {
    fs.renameSync(hiddenDir, apiDir);
  }
}

if (result.error) {
  console.error(result.error);
  process.exit(1);
}
process.exit(result.status ?? 0);

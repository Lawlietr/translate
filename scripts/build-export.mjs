import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");

fs.rmSync(path.join(root, ".next", "dev"), { recursive: true, force: true });

const result = spawnSync(process.execPath, [nextBin, "build"], {
  stdio: "inherit",
  cwd: root,
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}
process.exit(result.status ?? 0);

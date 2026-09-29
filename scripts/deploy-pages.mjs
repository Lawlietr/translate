#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const args = process.argv.slice(2);
const isProd = args.includes("--prod");
const projectName = isProd ? "translate" : "translate-test";
const customDomain = isProd ? "translate.avpclub.eu.org" : null;

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const apiToken = process.env.CLOUDFLARE_API_TOKEN;

if (!accountId || !apiToken) {
  console.error("Missing CLOUDFLARE_ACCOUNT_ID and/or CLOUDFLARE_API_TOKEN in environment.");
  console.error("Export them before running this script (see design/deployment.md).");
  process.exit(1);
}

console.log(`Cloudflare Pages deploy → ${projectName}${isProd ? " (PRODUCTION)" : " (TEST)"}`);

console.log("\n[1/5] Building static export...");
const buildResult = spawnSync("npm", ["run", "build:export"], { stdio: "inherit", cwd: root });
if (buildResult.status !== 0) {
  console.error("Build failed.");
  process.exit(1);
}

console.log("\n[2/5] Verifying wasm file sizes (< 25 MiB)...");
const outDir = path.join(root, "out");
const wasmFiles = findWasmFiles(outDir);
if (wasmFiles.length === 0) {
  console.log("  No wasm files found.");
}
let maxWasm = 0;
for (const f of wasmFiles) {
  const size = fs.statSync(f).size;
  maxWasm = Math.max(maxWasm, size);
  const miB = (size / 1048576).toFixed(2);
  console.log(`  ${path.relative(outDir, f)}: ${miB} MiB`);
  if (size >= 26214400) {
    console.error(`FAIL: ${f} is ${miB} MiB (>= 25 MiB limit)`);
    process.exit(1);
  }
}
if (wasmFiles.length > 0) {
  console.log(`  All wasm files < 25 MiB (largest: ${(maxWasm / 1048576).toFixed(2)} MiB)`);
}

console.log(`\n[3/5] Ensuring Pages project exists...`);
const createResult = spawnSync(
  "npx",
  ["--yes", "wrangler", "pages", "project", "create", projectName, "--production-branch", "main", "--force"],
  { stdio: "inherit", cwd: root },
);
if (createResult.status !== 0) {
  const stderr = createResult.stderr?.toString() || "";
  if (stderr.includes("already exists") || stderr.includes("Already exists")) {
    console.log(`  Project ${projectName} already exists.`);
  } else {
    console.error(`Failed to create project: ${stderr}`);
    process.exit(1);
  }
}

console.log(`\n[4/5] Deploying via wrangler (branch: main)...`);
const wranglerResult = spawnSync(
  "npx",
  ["--yes", "wrangler", "pages", "deploy", "out", "--project-name", projectName, "--branch", "main"],
  { stdio: "inherit", cwd: root },
);
if (wranglerResult.status !== 0) {
  console.error("Deploy failed.");
  process.exit(1);
}

if (customDomain) {
  console.log(`\n[5/5] Ensuring custom domain: ${customDomain}`);
  await ensureCustomDomain(accountId, apiToken, projectName, customDomain);
} else {
  console.log("\n[5/5] No custom domain (TEST project).");
}

console.log(`\nDone.`);
if (!isProd) {
  console.log(`  Preview: https://${projectName}.pages.dev`);
}
if (customDomain) {
  console.log(`  Production: https://${customDomain}`);
}

function findWasmFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findWasmFiles(full));
    } else if (entry.name.includes(".wasm")) {
      results.push(full);
    }
  }
  return results;
}

async function ensureCustomDomain(acct, token, project, domain) {
  const base = `https://api.cloudflare.com/client/v4/accounts/${acct}/pages/projects/${project}/domains`;
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const listRes = await fetch(base, { headers });
  if (listRes.ok) {
    const data = await listRes.json();
    const existing = data.result?.find((d) => d.name === domain);
    if (existing) {
      console.log(`  Domain ${domain} already configured.`);
      return;
    }
  }

  const addRes = await fetch(base, { method: "POST", headers, body: JSON.stringify({ name: domain }) });
  if (addRes.ok) {
    console.log(`  Domain ${domain} added.`);
  } else {
    const err = await addRes.text();
    console.error(`  Failed to add domain: ${addRes.status} ${err}`);
    process.exit(1);
  }
}

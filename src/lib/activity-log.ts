let enabled = false;
let patched = false;

const entries: string[] = [];

export function setActivityLogEnabled(on: boolean): void {
  enabled = on;
}

export function logActivity(line: string): void {
  if (!enabled) return;
  entries.push(`${new Date().toTimeString().slice(0, 8)} ${line}`);
  if (entries.length > 300) entries.splice(0, entries.length - 300);
}

export function getActivityLog(): string[] {
  return [...entries];
}

export function installActivityLogPatches(): void {
  if (patched || typeof window === "undefined") return;
  patched = true;
  window.addEventListener("error", (e) => logActivity(`window error: ${e.message}`));
  window.addEventListener("unhandledrejection", (e) =>
    logActivity(`unhandled rejection: ${String(e.reason)}`)
  );
  const origFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const short = url.length > 110 ? url.slice(0, 107) + "…" : url;
    const t0 = Date.now();
    logActivity(`→ ${short}`);
    return origFetch(input as RequestInfo, init).then(
      (res) => {
        logActivity(`← ${res.status} ${short} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
        return res;
      },
      (e: unknown) => {
        logActivity(`✗ ${short} (${((Date.now() - t0) / 1000).toFixed(1)}s) ${String(e)}`);
        throw e;
      }
    );
  };
}

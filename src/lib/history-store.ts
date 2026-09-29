export interface HistoryEntry {
  id: string;
  sourceText: string;
  targetText: string;
  sourceLang: string;
  targetLang: string;
  timestamp: number;
}

export type NewHistoryEntry = Omit<HistoryEntry, "id" | "timestamp">;

export interface AddHistoryOptions {
  disabled?: boolean;
}

export const HISTORY_LIMIT = 100;
export const HISTORY_MAX_INPUT_CHARS = 2000;

const STORAGE_KEY = "translate:history";

function randomId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function isEntry(value: unknown): value is HistoryEntry {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.sourceText === "string" &&
    typeof v.targetText === "string" &&
    typeof v.sourceLang === "string" &&
    typeof v.targetLang === "string" &&
    typeof v.timestamp === "number"
  );
}

function read(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isEntry).slice(0, HISTORY_LIMIT);
  } catch {
    return [];
  }
}

function write(entries: HistoryEntry[]): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    return true;
  } catch {
    if (entries.length <= 1) return false;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(entries.slice(0, -1))
      );
      return true;
    } catch {
      return false;
    }
  }
}

export function getHistory(): HistoryEntry[] {
  return read();
}

export function addHistory(
  input: NewHistoryEntry,
  options: AddHistoryOptions = {}
): HistoryEntry[] {
  if (options.disabled) return read();
  const entries = read();
  const isDuplicate = (e: HistoryEntry) =>
    e.sourceText === input.sourceText &&
    e.sourceLang === input.sourceLang &&
    e.targetLang === input.targetLang;
  const rest = entries.filter((e) => !isDuplicate(e));
  const entry: HistoryEntry = {
    id: randomId(),
    sourceText: input.sourceText,
    targetText: input.targetText,
    sourceLang: input.sourceLang,
    targetLang: input.targetLang,
    timestamp: Date.now(),
  };
  const next = [entry, ...rest].slice(0, HISTORY_LIMIT);
  write(next);
  return next;
}

export function removeHistory(id: string): HistoryEntry[] {
  const next = read().filter((e) => e.id !== id);
  write(next);
  return next;
}

export function removeManyHistory(ids: string[]): HistoryEntry[] {
  const set = new Set(ids);
  const next = read().filter((e) => !set.has(e.id));
  write(next);
  return next;
}

export function clearHistory(): HistoryEntry[] {
  write([]);
  return [];
}

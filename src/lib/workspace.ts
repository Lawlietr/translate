export interface WorkspaceState {
  text: string;
  output: string;
}

const STORAGE_KEY = "translate:workspace";

export function emptyWorkspace(): WorkspaceState {
  return { text: "", output: "" };
}

export function loadWorkspace(): WorkspaceState {
  if (typeof window === "undefined") return emptyWorkspace();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyWorkspace();
    const parsed = JSON.parse(raw) as Partial<WorkspaceState>;
    return {
      text: typeof parsed.text === "string" ? parsed.text : "",
      output: typeof parsed.output === "string" ? parsed.output : "",
    };
  } catch {
    return emptyWorkspace();
  }
}

export function saveWorkspace(state: WorkspaceState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota / privacy-mode errors
  }
}

export function clearWorkspace(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

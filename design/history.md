# Translation history (TODO #27)

Owner spec 2026-09-28 (discussion settled, A–F all decided). Local-only, privacy-first: history lives in **localStorage**, never leaves the device.

## Spec (owner decisions)

| # | Decision |
|---|----------|
| A | **Dedupe:** same text + same language pair re-translated → the existing entry moves to the top with a refreshed timestamp (no duplicate rows) |
| B | **Length gate:** translations with input text > **2,000 chars** are NOT recorded (localStorage 5 MB quota protection; history is for short queries) |
| C | **Success only:** cancelled (AbortError) and failed translations are NOT recorded |
| D | **"Never record" does not purge:** enabling the switch stops NEW entries; existing history stays until the user deletes it (manual / multi-select / clear-all) |
| E | **Default ON:** history recording is enabled by default (local-only, same posture as Google) |
| F | **Click to restore:** clicking a history entry fills the translation area back (input text, output text, source/target languages) so the user can re-translate or tweak — Google Translate has this too |

## UI

### Entry point

- A **"Translation history" button** directly BELOW the translation block (below the model/chips row), same container as the block
- Toggles the left drawer open/closed (button state reflects it — `aria-expanded`)

### Drawer (LEFT side — owner chose left, not Google's right)

- Fixed width ~360 px on desktop; slides in from the left
- **Main content shifts left:** the parent row becomes `flex`; while the drawer is open, the content area (`max-w-5xl`) re-centers within the REMAINING space → the "squeeze" effect the owner described
- Mobile (< `sm`): full-width overlay (same as Google mobile)
- Scrollable list, newest first

### Entry rendering

Each entry, top to bottom:

```
Source text                        (full opacity — normal color)
→
Target text                        (text.secondary — dimmed)
中 → 英 · 今天 14:32                (caption, opacity 0.5)
```

- The **→** separator + the two-tier color makes input vs output unambiguous (owner point 3)
- Timestamp: relative ("just now" / "5 min ago") or localized short date — keep it simple, `Intl.DateTimeFormat`
- **Hover:** delete icon (trash) appears on the right of the entry
- **Click (not on the delete icon):** restore into the translation area (F) — sets `text`, `output`, and both language selects

### Deletion (all three live in the history panel, owner point: "這些刪除紀錄的功能在翻譯紀錄提供")

1. **Single:** trash icon on hover → immediate delete (no confirm — one row, low risk)
2. **Multi-select:** a "Select" toggle at the panel header → checkboxes appear on entries → a bottom bar with **"Delete selected (N)"** + "Cancel"; deleting clears the selection and exits select mode
3. **Clear all:** a "Clear all" button in the panel header → **MUI `Dialog` confirmation** (destructive, counts the entries)

## Settings → General tab

New **"Privacy" block, placed ABOVE the Diagnostics block** (owner spec):

- **"Never record" switch** (`historyDisabled: boolean`, default `false` = recording ON)
  - Enabling it: stops new entries only (D — no purge, no confirm dialog needed)
  - Helper text explains existing entries remain
- **"Delete all translation history" button** → same confirm dialog as the panel's clear-all (counts entries; "0 entries" state → disabled)

## Data model

`src/lib/history-store.ts` (pure logic, no React — same pattern as `settings-manager.ts`):

```ts
interface HistoryEntry {
  id: string;            // crypto.randomUUID()
  sourceText: string;
  targetText: string;
  sourceLang: string;
  targetLang: string;
  timestamp: number;     // Date.now()
}
```

- **Storage key:** `translate:history` (separate from `translate:settings` and the workspace key)
- **Cap:** 100 entries (newest first; oldest dropped past the cap)
- **API:** `getHistory()`, `addHistory(entry, { disabled, limit })` (dedupe by `sourceText + sourceLang + targetLang` → move to top + refresh timestamp), `removeHistory(id)`, `removeManyHistory(ids)`, `clearHistory()`
- **Quota safety:** writes wrap in try/catch — on `QuotaExceededError` drop oldest and retry once, then silently give up (history must never break the app)
- Recording is triggered from the SUCCESS path of `startTranslate` only (C), after the 2,000-char gate (B)

## Recording hook (translation-page.tsx)

- In the `.then()` success branch: `if (!settings.historyDisabled && text.length <= 2000) addHistory(...)`
- Cancel (AbortError) and `.catch` paths: nothing recorded (C)
- `settings.historyDisabled` read from the same settings object already in scope

## i18n (new keys × 4 locales, ~14 keys)

`history.button`, `history.title`, `history.empty`, `history.select`, `history.deleteSelected` (N), `history.cancelSelect`, `history.clearAll`, `history.confirmClearTitle`, `history.confirmClearBody` (N), `history.deleteEntry` (aria), `history.restored`, `general.privacy`, `general.neverRecord`, `general.neverRecordHelper`, `general.deleteAll` — exact list finalized at implementation; interface + 4 locales stay in lockstep (compile error on missing key)

## Files touched

| File | Change |
|------|--------|
| `src/lib/history-store.ts` | **NEW** — pure storage logic |
| `src/components/history-panel.tsx` | **NEW** — left drawer (list, hover-delete, multi-select, clear-all confirm) |
| `src/components/translation-page.tsx` | history button below the block; record on success; restore on click |
| `src/components/translation-app.tsx` | drawer + squeeze layout (flex row; content re-centers in remaining space) |
| `src/components/settings-dialog.tsx` | General tab: Privacy block above Diagnostics |
| `src/lib/settings-manager.ts` | `historyDisabled: boolean` (default `false`), normalization `parsed.historyDisabled === true` |
| `src/lib/i18n/translations.ts` | ~14 new keys × 4 locales |

## Pitfalls (known patterns from this codebase)

- **Hydration-safe:** read localStorage post-mount only; render empty by default (same pattern as `AppSettingsProvider` — design/ui-ux.md §Implementation notes)
- **MUI v9:** no Fragment children in Select (not expected here, but same drawer uses Select for nothing — list is plain)
- **Restore (F) must not trigger a save of the mid-translation state** — workspace persistence is debounced; filling text+output is the same shape `swap()` already produces, so it composes naturally
- **Drawer + SettingsDialog z-index:** MUI Dialog (settings) must stay above the drawer; drawer is a `Paper` inside the page, not a MUI `Drawer` portal — keep it in normal flow so the squeeze layout works
- **`min-h-screen flex` chain:** the outer column is already `min-h-screen flex flex-col`; the history row is a NEW flex ROW inside the content wrapper — don't break the sticky footer (footer stays the last column child)

## Rollback plan (owner rule: keep rollback space)

Independent commits, each revertable without touching the others:

1. `history-store.ts` + settings field (`historyDisabled`) — no UI
2. History button + left drawer + squeeze layout
3. Deletion trio (single / multi-select / clear-all + confirm)
4. Settings Privacy block
5. Restore-on-click (F)
6. Docs (this file, TODO.md, ui-ux.md out-of-scope line)

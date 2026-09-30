"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  IconButton,
  Typography,
} from "@mui/material";
import ChecklistIcon from "@mui/icons-material/Checklist";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import { useI18n } from "../hooks/useI18n";
import { languageName } from "../lib/languages";
import {
  clearHistory,
  removeHistory,
  removeManyHistory,
  type HistoryEntry,
} from "../lib/history-store";
import { HistoryClearDialog } from "./history-clear-dialog";

interface HistoryPanelProps {
  entries: HistoryEntry[];
  onUpdate: (entries: HistoryEntry[]) => void;
  onClose: () => void;
  onRestore: (entry: HistoryEntry) => void;
}

function formatTimestamp(ts: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(ts);
}

export function HistoryPanel({ entries, onUpdate, onClose, onRestore }: HistoryPanelProps) {
  const { t, lang } = useI18n();
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const toggleSelectMode = () => {
    setSelected([]);
    setSelectMode((v) => !v);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const deleteSelected = () => {
    onUpdate(removeManyHistory(selected));
    setSelected([]);
    setSelectMode(false);
  };

  const confirmClearAll = () => {
    onUpdate(clearHistory());
    setSelected([]);
    setSelectMode(false);
    setConfirmOpen(false);
  };

  return (
    <Box
      className="fixed inset-0 z-40 flex flex-col sm:static sm:z-auto sm:shrink-0 sm:w-[360px]"
      sx={{
        bgcolor: "background.default",
        borderRight: { xs: "none", sm: "1px solid" },
        borderColor: "divider",
      }}
    >
      <Box className="flex items-center justify-between gap-2 px-4 py-3">
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          {t("history.title")}
        </Typography>
        <Box className="flex items-center gap-0.5">
          {entries.length > 0 && (
            <>
              <IconButton
                size="small"
                onClick={toggleSelectMode}
                aria-pressed={selectMode}
                aria-label={t("history.select")}
                sx={selectMode ? { color: "primary.main" } : undefined}
              >
                <ChecklistIcon />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => setConfirmOpen(true)}
                aria-label={t("history.clearAll")}
              >
                <DeleteSweepIcon />
              </IconButton>
            </>
          )}
          <IconButton
            size="small"
            onClick={onClose}
            aria-label={t("history.close")}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </Box>
      {entries.length === 0 ? (
        <Box className="flex-1 flex items-center justify-center p-4">
          <Typography variant="body2" sx={{ opacity: 0.6 }}>
            {t("history.empty")}
          </Typography>
        </Box>
      ) : (
        <>
          <Box className="flex-1 overflow-y-auto">
            {entries.map((entry) => {
              const isSelected = selected.includes(entry.id);
              return (
                <Box
                  key={entry.id}
                  className={`group flex items-start gap-2 px-4 py-3 cursor-pointer`}
                  sx={{
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    bgcolor: isSelected ? "action.selected" : "transparent",
                  }}
                  onClick={
                    selectMode
                      ? () => toggleSelect(entry.id)
                      : () => onRestore(entry)
                  }
                >
                  {selectMode && (
                    <Checkbox
                      size="small"
                      checked={isSelected}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => toggleSelect(entry.id)}
                      sx={{ mt: "3px" }}
                    />
                  )}
                  <Box className="flex-1 flex flex-col gap-1 min-w-0">
                    <Typography variant="body2">
                      {entry.sourceText}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.4 }}>
                      →
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {entry.targetText}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.5 }}>
                      {languageName(entry.sourceLang)} →{" "}
                      {languageName(entry.targetLang)} ·{" "}
                      {formatTimestamp(entry.timestamp, lang)}
                    </Typography>
                  </Box>
                  {!selectMode && (
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdate(removeHistory(entry.id));
                      }}
                      aria-label={t("history.deleteEntry")}
                      className="opacity-0 group-hover:opacity-100"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              );
            })}
          </Box>
          {selectMode && (
            <Box
              className="flex items-center justify-between gap-2 px-4 py-2"
              sx={{ borderTop: "1px solid", borderColor: "divider" }}
            >
              <Button
                variant="contained"
                color="error"
                size="small"
                disabled={selected.length === 0}
                onClick={deleteSelected}
              >
                {t("history.deleteSelected", { n: selected.length })}
              </Button>
              <Button variant="text" size="small" onClick={toggleSelectMode}>
                {t("history.cancelSelect")}
              </Button>
            </Box>
          )}
        </>
      )}
      <HistoryClearDialog
        open={confirmOpen}
        count={entries.length}
        onConfirm={confirmClearAll}
        onClose={() => setConfirmOpen(false)}
      />
    </Box>
  );
}

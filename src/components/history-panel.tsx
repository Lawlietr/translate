"use client";

import { Box, IconButton, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useI18n } from "../hooks/useI18n";
import { languageName } from "../lib/languages";
import type { HistoryEntry } from "../lib/history-store";

interface HistoryPanelProps {
  entries: HistoryEntry[];
  onClose: () => void;
}

function formatTimestamp(ts: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(ts);
}

export function HistoryPanel({ entries, onClose }: HistoryPanelProps) {
  const { t, lang } = useI18n();
  return (
    <Box
      className="fixed inset-0 z-40 flex flex-col sm:static sm:z-auto sm:sticky sm:top-0 sm:shrink-0 sm:w-[360px]"
      sx={{
        bgcolor: "background.default",
        borderRight: { xs: "none", sm: "1px solid" },
        borderColor: "divider",
      }}
    >
      <Box className="flex items-center justify-between px-4 py-3">
        <Typography variant="subtitle1" fontWeight={600}>
          {t("history.title")}
        </Typography>
        <IconButton size="small" onClick={onClose} aria-label={t("history.close")}>
          <CloseIcon />
        </IconButton>
      </Box>
      {entries.length === 0 ? (
        <Box className="flex-1 flex items-center justify-center p-4">
          <Typography variant="body2" sx={{ opacity: 0.6 }}>
            {t("history.empty")}
          </Typography>
        </Box>
      ) : (
        <Box className="flex-1 overflow-y-auto">
          {entries.map((entry) => (
            <Box
              key={entry.id}
              className="flex flex-col gap-1 px-4 py-3"
              sx={{ borderBottom: "1px solid", borderColor: "divider" }}
            >
              <Typography variant="body2">{entry.sourceText}</Typography>
              <Typography variant="caption" sx={{ opacity: 0.4 }}>
                →
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {entry.targetText}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.5 }}>
                {languageName(entry.sourceLang)} → {languageName(entry.targetLang)}{" "}
                · {formatTimestamp(entry.timestamp, lang)}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

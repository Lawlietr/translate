"use client";

import { useState } from "react";
import { IconButton, Tooltip } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import { useI18n } from "../hooks/useI18n";

export function CopyButton({ value, label }: { value: string; label?: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const effectiveLabel = label ?? t("common.copy");

  const copy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Tooltip title={copied ? t("common.copied") : effectiveLabel}>
      <span>
        <IconButton
          size="small"
          onClick={copy}
          disabled={!value}
          aria-label={effectiveLabel}
          sx={{
            p: 0.5,
            bgcolor: "rgba(128,128,128,0.15)",
            borderRadius: 1,
            "&:hover": { bgcolor: "rgba(128,128,128,0.3)" },
          }}
        >
          {copied ? <CheckIcon sx={{ fontSize: 16, color: "success.main" }} /> : <ContentCopyIcon sx={{ fontSize: 16 }} />}
        </IconButton>
      </span>
    </Tooltip>
  );
}

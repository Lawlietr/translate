"use client";

import { CircularProgress, IconButton, Tooltip } from "@mui/material";
import StopIcon from "@mui/icons-material/Stop";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";

interface SpeakerButtonProps {
  speaking: boolean;
  loading?: boolean;
  disabled?: boolean;
  label: string;
  stopLabel: string;
  onClick: () => void;
}

export function SpeakerButton({
  speaking,
  loading,
  disabled,
  label,
  stopLabel,
  onClick,
}: SpeakerButtonProps) {
  const title = speaking ? stopLabel : loading ? "…" : label;
  return (
    <Tooltip title={title}>
      <span>
        <IconButton
          size="small"
          onClick={onClick}
          disabled={disabled}
          aria-label={title}
          aria-pressed={speaking}
        >
          {loading ? (
            <CircularProgress size={16} />
          ) : speaking ? (
            <StopIcon />
          ) : (
            <VolumeUpIcon />
          )}
        </IconButton>
      </span>
    </Tooltip>
  );
}

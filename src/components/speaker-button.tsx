"use client";

import { IconButton, Tooltip } from "@mui/material";
import StopIcon from "@mui/icons-material/Stop";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";

interface SpeakerButtonProps {
  speaking: boolean;
  disabled?: boolean;
  label: string;
  stopLabel: string;
  onClick: () => void;
}

export function SpeakerButton({
  speaking,
  disabled,
  label,
  stopLabel,
  onClick,
}: SpeakerButtonProps) {
  const title = speaking ? stopLabel : label;
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
          {speaking ? <StopIcon /> : <VolumeUpIcon />}
        </IconButton>
      </span>
    </Tooltip>
  );
}

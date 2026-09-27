"use client";

import { useEffect, useRef, useState } from "react";
import { Box, Typography } from "@mui/material";
import { getActivityLog } from "../lib/activity-log";
import { useI18n } from "../hooks/useI18n";

export function ActivityLogPanel() {
  const { t } = useI18n();
  const [lines, setLines] = useState<string[]>([]);
  const preRef = useRef<HTMLPreElement>(null);
  const followRef = useRef(true);

  useEffect(() => {
    const id = setInterval(() => setLines(getActivityLog().slice(-100)), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const el = preRef.current;
    if (followRef.current && el && lines.length > 0) el.scrollTop = el.scrollHeight;
  }, [lines]);

  const onScroll = () => {
    const el = preRef.current;
    if (!el) return;
    followRef.current = el.scrollTop + el.clientHeight >= el.scrollHeight - 8;
  };

  return (
    <Box sx={{ border: "1px solid rgba(128,128,128,0.35)", borderRadius: 1, p: 1 }}>
      <Typography variant="caption" sx={{ opacity: 0.6 }}>
        {t("activity.title")}
      </Typography>
      <Box
        component="pre"
        ref={preRef}
        onScroll={onScroll}
        sx={{
          m: 0,
          fontSize: 11,
          overflow: "auto",
          maxHeight: 220,
          opacity: 0.85,
          whiteSpace: "pre-wrap",
        }}
      >
        {lines.length > 0 ? lines.join("\n") : t("activity.empty")}
      </Box>
    </Box>
  );
}

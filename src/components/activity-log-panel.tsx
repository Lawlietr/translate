"use client";

import { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import { getActivityLog } from "../lib/activity-log";

export function ActivityLogPanel() {
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    const t = setInterval(() => setLines(getActivityLog().slice(-100)), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <Box sx={{ border: "1px solid rgba(128,128,128,0.35)", borderRadius: 1, p: 1 }}>
      <Typography variant="caption" sx={{ opacity: 0.6 }}>
        diagnostics — stages + fetches (requests without a ← line are still pending)
      </Typography>
      <Box
        component="pre"
        sx={{
          m: 0,
          fontSize: 11,
          overflow: "auto",
          maxHeight: 220,
          opacity: 0.85,
          whiteSpace: "pre-wrap",
        }}
      >
        {lines.length > 0 ? lines.join("\n") : "no entries yet"}
      </Box>
    </Box>
  );
}

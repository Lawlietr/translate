"use client";

import { Box } from "@mui/material";
import { useThemeMode } from "../hooks/use-theme";

const GLYPHS = ["A", "ü", "ß", "é", "ç", "ñ", "文", "译", "あ", "한"];

const DARK_PALETTE = [
  "rgba(255, 107, 87, 0.08)",
  "rgba(255, 217, 160, 0.08)",
  "rgba(126, 217, 162, 0.08)",
];

const LIGHT_PALETTE = [
  "rgba(214, 69, 48, 0.10)",
  "rgba(185, 122, 30, 0.10)",
  "rgba(31, 138, 85, 0.10)",
];

export function LandingGlyphs() {
  const { mode } = useThemeMode();
  const palette = mode === "dark" ? DARK_PALETTE : LIGHT_PALETTE;
  return (
    <Box
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
      sx={{ zIndex: 0 }}
    >
      {GLYPHS.map((ch, i) => (
        <Box
          key={ch}
          className="landing-glyph"
          sx={{
            left: `${5 + ((i * 83) % 90)}%`,
            top: `${8 + ((i * 137) % 82)}%`,
            fontSize: `${30 + ((i * 29) % 50)}px`,
            color: palette[i % 3],
            animationDuration: `${11 + (i % 5) * 2.3}s`,
            animationDelay: `${-(i * 1.7)}s`,
          }}
        >
          {ch}
        </Box>
      ))}
    </Box>
  );
}

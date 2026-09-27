"use client";

import { Typography } from "@mui/material";
import { useI18n } from "../hooks/useI18n";

export function AppFooter() {
  const { t } = useI18n();
  return (
    <footer className="mx-auto w-full max-w-5xl px-4 py-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center">
      <Typography
        variant="body2"
        className="text-xs"
        color="text.secondary"
      >
        {t("footer.license")}{" "}
        <a
          href="https://www.gnu.org/licenses/agpl-3.0"
          target="_blank"
          rel="noreferrer"
          className="underline hover:no-underline"
        >
          AGPL-3.0
        </a>
      </Typography>
      <Typography variant="body2" className="text-xs" color="text.secondary">
        {t("footer.privacy")}
      </Typography>
    </footer>
  );
}

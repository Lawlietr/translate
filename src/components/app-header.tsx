"use client";

import { useState } from "react";

import {
  Box,
  IconButton,
  Menu,
  MenuItem,
  SvgIcon,
  Tooltip,
  Typography,
} from "@mui/material";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import LanguageOutlinedIcon from "@mui/icons-material/Language";
import SettingsIcon from "@mui/icons-material/Settings";
import { GITHUB_REPO_URL } from "../lib/site";
import { useI18n } from "../hooks/useI18n";
import { SUPPORTED_LANGUAGES } from "../lib/i18n/translations";
import type { ThemeMode } from "../hooks/use-theme";

function GithubIcon(props: React.ComponentProps<typeof SvgIcon>) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.757-1.333-1.757-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </SvgIcon>
  );
}

interface AppHeaderProps {
  themeMode: ThemeMode;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
}

export function AppHeader({ themeMode, onToggleTheme, onOpenSettings }: AppHeaderProps) {
  const { t, lang, setLanguage } = useI18n();
  const [languageAnchorEl, setLanguageAnchorEl] = useState<null | HTMLElement>(null);
  const languageOpen = Boolean(languageAnchorEl);

  const openLanguageMenu = (event: React.MouseEvent<HTMLElement>) =>
    setLanguageAnchorEl(event.currentTarget);
  const closeLanguageMenu = () => setLanguageAnchorEl(null);

  return (
    <header className="flex items-center justify-between gap-3">
      <Typography variant="h5">{t("site.title")}</Typography>
      <Box className="flex items-center gap-1" sx={{ justifyContent: "center" }}>
        <Tooltip title={t("header.languageTooltip")}>
          <IconButton
            onClick={openLanguageMenu}
            aria-label={t("header.languageAria")}
            aria-haspopup="menu"
            aria-expanded={languageOpen ? "true" : "false"}
          >
            <LanguageOutlinedIcon />
          </IconButton>
        </Tooltip>
        <Menu
          anchorEl={languageAnchorEl}
          open={languageOpen}
          onClose={closeLanguageMenu}
          aria-label={t("header.languageAria")}
        >
          {SUPPORTED_LANGUAGES.map((l) => (
            <MenuItem
              key={l.id}
              selected={l.id === lang}
              onClick={() => {
                setLanguage(l.id);
                closeLanguageMenu();
              }}
            >
              {l.label}
            </MenuItem>
          ))}
        </Menu>
        <Tooltip title={themeMode === "dark" ? t("header.toLight") : t("header.toDark")}>
          <IconButton onClick={onToggleTheme} aria-label={t("header.themeAria")}>
            {themeMode === "dark" ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}
          </IconButton>
        </Tooltip>
        {GITHUB_REPO_URL ? (
          <Tooltip title={t("header.githubTooltip")}>
            <IconButton
              component="a"
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noreferrer"
              aria-label={t("header.githubAria")}
            >
              <GithubIcon />
            </IconButton>
          </Tooltip>
        ) : (
          <Tooltip title={t("header.githubComingSoon")}>
            <span>
              <IconButton disabled aria-label={t("header.githubReservedAria")}>
                <GithubIcon />
              </IconButton>
            </span>
          </Tooltip>
        )}
        <Tooltip title={t("header.settingsTooltip")}>
          <IconButton onClick={onOpenSettings} aria-label={t("header.settingsAria")}>
            <SettingsIcon />
          </IconButton>
        </Tooltip>
      </Box>
    </header>
  );
}

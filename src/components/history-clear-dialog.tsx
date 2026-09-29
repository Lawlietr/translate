"use client";

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import { useI18n } from "../hooks/useI18n";

interface HistoryClearDialogProps {
  open: boolean;
  count: number;
  onConfirm: () => void;
  onClose: () => void;
}

export function HistoryClearDialog({
  open,
  count,
  onConfirm,
  onClose,
}: HistoryClearDialogProps) {
  const { t } = useI18n();
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{t("history.confirmClearTitle")}</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {t("history.confirmClearBody", { n: count })}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button variant="text" onClick={onClose}>
          {t("common.cancel")}
        </Button>
        <Button variant="contained" color="error" onClick={onConfirm}>
          {t("history.clearAll")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

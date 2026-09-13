"use client";

import { Button } from "@/components/ui";

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Supprimer",
  cancelLabel = "Annuler",
  busy = false,
  busyLabel,
  confirmVariant = "danger",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  busyLabel?: string;
  confirmVariant?: "danger" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="modal-overlay" role="presentation" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="modal-card modal-card-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4">
          <h2 id="confirm-title" className="text-lg font-semibold text-navy">
            {title}
          </h2>
          <p className="mt-2 text-sm text-slate-600">{message}</p>
        </div>
        <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button type="button" variant={confirmVariant} onClick={onConfirm} disabled={busy}>
            {busy ? busyLabel ?? "Suppression…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
